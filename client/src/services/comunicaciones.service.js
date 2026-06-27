import api from './api';

export async function listarComunicaciones(params = {}) {
  const { data } = await api.get('/comunicaciones', { params });
  return data;
}

export async function enviarComunicacion(payload) {
  const { data } = await api.post('/comunicaciones/enviar', payload);
  return data;
}

export async function obtenerAuditoriaComunicaciones() {
  const { data } = await api.get('/comunicaciones/auditoria');
  return data;
}
