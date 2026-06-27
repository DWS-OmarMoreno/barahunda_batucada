import api from './api';

const MODULOS_IMPORTACION = [
  { valor: 'miembros', etiqueta: 'Miembros' },
  { valor: 'niveles', etiqueta: 'Niveles' },
  { valor: 'horarios', etiqueta: 'Horarios' },
  { valor: 'pagos', etiqueta: 'Pagos' },
];

const MODULOS_EXPORTACION = [
  { valor: 'miembros', etiqueta: 'Miembros' },
  { valor: 'niveles', etiqueta: 'Niveles' },
  { valor: 'horarios', etiqueta: 'Horarios' },
  { valor: 'instrumentos', etiqueta: 'Instrumentos' },
  { valor: 'pagos', etiqueta: 'Pagos' },
  { valor: 'asistencias', etiqueta: 'Asistencias' },
  { valor: 'multas', etiqueta: 'Multas' },
  { valor: 'eventos', etiqueta: 'Eventos' },
  { valor: 'comunicaciones', etiqueta: 'Comunicaciones' },
];

function descargarBlob(blob, nombreArchivo) {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}

// Descarga la plantilla Excel (solo encabezados) de un módulo importable.
export async function descargarPlantilla(modulo) {
  const respuesta = await api.get(`/importacion/plantillas/${modulo}`, { responseType: 'blob' });
  descargarBlob(respuesta.data, `plantilla_${modulo}.xlsx`);
}

// Sube el archivo y valida (confirmar=false) o valida + inserta (confirmar=true).
export async function importarArchivo(modulo, archivo, confirmar) {
  const formData = new FormData();
  formData.append('archivo', archivo);

  const { data } = await api.post(`/importacion/${modulo}`, formData, {
    params: { confirmar: confirmar ? 'true' : 'false' },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function obtenerHistorialImportaciones(params = {}) {
  const { data } = await api.get('/importacion/historial', { params });
  return data;
}

// Descarga el dump completo de un módulo exportable en Excel o CSV.
export async function exportarModulo(modulo, formato = 'excel') {
  const respuesta = await api.get(`/exportacion/${modulo}`, {
    params: { formato },
    responseType: 'blob',
  });
  const extension = formato === 'csv' ? 'csv' : 'xlsx';
  descargarBlob(respuesta.data, `${modulo}.${extension}`);
}

export { MODULOS_IMPORTACION, MODULOS_EXPORTACION };
