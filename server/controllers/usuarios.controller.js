const { pool } = require('../config/db');
const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');

const usuarioModel = require('../models/usuario.model');

const MODULO = 'USUARIOS';

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 20 });
    const { filas, total } = await usuarioModel.listar({
      busqueda: req.query.busqueda || '',
      activo: req.query.activo,
      limite,
      offset,
    });
    return ok(res, {
      data: filas,
      message: 'Administradores obtenidos',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const usuario = await usuarioModel.buscarPorId(req.params.id);
    if (!usuario) return fail(res, { message: 'Administrador no encontrado', status: 404 });
    return ok(res, { data: usuario, message: 'Administrador obtenido' });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, email, password, rol, miembro_id } = req.body || {};
    if (!nombre || !nombre.trim()) {
      return fail(res, { message: 'El nombre es obligatorio', status: 400 });
    }
    if (!validarEmail(email)) {
      return fail(res, { message: 'El email no es válido', status: 400 });
    }
    if (!password || password.length < 6) {
      return fail(res, { message: 'La contraseña debe tener al menos 6 caracteres', status: 400 });
    }

    const rolNormalizado = rol === 'MIEMBRO' ? 'MIEMBRO' : 'ADMIN';
    if (rolNormalizado === 'MIEMBRO' && !miembro_id) {
      return fail(res, { message: 'Los usuarios tipo MIEMBRO deben estar vinculados a un miembro', status: 400 });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const existente = await usuarioModel.buscarPorEmail(emailNormalizado);
    if (existente) {
      return fail(res, { message: 'Ya existe un usuario con ese email', status: 409 });
    }

    const usuario = await usuarioModel.crear({
      nombre: nombre.trim(),
      email: emailNormalizado,
      password,
      rol: rolNormalizado,
      miembro_id: miembro_id || null,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({
        modulo: MODULO,
        accion: 'CREATE',
        entidadId: usuario.id,
        detalle: usuario,
      });
    }

    return ok(res, { data: usuario, message: 'Usuario creado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, email } = req.body || {};

    if (email !== undefined && !validarEmail(email)) {
      return fail(res, { message: 'El email no es válido', status: 400 });
    }

    let emailNormalizado;
    if (email !== undefined) {
      emailNormalizado = email.trim().toLowerCase();
      const existente = await usuarioModel.buscarPorEmail(emailNormalizado);
      if (existente && Number(existente.id) !== Number(req.params.id)) {
        return fail(res, { message: 'Ya existe otro administrador con ese email', status: 409 });
      }
    }

    const { miembro_id } = req.body || {};
    const { anterior, nuevo } = await usuarioModel.actualizar(req.params.id, {
      nombre: nombre !== undefined ? nombre.trim() : undefined,
      email: emailNormalizado,
      miembro_id,
    });

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Administrador actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function cambiarPassword(req, res, next) {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) {
      return fail(res, { message: 'La contraseña debe tener al menos 6 caracteres', status: 400 });
    }

    const usuario = await usuarioModel.cambiarPassword(req.params.id, password);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({
        modulo: MODULO,
        accion: 'UPDATE',
        entidadId: usuario.id,
        detalle: { cambio: 'password' },
      });
    }

    return ok(res, { data: null, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

// Activar/desactivar un administrador. No se permite borrar usuarios (los
// registros quedan ligados por FK desde pagos/asistencias/auditoría), por
// lo que "eliminar" un administrador es desactivarlo (igual al patrón
// activo=0 usado en el resto del sistema).
async function cambiarActivo(req, res, next) {
  try {
    const usuarioActual = await usuarioModel.buscarPorId(req.params.id);
    if (!usuarioActual) return fail(res, { message: 'Administrador no encontrado', status: 404 });

    const nuevoEstado = req.body && req.body.activo !== undefined
      ? !!req.body.activo
      : !usuarioActual.activo;

    if (!nuevoEstado) {
      if (Number(req.params.id) === Number(req.usuario?.id)) {
        return fail(res, { message: 'No puedes desactivar tu propia cuenta', status: 400 });
      }
      const activosRestantes = await usuarioModel.contarActivos(req.params.id);
      if (activosRestantes === 0) {
        return fail(res, { message: 'Debe quedar al menos un administrador activo', status: 400 });
      }
    }

    const { anterior, nuevo } = await usuarioModel.cambiarActivo(req.params.id, nuevoEstado);

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, {
      data: nuevo,
      message: nuevo.activo ? 'Administrador activado' : 'Administrador desactivado',
    });
  } catch (err) {
    next(err);
  }
}

async function auditoria(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS usuario_nombre
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.modulo = 'USUARIOS' AND a.entidad_id = ?
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [req.params.id]
    );
    return ok(res, { data: rows, message: 'Auditoría del administrador' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarPassword, cambiarActivo, auditoria };
