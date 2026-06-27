import api from './api';

export async function listarMiembros(params = {}) {
  const { data } = await api.get('/miembros', { params });
  return data;
}

export async function obtenerMiembro(id) {
  const { data } = await api.get(`/miembros/${id}`);
  return data;
}

export async function crearMiembro(payload) {
  const { data } = await api.post('/miembros', payload);
  return data;
}

export async function actualizarMiembro(id, payload) {
  const { data } = await api.put(`/miembros/${id}`, payload);
  return data;
}

export async function cambiarActivoMiembro(id, activo) {
  const { data } = await api.patch(`/miembros/${id}/inactivar`, { activo });
  return data;
}

// ---------- Niveles asignados ----------

export async function listarNivelesMiembro(id) {
  const { data } = await api.get(`/miembros/${id}/niveles`);
  return data;
}

export async function agregarNivelMiembro(id, payload) {
  const { data } = await api.post(`/miembros/${id}/niveles`, payload);
  return data;
}

export async function actualizarNivelMiembro(id, nivelRegistroId, payload) {
  const { data } = await api.put(`/miembros/${id}/niveles/${nivelRegistroId}`, payload);
  return data;
}

export async function quitarNivelMiembro(id, nivelRegistroId) {
  const { data } = await api.delete(`/miembros/${id}/niveles/${nivelRegistroId}`);
  return data;
}

// ---------- Contactos de emergencia ----------

export async function listarContactosMiembro(id) {
  const { data } = await api.get(`/miembros/${id}/contactos`);
  return data;
}

export async function agregarContactoMiembro(id, payload) {
  const { data } = await api.post(`/miembros/${id}/contactos`, payload);
  return data;
}

export async function actualizarContactoMiembro(id, contactoId, payload) {
  const { data } = await api.put(`/miembros/${id}/contactos/${contactoId}`, payload);
  return data;
}

export async function eliminarContactoMiembro(id, contactoId) {
  const { data } = await api.delete(`/miembros/${id}/contactos/${contactoId}`);
  return data;
}

// ---------- Pagos ----------

export async function listarPagosMiembro(id) {
  const { data } = await api.get(`/miembros/${id}/pagos`);
  return data;
}

export async function registrarPagoMiembro(id, payload, archivoSoporte) {
  const formData = new FormData();
  Object.entries(payload).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') formData.append(clave, valor);
  });
  if (archivoSoporte) formData.append('soporte', archivoSoporte);

  const { data } = await api.post(`/miembros/${id}/pagos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ---------- Auditoría y WhatsApp ----------

export async function obtenerAuditoriaMiembro(id) {
  const { data } = await api.get(`/miembros/${id}/auditoria`);
  return data;
}

export async function obtenerWhatsappRecordatorio(id) {
  const { data } = await api.get(`/miembros/${id}/whatsapp-recordatorio`);
  return data;
}
