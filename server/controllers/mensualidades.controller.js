const { pool } = require('../config/db');
const { ok, fail } = require('../utils/respuesta');

const mensualidadModel = require('../models/mensualidad.model');
const pagosModel = require('../models/pagos.model');
const miembrosModel = require('../models/miembros.model');

const MODULO = 'MENSUALIDADES';

function mesAnioActual() {
  const ahora = new Date();
  return { mes: ahora.getMonth() + 1, anio: ahora.getFullYear() };
}

function parametrosMesAnio(query) {
  const actual = mesAnioActual();
  const mes = query.mes ? Number(query.mes) : actual.mes;
  const anio = query.anio ? Number(query.anio) : actual.anio;
  return { mes, anio };
}

// ---------- Vista de estado por mes ----------

async function listar(req, res, next) {
  try {
    const { mes, anio } = parametrosMesAnio(req.query);
    const filas = await mensualidadModel.listarEstadoPorMes(mes, anio);
    return ok(res, { data: filas, message: 'Estado de mensualidades obtenido' });
  } catch (err) {
    next(err);
  }
}

async function pendientes(req, res, next) {
  try {
    const { mes, anio } = mesAnioActual();
    const filas = await mensualidadModel.listarEstadoPorMes(mes, anio);
    // Los miembros exentos de pago nunca aparecen como pendientes: no se les
    // cobra la mensualidad, así que su estado EXENTO no cuenta como deuda.
    return ok(res, {
      data: filas.filter((f) => f.estado !== 'PAGADO' && f.estado !== 'EXENTO'),
      message: 'Miembros con mensualidad pendiente del mes actual',
    });
  } catch (err) {
    next(err);
  }
}

async function alDia(req, res, next) {
  try {
    const { mes, anio } = mesAnioActual();
    const filas = await mensualidadModel.listarEstadoPorMes(mes, anio);
    return ok(res, {
      data: filas.filter((f) => f.estado === 'PAGADO'),
      message: 'Miembros al día del mes actual',
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Historial por miembro ----------

async function historialMiembro(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const [pagos, mensualidad] = await Promise.all([
      pagosModel.listarPorMiembro(req.params.id),
      mensualidadModel.obtenerPorMiembro(req.params.id),
    ]);

    return ok(res, { data: { pagos, mensualidad }, message: 'Historial de pagos obtenido' });
  } catch (err) {
    next(err);
  }
}

// ---------- Valor de mensualidad por miembro ----------

async function actualizarValor(req, res, next) {
  try {
    const { valor_mensualidad } = req.body || {};
    if (valor_mensualidad === undefined || valor_mensualidad === null || valor_mensualidad === '') {
      return fail(res, { message: 'valor_mensualidad es obligatorio', status: 400 });
    }

    const miembro = await miembrosModel.obtenerPorId(req.params.miembroId);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const anterior = (await mensualidadModel.obtenerPorMiembro(req.params.miembroId)) || {
      miembro_id: Number(req.params.miembroId),
      valor_mensualidad: 0,
    };
    const nuevo = await mensualidadModel.establecerValor(req.params.miembroId, valor_mensualidad);

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: Number(req.params.miembroId), anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Valor de mensualidad actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

// ---------- Pagos ----------

async function registrarPago(req, res, next) {
  try {
    const { miembro_id, valor, fecha_pago, mes_correspondiente, anio_correspondiente, observaciones } = req.body || {};
    if (!miembro_id || !valor || !fecha_pago || !mes_correspondiente || !anio_correspondiente) {
      return fail(res, {
        message: 'miembro_id, valor, fecha_pago, mes_correspondiente y anio_correspondiente son obligatorios',
        status: 400,
      });
    }

    const miembro = await miembrosModel.obtenerPorId(miembro_id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const soporte_url = req.file ? `/uploads/soportes/${req.file.filename}` : null;

    const pago = await pagosModel.crear({
      miembro_id,
      valor,
      fecha_pago,
      mes_correspondiente,
      anio_correspondiente,
      soporte_url,
      observaciones,
      registrado_por: req.usuario?.id || null,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: pago.id, detalle: pago });
    }

    return ok(res, { data: pago, message: 'Pago registrado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizarPago(req, res, next) {
  try {
    const { anterior, nuevo } = await pagosModel.actualizar(req.params.id, req.body || {});

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Pago actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminarPago(req, res, next) {
  try {
    const anterior = await pagosModel.eliminar(req.params.id);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'DELETE', entidadId: anterior.id, detalle: anterior });
    }

    return ok(res, { data: null, message: 'Pago eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

// ---------- Auditoría (global del módulo) ----------

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
    return ok(res, { data: rows, message: 'Auditoría de mensualidades' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  pendientes,
  alDia,
  historialMiembro,
  actualizarValor,
  registrarPago,
  actualizarPago,
  eliminarPago,
  auditoria,
};
