// Middleware que protege las rutas del admin verificando el JWT enviado
// en el header Authorization: Bearer <token>
const jwt = require('jsonwebtoken');
const { fail } = require('../utils/respuesta');

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, { message: 'No se proporcionó un token de autenticación', status: 401 });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.id, nombre: payload.nombre, email: payload.email, rol: payload.rol };
    next();
  } catch (err) {
    return fail(res, { message: 'Token inválido o expirado', status: 401 });
  }
}

module.exports = { verifyToken };
