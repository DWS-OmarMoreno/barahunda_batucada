const { pool } = require('../config/db');
const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');

const multasModel = require('../models/multas.model');
const miembrosModel = require('../models/miembros.model');

const MODULO = 'MULTAS';

function obtenerFiltros(query) {
  return {
    miembroId: query.miembro_id || undefined,
    estado: query.estado || undefined,
    tipo: query.tipo || undefined,
    fechaDesde: query.fecha_desde || undefined,
    fechaHasta: query.fecha_hasta || undefined,
  };
}

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 20 });
    const { filas, total } = await multasModel.listar({ ...obtenerFiltros(req.query), limite, offset });
    return ok(res, {
      data: filas,
      message: 'Multas obtenidas',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function resumen(req, res, next) {
  try {
    const datos = await multasModel.resumen(obtenerFiltros(req.query));
    return ok(res, { data: datos, message: 'Resumen de multas' });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const multa = await multasModel.obtenerPorId(req.params.id);
    if (!multa) return fail(res, { message: 'Multa no encontrada', status: 404 });
    return ok(res, { data: multa, message: 'Multa obtenida' });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { miembro_id, valor, fecha_generada, tipo } = req.body || {};
    if (!miembro_id || !valor || !fecha_generada) {
      return fail(res, { message: 'miembro_id, valor y fecha_generada son obligatorios', status: 400 });
    }

    const miembro = await miembrosModel.obtenerPorId(miembro_id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const multa = await multasModel.crear({
      miembro_id,
      asistencia_id: null,
      tipo: tipo || 'OTRA',
      valor,
      fecha_generada,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: multa.id, detalle: multa });
    }

    return ok(res, { data: multa, message: 'Multa creada correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function condonar(req, res, next) {
  try {
    const { motivo_condonacion } = req.body || {};
    if (!motivo_condonacion || !motivo_condonacion.trim()) {
      return fail(res, { message: 'El motivo de condonación es obligatorio', status: 400 });
    }

    const { anterior, nuevo } = await multasModel.condonar(req.params.id, motivo_condonacion.trim());

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Multa condonada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function pagar(req, res, next) {
  try {
    const { valor, fecha_pago } = req.body || {};
    if (!fecha_pago) {
      return fail(res, { message: 'La fecha de pago es obligatoria', status: 400 });
    }

    const { anterior, nuevo } = await multasModel.marcarPagada(req.params.id, { valor, fecha_pago });

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Multa marcada como pagada' });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const anterior = await multasModel.eliminar(req.params.id);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'DELETE', entidadId: anterior.id, detalle: anterior });
    }

    return ok(res, { data: null, message: 'Multa eliminada correctamente' });
  } catch (err) {
    next(err);
  }
}

async function historialMiembro(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const filas = await multasModel.listarPorMiembro(req.params.id);
    return ok(res, { data: filas, message: 'Historial de multas del miembro' });
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
       WHERE a.modulo = ?
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [MODULO]
    );
    return ok(res, { data: rows, message: 'Auditoría de multas' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, resumen, obtener, crear, condonar, pagar, eliminar, historialMiembro, auditoria };
