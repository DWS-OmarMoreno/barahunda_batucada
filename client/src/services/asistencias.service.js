import api from './api';

export async function listarAsistencias(params = {}) {
  const { data } = await api.get('/asistencias', { params });
  return data;
}

export async function listarAsistenciasConAusentes(params = {}) {
  const { data } = await api.get('/asistencias/con-ausentes', { params });
  return data;
}

export async function obtenerContadoresAsistencias(params = {}) {
  const { data } = await api.get('/asistencias/contadores', { params });
  return data;
}

export async function obtenerAsistencia(id) {
  const { data } = await api.get(`/asistencias/${id}`);
  return data;
}

export async function obtenerAuditoriaAsistencia(id) {
  const { data } = await api.get(`/asistencias/${id}/auditoria`);
  return data;
}

export async function anularAsistencia(id, motivo) {
  const { data } = await api.patch(`/asistencias/${id}/anular`, { motivo });
  return data;
}

export async function editarAsistencia(id, { estado, hora, motivo }) {
  const { data } = await api.patch(`/asistencias/${id}/editar`, { estado, hora, motivo });
  return data;
}

export async function obtenerHorariosDisponibles({ miembroId, fecha }) {
  const { data } = await api.get('/asistencias/horarios-disponibles', { params: { miembro_id: miembroId, fecha } });
  return data;
}

export async function registrarAsistenciaManual({ miembroId, horarioId, fecha, hora }) {
  const { data } = await api.post('/asistencias/manual', {
    miembro_id: miembroId,
    horario_id: horarioId,
    fecha,
    hora,
  });
  return data;
}

// Endpoint público del portal /asistencia (no requiere sesión). horarioId y
// token vienen del QR escaneado (ver server/utils/asistenciaToken.js) y son
// obligatorios: sin ellos el backend rechaza el registro.
export async function registrarAsistenciaPublica({ numeroDocumento, horarioId, token }) {
  const { data } = await api.post('/asistencias/publica', {
    numero_documento: numeroDocumento,
    horario_id: horarioId,
    token,
  });
  return data;
}

// Endpoint público del enlace FIJO de un único punto de registro de la sede
// (p. ej. una tablet en la entrada). No envía horario_id: el backend
// resuelve solo cuál es la clase en curso del miembro. El token no rota
// (ver server/models/puntoRegistro.model.js).
export async function registrarAsistenciaPuntoFijo({ numeroDocumento, token }) {
  const { data } = await api.post('/asistencias/punto-fijo', {
    numero_documento: numeroDocumento,
    token,
  });
  return data;
}
