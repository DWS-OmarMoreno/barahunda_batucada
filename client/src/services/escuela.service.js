import api from './api';

// ── Tareas ───────────────────────────────────────────────────────────────────

export async function listarTareas(params = {}) {
  const { data } = await api.get('/escuela/tareas', { params });
  return data;
}

export async function crearTarea(payload) {
  const { data } = await api.post('/escuela/tareas', payload);
  return data;
}

export async function actualizarTarea(id, payload) {
  const { data } = await api.put(`/escuela/tareas/${id}`, payload);
  return data;
}

export async function toggleTarea(id) {
  const { data } = await api.patch(`/escuela/tareas/${id}/toggle`);
  return data;
}

// ── Guías ────────────────────────────────────────────────────────────────────

export async function listarGuias(params = {}) {
  const { data } = await api.get('/escuela/guias', { params });
  return data;
}

export async function obtenerGuia(id) {
  const { data } = await api.get(`/escuela/guias/${id}`);
  return data;
}

export async function crearGuia(payload) {
  const { data } = await api.post('/escuela/guias', payload);
  return data;
}

export async function actualizarGuia(id, payload) {
  const { data } = await api.put(`/escuela/guias/${id}`, payload);
  return data;
}

export async function toggleGuia(id) {
  const { data } = await api.patch(`/escuela/guias/${id}/toggle`);
  return data;
}

// ── Entregas ─────────────────────────────────────────────────────────────────

export async function listarEntregas(params = {}) {
  const { data } = await api.get('/escuela/entregas', { params });
  return data;
}

export async function calificarEntrega(id, payload) {
  const { data } = await api.patch(`/escuela/entregas/${id}/calificar`, payload);
  return data;
}
