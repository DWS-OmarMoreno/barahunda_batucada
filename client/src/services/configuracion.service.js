import api from './api';

export async function obtenerConfiguracion() {
  const { data } = await api.get('/configuracion');
  return data;
}

export async function actualizarConfiguracion(cambios) {
  const { data } = await api.put('/configuracion', cambios);
  return data;
}

export async function subirLogo(file) {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await api.post('/configuracion/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function obtenerAuditoriaConfiguracion() {
  const { data } = await api.get('/configuracion/auditoria');
  return data;
}

export async function probarSmtp() {
  const { data } = await api.post('/configuracion/smtp/test');
  return data;
}

// ── BD Management ─────────────────────────────────────────────────────────────
export async function bdResumen() {
  const { data } = await api.get('/configuracion/bd/resumen');
  return data;
}

export async function bdListar(tabla, { page = 1, limit = 50 } = {}) {
  const { data } = await api.get(`/configuracion/bd/tabla/${tabla}`, { params: { page, limit } });
  return data;
}

export async function bdEliminarUno(tabla, id) {
  const { data } = await api.delete(`/configuracion/bd/tabla/${tabla}/${id}`);
  return data;
}

export async function bdEliminarTodos(tabla) {
  const { data } = await api.delete(`/configuracion/bd/tabla/${tabla}`);
  return data;
}
