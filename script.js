// ✅ Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBVbDDQhcPERi63IvrwVi8QifiDeRUSJkA",
  authDomain: "registro-productos-web.firebaseapp.com",
  projectId: "registro-productos-web",
  storageBucket: "registro-productos-web.appspot.com",
  messagingSenderId: "935837054835",
  appId: "1:935837054835:web:281ae473a03855c37d3706"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let productosSeleccionados = [];

// 🛒 Agregar producto
function agregarProducto(nombre, precioUnitario) {
  const cantidad = prompt(`¿Cuántas unidades de ${nombre} deseas agregar?`);
  const cantidadNum = parseInt(cantidad);

  if (isNaN(cantidadNum) || cantidadNum <= 0) {
    alert("Cantidad inválida.");
    return;
  }

  productosSeleccionados.push({
    nombre,
    cantidad: cantidadNum,
    precioUnitario,
    total: cantidadNum * precioUnitario
  });

  actualizarListaVisual();
}

// ✏️ Actualizar cantidad
function actualizarCantidad(index, nuevaCantidad) {
  const cantidadNum = parseInt(nuevaCantidad);
  if (!isNaN(cantidadNum) && cantidadNum > 0) {
    productosSeleccionados[index].cantidad = cantidadNum;
    productosSeleccionados[index].total = cantidadNum * productosSeleccionados[index].precioUnitario;
    actualizarListaVisual();
  }
}

// ❌ Eliminar producto
function eliminarProducto(index) {
  productosSeleccionados.splice(index, 1);
  actualizarListaVisual();
}

// 🧾 Actualizar lista visual y mostrar total
function actualizarListaVisual() {
  const lista = document.getElementById("listaSeleccion");
  const totalVenta = document.getElementById("totalVenta");
  lista.innerHTML = "";

  let totalGeneral = 0;

  productosSeleccionados.forEach((producto, index) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <div><strong>${producto.nombre}</strong></div>
      <div>
        <label>Cantidad:</label>
        <input type="number" min="1" value="${producto.cantidad}" 
          onchange="actualizarCantidad(${index}, this.value)">
      </div>
      <div>Subtotal: $${producto.total.toLocaleString('es-CO')}</div>
      <button onclick="eliminarProducto(${index})">Eliminar</button>
    `;

    lista.appendChild(li);
    totalGeneral += producto.total;
  });

  totalVenta.textContent = `💰 Total: $${totalGeneral.toLocaleString('es-CO')}`;
}

// 💾 Descargar factura PDF y guardar en Firebase
function descargarPDF() {
  const cliente = document.getElementById("cliente").value.trim();

  if (!cliente) {
    alert("Por favor ingresa el nombre del cliente.");
    return;
  }

  if (productosSeleccionados.length === 0) {
    alert("No hay productos seleccionados.");
    return;
  }

  const totalFactura = productosSeleccionados.reduce((sum, p) => sum + p.total, 0);
  const fechaHoy = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  db.collection("facturas")
    .add({
      cliente,
      productos: productosSeleccionados,
      total: totalFactura,
      fecha: fechaHoy
    })
    .then(() => {
      generarPDF(cliente, productosSeleccionados, totalFactura);
      guardarResumenDiario(fechaHoy); // ✅ Guardar resumen automático
      productosSeleccionados = [];
      actualizarListaVisual();
    })
    .catch((error) => {
      console.error("Error al registrar la factura:", error);
      alert("❌ No se pudo registrar la factura");
    });
}

// ✅ Guardar resumen diario
function guardarResumenDiario(fecha) {
  db.collection("facturas")
    .where("fecha", "==", fecha)
    .get()
    .then((querySnapshot) => {
      const resumen = {
        productos: {},
        totalVentas: 0,
        cantidadFacturas: querySnapshot.size
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        data.productos.forEach((p) => {
          if (!resumen.productos[p.nombre]) {
            resumen.productos[p.nombre] = { cantidad: 0, total: 0 };
          }
          resumen.productos[p.nombre].cantidad += p.cantidad;
          resumen.productos[p.nombre].total += p.total;
          resumen.totalVentas += p.total;
        });
      });

      db.collection("resumen_diario").doc(fecha).set(resumen);
    })
    .catch((error) => {
      console.error("Error al guardar resumen diario:", error);
    });
}

function formatPrice(valor) {
  return valor.toLocaleString("es-CO");
}

// 🧾 Generar PDF tipo ticket
function generarPDF(cliente, productos, totalFactura) {
  const { jsPDF } = window.jspdf;

  const ticketHeight = 100 + productos.length * 10;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, ticketHeight]
  });

  const fecha = new Date().toLocaleString("es-CO");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TICKET", 2, 10);

  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${cliente}`, 2, 18);
  doc.text(`Fecha: ${fecha}`, 2, 24);

  let y = 32;
  doc.setFont("helvetica", "bold");
  doc.text("Producto", 2, y);
  doc.text("Cant", 42, y);
  doc.text("Precio", 54, y);
  doc.text("Valor", 69, y);
  doc.setDrawColor(180);
  doc.line(1, y + 2, 78, y + 2);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  productos.forEach((p) => {
    let nombreCorto = p.nombre.length > 26 ? p.nombre.substring(0, 26) + "..." : p.nombre;

    doc.text(nombreCorto, 2, y);
    doc.text(`${p.cantidad}`, 45, y);
    doc.text(`$${formatPrice(p.precioUnitario)}`, 55, y);
    doc.text(`$${formatPrice(p.total)}`, 69, y);

    y += 6;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total a Pagar: $${formatPrice(totalFactura)}`, 2, y + 6);

  doc.setFont("helvetica", "normal");
  doc.text("Gracias por su compra", 2, y + 12);

  const nombreArchivo = `ticket_factura_${fecha.replace(/[/: ]/g, "_")}.pdf`;
  doc.save(nombreArchivo);
}


function exportarResumenDiarioExcel() {
  const fechaInput = document.getElementById("fechaInforme").value;

  if (!fechaInput) {
    alert("Selecciona una fecha.");
    return;
  }

  db.collection("resumen_diario").doc(fechaInput).get()
    .then((doc) => {
      if (!doc.exists) {
        alert("No hay resumen guardado para esa fecha.");
        return;
      }

      const data = doc.data();
      const datosExcel = [["Producto", "Cantidad total", "Ventas totales"]];

      for (const producto in data.productos) {
        datosExcel.push([
          producto,
          data.productos[producto].cantidad,
          data.productos[producto].total
        ]);
      }

      datosExcel.push(["", "", ""]);
      datosExcel.push(["Total Ventas", "", data.totalVentas]);
      datosExcel.push(["Cantidad de Facturas", "", data.cantidadFacturas]);

      const hoja = XLSX.utils.aoa_to_sheet(datosExcel);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "ResumenDiario");

      const fechaTexto = fechaInput.replace(/-/g, "_");
      XLSX.writeFile(libro, `resumen_diario_${fechaTexto}.xlsx`);
    })
    .catch((error) => {
      console.error("Error al generar resumen:", error);
      alert("❌ No se pudo generar el archivo Excel");
    });
}