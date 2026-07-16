import api from './api';

export async function enviarFormularioContacto(datos) {
  const respuesta = await api.post('/contacto', datos);
  return respuesta.data;
}
