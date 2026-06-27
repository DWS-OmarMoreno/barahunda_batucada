import api from './api';

// Enlace fijo (no rotativo) del único punto físico de registro de la sede.
// Solo lo debe ver el admin: se entrega manualmente al dispositivo del
// punto de registro, nunca a los miembros (ver Configuración).
export async function obtenerPuntoRegistro() {
  const { data } = await api.get('/punto-registro');
  return data;
}

export async function regenerarPuntoRegistro() {
  const { data } = await api.post('/punto-registro/regenerar');
  return data;
}
