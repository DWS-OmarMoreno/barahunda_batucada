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
