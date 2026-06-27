const { pool } = require('../config/db');
const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');

const eventosModel = require('../models/eventos.model');
const miembrosModel = require('../models/miembros.model');

const MODULO = 'EVENTOS';

function obtenerFiltros(query) {
  return {
    tipo: query.tipo || undefined,
    fechaDesde: query.fecha_desde || undefined,
    fechaHasta: query.fecha_hasta || undefined,
  };
}

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 20 });
    const { filas, total } = await eventosModel.listar({ ...obtenerFiltros(req.query), limite, offset });
    return ok(res, {
      data: filas,
      message: 'Eventos obtenidos',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const evento = await eventosModel.obtenerPorId(req.params.id);
    if (!evento) return fail(res, { message: 'Evento no encontrado', status: 404 });

    const participantes = await eventosModel.listarParticipantes(req.params.id);
    const totalAsignado = participantes.reduce((acc, p) => acc + Number(p.valor_individual), 0);

    return ok(res, { data: { ...evento, participantes, total_asignado: totalAsignado }, message: 'Evento obtenido' });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombre, fecha, descripcion, tipo, valor_total, quien_contrata_nombre, quien_contrata_contacto } = req.body || {};
    if (!nombre || !fecha) {
      return fail(res, { message: 'nombre y fecha son obligatorios', status: 400 });
    }

    const evento = await eventosModel.crear({
      nombre, fecha, descripcion, tipo, valor_total, quien_contrata_nombre, quien_contrata_contacto,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: evento.id, detalle: evento });
    }

    return ok(res, { data: evento, message: 'Evento creado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { anterior, nuevo } = await eventosModel.actualizar(req.params.id, req.body || {});

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Evento actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const { anterior, nuevo } = await eventosModel.eliminar(req.params.id);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'DELETE', entidadId: anterior.id, detalle: anterior });
    }

    return ok(res, { data: nuevo, message: 'Evento eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function agregarMiembro(req, res, next) {
  try {
    const { miembro_id, valor_individual, notas } = req.body || {};
    if (!miembro_id) return fail(res, { message: 'miembro_id es obligatorio', status: 400 });

    const evento = await eventosModel.obtenerPorId(req.params.id);
    if (!evento) return fail(res, { message: 'Evento no encontrado', status: 404 });

    const miembro = await miembrosModel.obtenerPorId(miembro_id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const participante = await eventosModel.agregarParticipante(req.params.id, { miembro_id, valor_individual, notas });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({
        modulo: MODULO, accion: 'UPDATE', entidadId: Number(req.params.id),
        detalle: { accion: 'agregar_participante', ...participante },
      });
    }

    return ok(res, { data: participante, message: 'Participante agregado al evento', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizarMiembro(req, res, next) {
  try {
    const { valor_individual, notas } = req.body || {};
    const { anterior, nuevo } = await eventosModel.actualizarParticipante(req.params.id, req.params.miembroId, { valor_individual, notas });

    if (req.auditoria) {
      await req.auditoria.registrarCambios({
        modulo: MODULO, entidadId: Number(req.params.id), anterior, nuevo,
      });
    }

    return ok(res, { data: nuevo, message: 'Participante actualizado' });
  } catch (err) {
    next(err);
  }
}

async function quitarMiembro(req, res, next) {
  try {
    const actual = await eventosModel.quitarParticipante(req.params.id, req.params.miembroId);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({
        modulo: MODULO, accion: 'DELETE', entidadId: Number(req.params.id),
        detalle: { accion: 'quitar_participante', ...actual },
      });
    }

    return ok(res, { data: actual, message: 'Participante retirado del evento' });
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
       WHERE a.modulo = ? AND (a.entidad_id = ? OR ? IS NULL)
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [MODULO, req.params.id, req.params.id]
    );
    return ok(res, { data: rows, message: 'Auditoría del evento' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar, obtener, crear, actualizar, eliminar,
  agregarMiembro, actualizarMiembro, quitarMiembro,
  auditoria,
};
