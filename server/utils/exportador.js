// Generación de reportes exportables en Excel (xlsx), CSV y PDF (pdfkit).
// Usado por el módulo de Reportes (server/controllers/reportes.controller.js)
// para los endpoints que aceptan ?formato=excel|pdf, y por el módulo de
// Exportación (server/controllers/exportacion.controller.js) para el dump
// completo de cada tabla en ?formato=excel|csv.
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

function valorColumna(columna, fila) {
  const valor = columna.render ? columna.render(fila) : fila[columna.clave];
  return valor === undefined || valor === null ? '' : valor;
}

// columnas: [{ clave, titulo, render?(fila) }]
function generarExcel({ columnas, filas, nombreHoja = 'Reporte', bookType = 'xlsx' }) {
  const datos = filas.map((fila) => {
    const objeto = {};
    columnas.forEach((columna) => {
      objeto[columna.titulo] = valorColumna(columna, fila);
    });
    return objeto;
  });

  const hoja = XLSX.utils.json_to_sheet(datos);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31));
  return XLSX.write(libro, { type: 'buffer', bookType });
}

function generarPdf({ titulo, columnas, filas, subtitulo }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        layout: columnas.length > 5 ? 'landscape' : 'portrait',
      });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const margenIzq = doc.page.margins.left;
      const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const anchoColumna = anchoDisponible / columnas.length;
      const alturaFila = 22;

      doc.fontSize(16).fillColor('#1e293b').text(titulo, margenIzq, doc.y);
      doc.moveDown(0.3);
      const ahora = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const generadoEl = `${pad(ahora.getDate())}/${pad(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
      doc.fontSize(9).fillColor('#64748b').text(subtitulo ? `${subtitulo} · Generado el ${generadoEl}` : `Generado el ${generadoEl}`);
      doc.moveDown(0.8);

      let y = doc.y;

      function dibujarEncabezado() {
        doc.rect(margenIzq, y, anchoDisponible, alturaFila).fill('#2563eb');
        doc.fillColor('#ffffff').fontSize(9);
        columnas.forEach((columna, i) => {
          doc.text(columna.titulo, margenIzq + i * anchoColumna + 4, y + 6, { width: anchoColumna - 8, ellipsis: true });
        });
        y += alturaFila;
      }

      dibujarEncabezado();

      filas.forEach((fila, indice) => {
        if (y + alturaFila > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          y = doc.page.margins.top;
          dibujarEncabezado();
        }
        if (indice % 2 === 1) {
          doc.rect(margenIzq, y, anchoDisponible, alturaFila).fill('#f1f5f9');
        }
        doc.fillColor('#1e293b').fontSize(8);
        columnas.forEach((columna, i) => {
          doc.text(String(valorColumna(columna, fila)), margenIzq + i * anchoColumna + 4, y + 6, {
            width: anchoColumna - 8,
            ellipsis: true,
          });
        });
        y += alturaFila;
      });

      if (filas.length === 0) {
        doc.fillColor('#64748b').fontSize(10).text('No hay registros para este reporte.', margenIzq, y + 10);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Envía el buffer ya generado con los encabezados HTTP correctos.
function enviarArchivo(res, { formato, buffer, nombreArchivo }) {
  if (formato === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.pdf"`);
  } else if (formato === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.csv"`);
  } else {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.xlsx"`);
  }
  return res.send(buffer);
}

module.exports = { generarExcel, generarPdf, enviarArchivo };
