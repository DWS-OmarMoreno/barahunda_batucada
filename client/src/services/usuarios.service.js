import api from './api';

export async function listarUsuarios(params = {}) {
  const { data } = await api.get('/usuarios', { params });
  return data;
}

export async function obtenerUsuario(id) {
  const { data } = await api.get(`/usuarios/${id}`);
  return data;
}

export async function crearUsuario(payload) {
  const { data } = await api.post('/usuarios', payload);
  return data;
}

export async function actualizarUsuario(id, payload) {
  const { data } = await api.put(`/usuarios/${id}`, payload);
  return data;
}

export async function cambiarPasswordUsuario(id, password) {
  const { data } = await api.patch(`/usuarios/${id}/password`, { password });
  return data;
}

export async function cambiarActivoUsuario(id, activo) {
  const { data } = await api.patch(`/usuarios/${id}/activo`, { activo });
  return data;
}

export async function obtenerAuditoriaUsuario(id) {
  const { data } = await api.get(`/usuarios/${id}/auditoria`);
  return data;
}
