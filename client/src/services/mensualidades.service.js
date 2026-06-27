import api from './api';

export async function listarEstadoMensualidades(params = {}) {
  const { data } = await api.get('/mensualidades', { params });
  return data;
}

export async function listarMensualidadesPendientes() {
  const { data } = await api.get('/mensualidades/pendientes');
  return data;
}

export async function listarMensualidadesAlDia() {
  const { data } = await api.get('/mensualidades/al-dia');
  return data;
}

export async function obtenerHistorialMensualidad(miembroId) {
  const { data } = await api.get(`/mensualidades/miembro/${miembroId}`);
  return data;
}

export async function establecerValorMensualidad(miembroId, valorMensualidad) {
  const { data } = await api.put(`/mensualidades/valor/${miembroId}`, { valor_mensualidad: valorMensualidad });
  return data;
}

export async function registrarPagoMensualidad(payload, archivoSoporte) {
  const formData = new FormData();
  Object.entries(payload).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') formData.append(clave, valor);
  });
  if (archivoSoporte) formData.append('soporte', archivoSoporte);

  const { data } = await api.post('/mensualidades/pago', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function actualizarPagoMensualidad(id, payload) {
  const { data } = await api.put(`/mensualidades/pago/${id}`, payload);
  return data;
}

export async function eliminarPagoMensualidad(id) {
  const { data } = await api.delete(`/mensualidades/pago/${id}`);
  return data;
}

export async function obtenerAuditoriaMensualidades() {
  const { data } = await api.get('/mensualidades/auditoria');
  return data;
}
