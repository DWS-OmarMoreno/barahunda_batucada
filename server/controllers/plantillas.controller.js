const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const plantillasModel = require('../models/plantillas.model');

const MODULO = 'COMUNICACIONES';

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 50 });
    const { filas, total } = await plantillasModel.listar({
      busqueda: req.query.busqueda,
      activo: req.query.activo,
      limite,
      offset,
    });
    return ok(res, {
      data: filas,
      message: 'Plantillas obtenidas',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const plantilla = await plantillasModel.obtenerPorId(req.params.id);
    if (!plantilla) return fail(res, { message: 'Plantilla no encontrada', status: 404 });
    return ok(res, { data: plantilla, message: 'Plantilla obtenida' });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, contenido } = req.body || {};
    if (!nombre || !contenido) {
      return fail(res, { message: 'nombre y contenido son obligatorios', status: 400 });
    }

    const plantilla = await plantillasModel.crear({ nombre, contenido });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: plantilla.id, detalle: plantilla });
    }

    return ok(res, { data: plantilla, message: 'Plantilla creada correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, contenido } = req.body || {};
    const { anterior, nuevo } = await plantillasModel.actualizar(req.params.id, { nombre, contenido });

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Plantilla actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const { anterior, nuevo } = await plantillasModel.eliminar(req.params.id);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'DELETE', entidadId: anterior.id, detalle: anterior });
    }

    return ok(res, { data: nuevo, message: 'Plantilla eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
