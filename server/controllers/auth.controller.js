const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ok, fail } = require('../utils/respuesta');
const usuarioModel = require('../models/usuario.model');
const { registrarAccion } = require('../utils/auditoria');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return fail(res, { message: 'Email y contraseña son obligatorios', status: 400 });
    }

    const usuario = await usuarioModel.buscarPorEmail(email.trim().toLowerCase());
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!usuario || !usuario.activo) {
      return fail(res, { message: 'Credenciales inválidas', status: 401 });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return fail(res, { message: 'Credenciales inválidas', status: 401 });
    }

    const payload = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, miembro_id: usuario.miembro_id || null };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

    await registrarAccion({
      modulo: 'AUTENTICACION',
      accion: 'LOGIN',
      entidadId: usuario.id,
      detalle: { email: usuario.email },
      usuarioId: usuario.id,
      ip,
    });

    return ok(res, {
      data: { token, usuario: payload },
      message: `Bienvenido, ${usuario.nombre}`,
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  // JWT es sin estado: el cierre de sesión real ocurre al descartar el
  // token en el cliente. El endpoint existe para mantener consistencia
  // de la API y poder evolucionar a listas de revocación si se requiere.
  return ok(res, { message: 'Sesión cerrada correctamente' });
}

module.exports = { login, logout };
