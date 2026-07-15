import api from './api';

// ── Planes ────────────────────────────────────────────────────────────────
export const listarPlanes = (params = {}) => api.get('/planes-estudio', { params }).then((r) => r.data);
export const obtenerPlan = (id) => api.get(`/planes-estudio/${id}`).then((r) => r.data);
export const crearPlan = (datos) => api.post('/planes-estudio', datos).then((r) => r.data);
export const actualizarPlan = (id, datos) => api.put(`/planes-estudio/${id}`, datos).then((r) => r.data);
export const activarPlan = (id) => api.post(`/planes-estudio/${id}/activar`).then((r) => r.data);
export const desactivarPlan = (id) => api.post(`/planes-estudio/${id}/desactivar`).then((r) => r.data);

// ── Secciones ─────────────────────────────────────────────────────────────
export const listarSecciones = (planId) => api.get(`/planes-estudio/${planId}/secciones`).then((r) => r.data);
export const crearSeccion = (planId, datos) => api.post(`/planes-estudio/${planId}/secciones`, datos).then((r) => r.data);
export const actualizarSeccion = (planId, seccionId, datos) => api.put(`/planes-estudio/${planId}/secciones/${seccionId}`, datos).then((r) => r.data);
export const eliminarSeccion = (planId, seccionId) => api.delete(`/planes-estudio/${planId}/secciones/${seccionId}`).then((r) => r.data);
export const reordenarSecciones = (planId, ordenes) => api.put(`/planes-estudio/${planId}/secciones/reordenar`, { ordenes }).then((r) => r.data);

// ── Ítems ─────────────────────────────────────────────────────────────────
export const crearItemEnSeccion = (planId, seccionId, datos) => api.post(`/planes-estudio/${planId}/secciones/${seccionId}/items`, datos).then((r) => r.data);
export const actualizarItem = (planId, itemId, datos) => api.put(`/planes-estudio/${planId}/items/${itemId}`, datos).then((r) => r.data);
export const eliminarItem = (planId, itemId) => api.delete(`/planes-estudio/${planId}/items/${itemId}`).then((r) => r.data);
export const reordenarItems = (planId, ordenes) => api.put(`/planes-estudio/${planId}/reordenar`, { ordenes }).then((r) => r.data);

// ── Historial y calificaciones ────────────────────────────────────────────
export const obtenerHistorial = (planId) => api.get(`/planes-estudio/${planId}/historial`).then((r) => r.data);
export const calificarEntrega = (planId, entregaId, datos) => api.patch(`/planes-estudio/${planId}/entregas/${entregaId}/calificar`, datos).then((r) => r.data);
export const obtenerReporte = (planId) => api.get(`/planes-estudio/${planId}/reporte`).then((r) => r.data);

export const exportarReporte = async (planId, formato = 'excel') => {
  const resp = await api.get(`/planes-estudio/${planId}/reporte`, { params: { formato }, responseType: 'blob' });
  const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
  const url = window.URL.createObjectURL(resp.data);
  const a = document.createElement('a');
  a.href = url; a.download = `reporte_plan.${ext}`;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};

// ── Portal ────────────────────────────────────────────────────────────────
export const obtenerMiPlan = () => api.get('/portal/mi-plan').then((r) => r.data);
export const entregarItem = (datos) => api.post('/portal/entregar-item', datos).then((r) => r.data);

// ── Notificaciones (admin) ────────────────────────────────────────────────
export const notificarPlan = (planId, datos) => api.post(`/planes-estudio/${planId}/notificar`, datos).then((r) => r.data);
export const notificarItem = (planId, itemId, datos) => api.post(`/planes-estudio/${planId}/items/${itemId}/notificar`, datos).then((r) => r.data);
export const eliminarEntregaPlan = (planId, entregaId) => api.delete(`/planes-estudio/${planId}/entregas/${entregaId}`).then((r) => r.data);
