const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const nivelesModel = require('../models/niveles.model');
const { pool } = require('../config/db');

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query);
    const { filas, total } = await nivelesModel.listar({
      busqueda: req.query.busqueda || '',
      activo: req.query.activo,
      limite,
      offset,
    });
    return ok(res, {
      data: filas,
      message: 'Niveles obtenidos',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const nivel = await nivelesModel.obtenerPorId(req.params.id);
    if (!nivel) return fail(res, { message: 'Nivel no encontrado', status: 404 });
    const miembros = await nivelesModel.miembrosDelNivel(nivel.id);
    return ok(res, { data: { ...nivel, miembros }, message: 'Nivel obtenido' });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, descripcion } = req.body || {};
    if (!nombre || !nombre.trim()) return fail(res, { message: 'El nombre del nivel es obligatorio', status: 400 });

    const existente = await nivelesModel.obtenerPorNombre(nombre.trim());
    if (existente) return fail(res, { message: 'Ya existe un nivel con ese nombre', status: 409 });

    const nivel = await nivelesModel.crear({ nombre: nombre.trim(), descripcion });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: 'NIVELES', accion: 'CREATE', entidadId: nivel.id, detalle: nivel });
    }

    return ok(res, { data: nivel, message: 'Nivel creado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, descripcion } = req.body || {};
    const { anterior, nuevo } = await nivelesModel.actualizar(req.params.id, { nombre, descripcion });

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: 'NIVELES', entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Nivel actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function inactivar(req, res, next) {
  try {
    const nivelActual = await nivelesModel.obtenerPorId(req.params.id);
    if (!nivelActual) return fail(res, { message: 'Nivel no encontrado', status: 404 });

    const nuevoEstado = req.body?.activo !== undefined ? !!req.body.activo : !nivelActual.activo;
    const { anterior, nuevo } = await nivelesModel.cambiarActivo(req.params.id, nuevoEstado);

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: 'NIVELES', entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: nuevo.activo ? 'Nivel activado' : 'Nivel inactivado' });
  } catch (err) {
    next(err);
  }
}

async function miembros(req, res, next) {
  try {
    const filas = await nivelesModel.miembrosDelNivel(req.params.id);
    return ok(res, { data: filas, message: 'Miembros del nivel' });
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
       WHERE a.modulo = 'NIVELES' AND a.entidad_id = ?
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [req.params.id]
    );
    return ok(res, { data: rows, message: 'Auditoría del nivel' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, inactivar, miembros, auditoria };
