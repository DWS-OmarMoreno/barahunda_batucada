// Middleware de autenticación y control de roles.
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { fail } = require('../utils/respuesta');

// Verifica el JWT y que el usuario siga activo en la BD.
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return fail(res, { message: 'No se proporcionó un token de autenticación', status: 401 });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Verificar que el usuario aún exista y esté activo
    const [rows] = await pool.query('SELECT id, nombre, email, rol, miembro_id, activo FROM usuarios WHERE id = ? LIMIT 1', [payload.id]);
    const usuario = rows[0];
    if (!usuario) {
      return fail(res, { message: 'Usuario no encontrado', status: 401 });
    }
    if (!usuario.activo) {
      return fail(res, { message: 'Tu cuenta está inactiva. Contacta al administrador.', status: 403 });
    }
    req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, miembro_id: usuario.miembro_id || null };
    next();
  } catch (err) {
    return fail(res, { message: 'Token inválido o expirado', status: 401 });
  }
}

// Middleware de rol: verificarRol('ADMIN') o verificarRol('ADMIN','MIEMBRO')
function verificarRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return fail(res, { message: 'No autenticado', status: 401 });
    }
    if (!roles.includes(req.usuario.rol)) {
      return fail(res, { message: 'No tienes permiso para realizar esta acción', status: 403 });
    }
    next();
  };
}

module.exports = { verifyToken, verificarRol };
