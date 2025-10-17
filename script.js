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

  // Mostrar el total actualizado
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
      productosSeleccionados = [];
      actualizarListaVisual();
    })
    .catch((error) => {
      console.error("Error al registrar la factura:", error);
      alert("❌ No se pudo registrar la factura");
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

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TICKET", 2, 10);

  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${cliente}`, 2, 18);
  doc.text(`Fecha: ${fecha}`, 2, 24);

  // Encabezado de tabla
  let y = 32;
  doc.setFont("helvetica", "bold");
  doc.text("Producto", 2, y);
  doc.text("Precio", 40, y);
  doc.text("Cant", 57, y);
  doc.text("Valor", 68, y);
  doc.setDrawColor(180);
  doc.line(1, y + 2, 78, y + 2);

  // Detalle de productos
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  productos.forEach((p) => {
    let nombreCorto = p.nombre.length > 26 ? p.nombre.substring(0, 26) + "..." : p.nombre;

    doc.text(nombreCorto, 2, y);
    doc.text(`$${formatPrice(p.precioUnitario)}`, 42, y);
    doc.text(`${p.cantidad}`, 61, y, { align: "center" });
    doc.text(`$${formatPrice(p.total)}`, 69, y);

    y += 6;
  });

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total a Pagar: $${formatPrice(totalFactura)}`, 2, y + 6);

  // Mensaje final
  doc.setFont("helvetica", "normal");
  doc.text("Gracias por su compra", 2, y + 12);

  // Guardar PDF
  const nombreArchivo = `ticket_factura_${fecha.replace(/[/: ]/g, "_")}.pdf`;
  doc.save(nombreArchivo);
}

// 📊 Exportar informe diario a Excel
function exportarInformeExcelPorDia() {
  const fechaInput = document.getElementById("fechaInforme").value;

  if (!fechaInput) {
    alert("Selecciona una fecha.");
    return;
  }

  db.collection("facturas")
    .where("fecha", "==", fechaInput)
    .get()
    .then((querySnapshot) => {
      const resumen = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const productos = Array.isArray(data.productos) ? data.productos : [data];

        productos.forEach((p) => {
          if (!resumen[p.nombre]) {
            resumen[p.nombre] = { cantidad: 0, total: 0 };
          }
          resumen[p.nombre].cantidad += p.cantidad;
          resumen[p.nombre].total += p.total;
        });
      });

      if (Object.keys(resumen).length === 0) {
        alert("No hay ventas registradas para esa fecha.");
        return;
      }

      const datosExcel = [["Producto", "Cantidad total", "Ventas totales"]];
      for (const producto in resumen) {
        datosExcel.push([
          producto,
          resumen[producto].cantidad,
          resumen[producto].total
        ]);
      }

      const hoja = XLSX.utils.aoa_to_sheet(datosExcel);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "InformeVentas");

      const fechaTexto = fechaInput.replace(/-/g, "_");
      XLSX.writeFile(libro, `informe_ventas_${fechaTexto}.xlsx`);
    })
    .catch((error) => {
      console.error("Error al generar informe:", error);
      alert("❌ No se pudo generar el archivo Excel");
    });
}
