import api from './api';

export async function listarHorarios(params = {}) {
  const { data } = await api.get('/horarios', { params });
  return data;
}

export async function crearHorario(payload) {
  const { data } = await api.post('/horarios', payload);
  return data;
}

export async function actualizarHorario(id, payload) {
  const { data } = await api.put(`/horarios/${id}`, payload);
  return data;
}

export async function toggleHorario(id) {
  const { data } = await api.patch(`/horarios/${id}/toggle`);
  return data;
}

export async function obtenerAuditoriaHorario(id) {
  const { data } = await api.get(`/horarios/${id}/auditoria`);
  return data;
}

export async function obtenerQrHorario(id) {
  const { data } = await api.get(`/horarios/${id}/qr`);
  return data;
}
