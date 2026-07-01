const QRCode = require('qrcode');
const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const horariosModel = require('../models/horarios.model');
const asistenciaToken = require('../utils/asistenciaToken');
const { pool } = require('../config/db');

const DIAS_VALIDOS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 50 });
    const { filas, total } = await horariosModel.listar({
      nivelId: req.query.nivel_id,
      diaSemana: req.query.dia_semana,
      activo: req.query.activo,
      limite,
      offset,
    });
    return ok(res, {
      data: filas,
      message: 'Horarios obtenidos',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const horario = await horariosModel.obtenerPorId(req.params.id);
    if (!horario) return fail(res, { message: 'Horario no encontrado', status: 404 });
    return ok(res, { data: horario, message: 'Horario obtenido' });
  } catch (err) {
    next(err);
  }
}

function validarHorario({ nivel_id, dia_semana, hora_inicio, hora_fin }) {
  if (!nivel_id) return 'El nivel es obligatorio';
  if (!dia_semana || !DIAS_VALIDOS.includes(dia_semana)) return 'El día de la semana no es válido';
  if (!hora_inicio || !hora_fin) return 'La hora de inicio y de fin son obligatorias';
  if (hora_fin <= hora_inicio) return 'La hora de fin debe ser posterior a la hora de inicio';
  return null;
}

async function crear(req, res, next) {
  try {
    const errorValidacion = validarHorario(req.body || {});
    if (errorValidacion) return fail(res, { message: errorValidacion, status: 400 });

    const horario = await horariosModel.crear(req.body);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: 'HORARIOS', accion: 'CREATE', entidadId: horario.id, detalle: horario });
    }

    return ok(res, { data: horario, message: 'Horario creado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { anterior, nuevo } = await horariosModel.actualizar(req.params.id, req.body || {});

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: 'HORARIOS', entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Horario actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function toggle(req, res, next) {
  try {
    const actual = await horariosModel.obtenerPorId(req.params.id);
    if (!actual) return fail(res, { message: 'Horario no encontrado', status: 404 });

    const { anterior, nuevo } = await horariosModel.cambiarActivo(req.params.id, !actual.activo);

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: 'HORARIOS', entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: nuevo.activo ? 'Horario activado' : 'Horario desactivado' });
  } catch (err) {
    next(err);
  }
}

// Código QR con la URL de autoregistro de asistencia para este horario.
// El token rota cada `asistenciaToken.INTERVALO_MS`, así que cada llamada
// puede devolver un token distinto: el frontend debe volver a pedir este
// endpoint (polling) para mantener el QR vigente en pantalla.
async function qr(req, res, next) {
  try {
    const horario = await horariosModel.obtenerPorId(req.params.id);
    if (!horario) return fail(res, { message: 'Horario no encontrado', status: 404 });
    if (!horario.activo) return fail(res, { message: 'Este horario está inactivo', status: 400 });

    const { token, expiraEnMs, intervaloMs } = asistenciaToken.generarToken(horario.id);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const url = `${frontendUrl}/asistencia?horario_id=${horario.id}&token=${token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });

    return ok(res, {
      data: {
        horario_id: horario.id,
        token,
        url,
        qr_data_url: qrDataUrl,
        expira_en_ms: expiraEnMs,
        intervalo_ms: intervaloMs,
      },
      message: 'Código QR generado',
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
       WHERE a.modulo = 'HORARIOS' AND a.entidad_id = ?
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [req.params.id]
    );
    return ok(res, { data: rows, message: 'Auditoría del horario' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/horarios/:id — soft-delete (activo = 0)
// Si tiene asistencias activas recientes se rechaza para proteger la integridad.
async function eliminar(req, res, next) {
  try {
    const horario = await horariosModel.obtenerPorId(req.params.id);
    if (!horario) return fail(res, { message: 'Horario no encontrado', status: 404 });

    // Verificar que no tenga asistencias activas en los últimos 60 días
    const [asistencias] = await pool.query(
      `SELECT COUNT(*) AS total FROM asistencias
       WHERE horario_id = ? AND activo = 1 AND fecha >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)`,
      [req.params.id]
    );
    if (asistencias[0].total > 0) {
      return fail(res, {
        message: `Este horario tiene ${asistencias[0].total} asistencias registradas en los últimos 60 días. Desactívalo en lugar de eliminarlo.`,
        status: 409,
      });
    }

    const { anterior, nuevo } = await horariosModel.cambiarActivo(req.params.id, false);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: 'HORARIOS', accion: 'DELETE', entidadId: horario.id, detalle: anterior });
    }

    return ok(res, { data: nuevo, message: 'Horario eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, toggle, qr, auditoria, eliminar };
