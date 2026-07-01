import api from './api';

// ── Plantillas ────────────────────────────────────────────────────────────────

export async function listarPlantillasCorreo() {
  const { data } = await api.get('/correo/plantillas');
  return data;
}

export async function actualizarPlantillaCorreo(id, payload) {
  const { data } = await api.put(`/correo/plantillas/${id}`, payload);
  return data;
}

// ── Envíos ────────────────────────────────────────────────────────────────────

export async function enviarBienvenida(miembroId) {
  const { data } = await api.post(`/correo/bienvenida/${miembroId}`);
  return data;
}

export async function enviarTareaAsignada(tareaId) {
  const { data } = await api.post(`/correo/tarea-asignada/${tareaId}`);
  return data;
}

export async function enviarTareaCalificada(entregaId) {
  const { data } = await api.post(`/correo/tarea-calificada/${entregaId}`);
  return data;
}

export async function enviarRecordatorio(miembroId, mesPendiente) {
  const { data } = await api.post(`/correo/recordatorio/${miembroId}`, mesPendiente ? { mes_pendiente: mesPendiente } : {});
  return data;
}
