import api from './api';

export async function listarEventos(params = {}) {
  const { data } = await api.get('/eventos', { params });
  return data;
}

export async function obtenerEvento(id) {
  const { data } = await api.get(`/eventos/${id}`);
  return data;
}

export async function crearEvento(payload) {
  const { data } = await api.post('/eventos', payload);
  return data;
}

export async function actualizarEvento(id, payload) {
  const { data } = await api.put(`/eventos/${id}`, payload);
  return data;
}

export async function eliminarEvento(id) {
  const { data } = await api.delete(`/eventos/${id}`);
  return data;
}

export async function agregarParticipante(eventoId, payload) {
  const { data } = await api.post(`/eventos/${eventoId}/miembros`, payload);
  return data;
}

export async function actualizarParticipante(eventoId, miembroId, payload) {
  const { data } = await api.put(`/eventos/${eventoId}/miembros/${miembroId}`, payload);
  return data;
}

export async function quitarParticipante(eventoId, miembroId) {
  const { data } = await api.delete(`/eventos/${eventoId}/miembros/${miembroId}`);
  return data;
}

export async function obtenerAuditoriaEvento(eventoId) {
  const { data } = await api.get(`/eventos/${eventoId}/auditoria`);
  return data;
}
