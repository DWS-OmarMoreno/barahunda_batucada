import api from './api';

export async function listarPlantillas(params = {}) {
  const { data } = await api.get('/plantillas', { params });
  return data;
}

export async function obtenerPlantilla(id) {
  const { data } = await api.get(`/plantillas/${id}`);
  return data;
}

export async function crearPlantilla(payload) {
  const { data } = await api.post('/plantillas', payload);
  return data;
}

export async function actualizarPlantilla(id, payload) {
  const { data } = await api.put(`/plantillas/${id}`, payload);
  return data;
}

export async function eliminarPlantilla(id) {
  const { data } = await api.delete(`/plantillas/${id}`);
  return data;
}
