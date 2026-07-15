const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const tareasModel = require('../models/tareas.model');
const guiasModel = require('../models/guias.model');
const entregasModel = require('../models/entregas.model');

// ─── TAREAS ───────────────────────────────────────────────────────────────────

async function listarTareas(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query);
    const resultado = await tareasModel.listar({
      nivelId: req.query.nivel_id,
      activo: req.query.activo,
      limite,
      offset,
    });
    return ok(res, {
      data: resultado.filas,
      pagination: construirPaginacion({ pagina, limite, total: resultado.total }),
    });
  } catch (err) { next(err); }
}

async function obtenerTarea(req, res, next) {
  try {
    const tarea = await tareasModel.obtenerPorId(req.params.id);
    if (!tarea) return fail(res, { message: 'Tarea no encontrada', status: 404 });
    return ok(res, { data: tarea });
  } catch (err) { next(err); }
}

async function crearTarea(req, res, next) {
  try {
    const { titulo, descripcion, nivel_id, fecha_limite } = req.body || {};
    if (!titulo?.trim()) return fail(res, { message: 'El título es obligatorio', status: 400 });
    if (!nivel_id) return fail(res, { message: 'El nivel es obligatorio', status: 400 });
    const tarea = await tareasModel.crear({ titulo: titulo.trim(), descripcion, nivelId: nivel_id, fechaLimite: fecha_limite });
    return ok(res, { data: tarea, message: 'Tarea creada correctamente', status: 201 });
  } catch (err) { next(err); }
}

async function actualizarTarea(req, res, next) {
  try {
    const { titulo, descripcion, nivel_id, fecha_limite } = req.body || {};
    const { anterior, nuevo } = await tareasModel.actualizar(req.params.id, {
      titulo: titulo?.trim(),
      descripcion,
      nivelId: nivel_id,
      fechaLimite: fecha_limite,
    });
    return ok(res, { data: nuevo, message: 'Tarea actualizada' });
  } catch (err) { next(err); }
}

async function toggleTarea(req, res, next) {
  try {
    const tarea = await tareasModel.obtenerPorId(req.params.id);
    if (!tarea) return fail(res, { message: 'Tarea no encontrada', status: 404 });
    const { nuevo } = await tareasModel.cambiarActivo(req.params.id, !tarea.activo);
    return ok(res, { data: nuevo, message: nuevo.activo ? 'Tarea activada' : 'Tarea desactivada' });
  } catch (err) { next(err); }
}

// ─── GUÍAS ────────────────────────────────────────────────────────────────────

async function listarGuias(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query);
    const resultado = await guiasModel.listar({
      nivelId: req.query.nivel_id,
      tipo: req.query.tipo,
      activo: req.query.activo,
      limite,
      offset,
    });
    return ok(res, {
      data: resultado.filas,
      pagination: construirPaginacion({ pagina, limite, total: resultado.total }),
    });
  } catch (err) { next(err); }
}

async function obtenerGuia(req, res, next) {
  try {
    const guia = await guiasModel.obtenerPorId(req.params.id, true);
    if (!guia) return fail(res, { message: 'Guía no encontrada', status: 404 });
    return ok(res, { data: guia });
  } catch (err) { next(err); }
}

async function crearGuia(req, res, next) {
  try {
    const { titulo, descripcion, nivel_id, tipo, contenido, url_video } = req.body || {};
    if (!titulo?.trim()) return fail(res, { message: 'El título es obligatorio', status: 400 });
    if (!nivel_id) return fail(res, { message: 'El nivel es obligatorio', status: 400 });
    const guia = await guiasModel.crear({ titulo: titulo.trim(), descripcion, nivelId: nivel_id, tipo, contenido, urlVideo: url_video });
    return ok(res, { data: guia, message: 'Guía creada correctamente', status: 201 });
  } catch (err) { next(err); }
}

async function actualizarGuia(req, res, next) {
  try {
    const { titulo, descripcion, nivel_id, tipo, contenido, url_video } = req.body || {};
    const { nuevo } = await guiasModel.actualizar(req.params.id, {
      titulo: titulo?.trim(),
      descripcion,
      nivelId: nivel_id,
      tipo,
      contenido,
      urlVideo: url_video,
    });
    return ok(res, { data: nuevo, message: 'Guía actualizada' });
  } catch (err) { next(err); }
}

async function toggleGuia(req, res, next) {
  try {
    const guia = await guiasModel.obtenerPorId(req.params.id);
    if (!guia) return fail(res, { message: 'Guía no encontrada', status: 404 });
    const { nuevo } = await guiasModel.cambiarActivo(req.params.id, !guia.activo);
    return ok(res, { data: nuevo, message: nuevo.activo ? 'Guía activada' : 'Guía desactivada' });
  } catch (err) { next(err); }
}

