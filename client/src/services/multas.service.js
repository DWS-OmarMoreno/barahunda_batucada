import api from './api';

export async function listarMultas(params = {}) {
  const { data } = await api.get('/multas', { params });
  return data;
}

export async function obtenerResumenMultas(params = {}) {
  const { data } = await api.get('/multas/resumen', { params });
  return data;
}

export async function obtenerMulta(id) {
  const { data } = await api.get(`/multas/${id}`);
  return data;
}

export async function obtenerHistorialMultasMiembro(miembroId) {
  const { data } = await api.get(`/multas/miembro/${miembroId}`);
  return data;
}

export async function crearMulta(payload) {
  const { data } = await api.post('/multas', payload);
  return data;
}

export async function condonarMulta(id, motivoCondonacion) {
  const { data } = await api.patch(`/multas/${id}/condonar`, { motivo_condonacion: motivoCondonacion });
  return data;
}

export async function pagarMulta(id, payload) {
  const { data } = await api.patch(`/multas/${id}/pagar`, payload);
  return data;
}

export async function obtenerAuditoriaMultas() {
  const { data } = await api.get('/multas/auditoria');
  return data;
}

export async function eliminarMulta(id) {
  const { data } = await api.delete(`/multas/${id}`);
  return data;
}
