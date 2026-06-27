// Helper para mantener una estructura de respuesta consistente en toda la API
// { success, data, message, pagination }

function ok(res, { data = null, message = 'Operación exitosa', pagination = undefined, status = 200 } = {}) {
  const body = { success: true, data, message };
  if (pagination) body.pagination = pagination;
  return res.status(status).json(body);
}

function fail(res, { message = 'Ocurrió un error', status = 400, data = null } = {}) {
  return res.status(status).json({ success: false, data, message });
}

module.exports = { ok, fail };
