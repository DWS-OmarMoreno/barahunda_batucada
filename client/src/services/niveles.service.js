import api from './api';

export async function listarNiveles(params = {}) {
  const { data } = await api.get('/niveles', { params });
  return data;
}

export async function obtenerNivel(id) {
  const { data } = await api.get(`/niveles/${id}`);
  return data;
}

export async function crearNivel(payload) {
  const { data } = await api.post('/niveles', payload);
  return data;
}

export async function actualizarNivel(id, payload) {
  const { data } = await api.put(`/niveles/${id}`, payload);
  return data;
}

export async function cambiarActivoNivel(id, activo) {
  const { data } = await api.patch(`/niveles/${id}/inactivar`, { activo });
  return data;
}

export async function obtenerAuditoriaNivel(id) {
  const { data } = await api.get(`/niveles/${id}/auditoria`);
  return data;
}