// ─── ENTREGAS ─────────────────────────────────────────────────────────────────

async function listarEntregas(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query);
    const resultado = await entregasModel.listar({
      tareaId: req.query.tarea_id,
      miembroId: req.query.miembro_id,
      calificado: req.query.calificado,
      limite,
      offset,
    });
    return ok(res, {
      data: resultado.filas,
      pagination: construirPaginacion({ pagina, limite, total: resultado.total }),
    });
  } catch (err) { next(err); }
}

async function calificarEntrega(req, res, next) {
  try {
    const { calificacion, retroalimentacion } = req.body || {};
    if (calificacion === undefined || calificacion === null) {
      return fail(res, { message: 'La calificación es obligatoria', status: 400 });
    }
    const cal = Number(calificacion);
    if (isNaN(cal) || cal < 0 || cal > 100) {
      return fail(res, { message: 'La calificación debe ser un número entre 0 y 100', status: 400 });
    }
    const entrega = await entregasModel.calificar(req.params.id, {
      calificacion: cal,
      retroalimentacion,
      calificadoPor: req.usuario.id,
    });
    return ok(res, { data: entrega, message: 'Entrega calificada correctamente' });
  } catch (err) { next(err); }
}

// DELETE /api/escuela/entregas/:id — admin elimina cualquier entrega
async function eliminarEntrega(req, res, next) {
  try {
    const { pool } = require('../config/db');
    const [[row]] = await pool.query('SELECT id FROM entregas WHERE id = ?', [req.params.id]);
    if (!row) return fail(res, { message: 'Entrega no encontrada', status: 404 });
    await pool.query('DELETE FROM entregas WHERE id = ?', [req.params.id]);
    return ok(res, { data: null, message: 'Entrega eliminada' });
  } catch (err) { next(err); }
}

// POST /api/escuela/tareas/:id/notificar — genera links WhatsApp o envía email
async function notificarTarea(req, res, next) {
  try {
    const { canal = 'WHATSAPP', nivel_id } = req.body || {};
    const { pool } = require('../config/db');
    const { reemplazarVariables, construirUrlWhatsApp } = require('../utils/whatsapp');
    const emailUtil = require('../utils/email');

    const [[tarea]] = await pool.query(
      'SELECT t.*, n.nombre AS nivel_nombre FROM tareas t JOIN niveles n ON n.id = t.nivel_id WHERE t.id = ?',
      [req.params.id]
    );
    if (!tarea) return fail(res, { message: 'Tarea no encontrada', status: 404 });

    const nivelFiltro = nivel_id || tarea.nivel_id;
    const [miembros] = await pool.query(
      `SELECT m.id, m.nombres_completos, m.whatsapp, m.email
       FROM miembros m
       JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.nivel_id = ? AND mn.activo = 1
       WHERE m.activo = 1`,
      [nivelFiltro]
    );

    const mensaje = `Hola {nombre}, tienes una nueva tarea: "${tarea.titulo}"${tarea.fecha_limite ? ` (fecha límite: ${tarea.fecha_limite.toISOString?.().slice(0, 10) ?? tarea.fecha_limite})` : ''}. ¡Mucho éxito!`;

    const destinatarios = miembros.map((m) => {
      const texto = reemplazarVariables(mensaje, { nombre: m.nombres_completos });
      return {
        miembro_id: m.id,
        nombre: m.nombres_completos,
        whatsapp: m.whatsapp,
        email: m.email,
        mensaje: texto,
        url_whatsapp: (canal === 'WHATSAPP' || canal === 'AMBOS') && m.whatsapp
          ? construirUrlWhatsApp(m.whatsapp, texto)
          : null,
      };
    });

    if (canal === 'EMAIL' || canal === 'AMBOS') {
      for (const d of destinatarios) {
        if (d.email) {
          await emailUtil.enviarConPlantilla('notificacion_general', { email: d.email, nombre: d.nombre }, {
            titulo: tarea.titulo,
            descripcion: tarea.descripcion || '',
            fecha_limite: tarea.fecha_limite ? String(tarea.fecha_limite).slice(0, 10) : 'Sin fecha límite',
          }).catch(() => {});
        }
      }
    }

    return ok(res, { data: destinatarios, message: `Notificación generada para ${destinatarios.length} miembros` });
  } catch (err) { next(err); }
}

module.exports = {
  listarTareas, obtenerTarea, crearTarea, actualizarTarea, toggleTarea,
  listarGuias, obtenerGuia, crearGuia, actualizarGuia, toggleGuia,
  listarEntregas, calificarEntrega, eliminarEntrega, notificarTarea,
};
