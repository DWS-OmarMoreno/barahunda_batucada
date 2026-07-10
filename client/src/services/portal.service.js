import api from './api';

export async function obtenerPerfil() {
  const { data } = await api.get('/portal/perfil');
  return data;
}

export async function obtenerMisAsistencias(params = {}) {
  const { data } = await api.get('/portal/mis-asistencias', { params });
  return data;
}

export async function obtenerMisMensualidades(params = {}) {
  const { data } = await api.get('/portal/mis-mensualidades', { params });
  return data;
}

export async function obtenerMisTareas() {
  const { data } = await api.get('/portal/mis-tareas');
  return data;
}

export async function obtenerMisGuias() {
  const { data } = await api.get('/portal/mis-guias');
  return data;
}

export async function actualizarPerfil(datos) {
  const { data } = await api.patch('/portal/perfil', datos);
  return data;
}

export async function enviarEntrega({ tarea_id, url_evidencia, observaciones }) {
  const { data } = await api.post('/portal/entregar', { tarea_id, url_evidencia, observaciones });
  return data;
}
