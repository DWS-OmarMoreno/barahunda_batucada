import api from './api';

export async function listarInstrumentos() {
  const { data } = await api.get('/instrumentos');
  return data;
}
