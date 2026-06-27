// Utilidades compartidas para el módulo de Importación: lectura de archivos
// Excel/CSV subidos por el usuario, generación de plantillas vacías y
// parseo de celdas (fechas, horas, booleanos) sin usar toISOString() —
// siguiendo la misma convención de fechas locales que el resto del backend.
const XLSX = require('xlsx');
const fs = require('fs');

// Lee la primera hoja del archivo y devuelve un array de arrays (incluye la
// fila de encabezado en la posición 0). Sirve tanto para .xlsx/.xls como
// para .csv (xlsx detecta el formato por el contenido/extensión).
function leerFilasCrudas(rutaArchivo) {
  const libro = XLSX.readFile(rutaArchivo, { cellDates: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  return XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', blankrows: false });
}

// Genera un Excel con únicamente la fila de encabezados — la "plantilla
// vacía" que el usuario descarga para llenar y volver a subir.
function generarPlantilla({ columnas, nombreHoja = 'Plantilla' }) {
  const encabezados = columnas.map((c) => c.titulo);
  const hoja = XLSX.utils.aoa_to_sheet([encabezados]);
  hoja['!cols'] = columnas.map(() => ({ wch: 24 }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31));
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Acepta un Date (cuando xlsx parsea la celda como fecha) o texto en
// formato 'AAAA-MM-DD', 'DD/MM/AAAA' o 'DD-MM-AAAA'. Devuelve 'AAAA-MM-DD'
// normalizado, o `undefined` si el formato no se pudo reconocer.
function parsearFecha(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}`;
  }
  const texto = String(valor ?? '').trim();
  if (!texto) return undefined;

  let m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;

  m = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;

  return undefined;
}

// Acepta Date, fracción numérica de Excel (0-1) o texto 'HH:MM'/'HH:MM:SS'.
// Devuelve 'HH:MM:SS', o `undefined` si no se pudo reconocer.
function parsearHora(valor) {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${pad(valor.getHours())}:${pad(valor.getMinutes())}:00`;
  }
  if (typeof valor === 'number') {
    const totalMinutos = Math.round(valor * 24 * 60);
    return `${pad(Math.floor(totalMinutos / 60) % 24)}:${pad(totalMinutos % 60)}:00`;
  }
  const texto = String(valor ?? '').trim();
  const m = texto.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return undefined;
  return `${pad(m[1])}:${pad(m[2])}:${m[3] ? pad(m[3]) : '00'}`;
}

// Si/No, Sí/No, Yes/No, 1/0, true/false -> 1 o 0
function parsearBooleano(valor) {
  const texto = String(valor ?? '').trim().toLowerCase();
  return ['si', 'sí', 'yes', '1', 'true'].includes(texto) ? 1 : 0;
}

function eliminarArchivo(ruta) {
  if (!ruta) return;
  fs.unlink(ruta, () => {});
}

module.exports = {
  leerFilasCrudas,
  generarPlantilla,
  parsearFecha,
  parsearHora,
  parsearBooleano,
  eliminarArchivo,
};
