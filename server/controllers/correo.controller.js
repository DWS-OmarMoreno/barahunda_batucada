// Endpoints de envío de correo y gestión de plantillas.
const { ok, fail } = require('../utils/respuesta');
const { enviarConPlantilla } = require('../utils/email');
const plantillaModel = require('../models/plantillaCorreo.model');
const miembrosModel = require('../models/miembros.model');
const tareasModel = require('../models/tareas.model');
const entregasModel = require('../models/entregas.model');
const { pool } = require('../config/db');

// ── Gestión de plantillas ──────────────────────────────────────────────────────

async function listarPlantillas(req, res, next) {
  try {
    const plantillas = await plantillaModel.listar();
    return ok(res, { data: plantillas, message: 'Plantillas obtenidas' });
  } catch (err) { next(err); }
}

async function obtenerPlantilla(req, res, next) {
  try {
    const p = await plantillaModel.obtenerPorId(req.params.id);
    if (!p) return fail(res, { message: 'Plantilla no encontrada', status: 404 });
    return ok(res, { data: p });
  } catch (err) { next(err); }
}

async function actualizarPlantilla(req, res, next) {
  try {
    const { nombre, asunto, cuerpo, activo } = req.body || {};
    const p = await plantillaModel.actualizar(req.params.id, { nombre, asunto, cuerpo, activo });
    return ok(res, { data: p, message: 'Plantilla actualizada' });
  } catch (err) { next(err); }
}

// ── Envíos ────────────────────────────────────────────────────────────────────

// POST /api/correo/bienvenida/:miembroId
async function enviarBienvenida(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.miembroId);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const emailDestino = miembro.email;
    if (!emailDestino) return fail(res, { message: 'El miembro no tiene correo configurado', status: 400 });

    // Obtener nivel(es) del miembro
    const [niveles] = await pool.query(
      `SELECT n.nombre FROM niveles n JOIN miembro_niveles mn ON mn.nivel_id = n.id
       WHERE mn.miembro_id = ? AND mn.activo = 1 LIMIT 3`,
      [miembro.id]
    );
    const nivelNombre = niveles.map((n) => n.nombre).join(', ') || '—';

    await enviarConPlantilla('bienvenida', { email: emailDestino }, {
      nombre: miembro.nombres_completos,
      correo_institucional: miembro.correo_institucional || emailDestino,
      nivel: nivelNombre,
    });
    return ok(res, { data: null, message: `Correo de bienvenida enviado a ${emailDestino}` });
  } catch (err) { next(err); }
}

// POST /api/correo/tarea-asignada/:tareaId  — notifica a todos los miembros del nivel
async function enviarTareaAsignada(req, res, next) {
  try {
    const tarea = await tareasModel.obtenerPorId(req.params.tareaId);
    if (!tarea) return fail(res, { message: 'Tarea no encontrada', status: 404 });

    const miembros = await tareasModel.obtenerMiembrosDelNivel(req.params.tareaId);
    if (!miembros.length) return ok(res, { data: null, message: 'No hay miembros con correo en ese nivel' });

    let enviados = 0;
    const errores = [];
    for (const m of miembros) {
      const email = m.email;
      if (!email) continue;
      try {
        await enviarConPlantilla('tarea_asignada', { email }, {
          nombre: m.nombres_completos,
          titulo_tarea: tarea.titulo,
          fecha_limite: tarea.fecha_limite || 'Sin fecha límite',
          nivel: tarea.nivel_nombre,
        });
        enviados++;
      } catch (e) {
        errores.push({ miembro: m.nombres_completos, error: e.message });
      }
    }
    return ok(res, { data: { enviados, errores }, message: `Notificación enviada a ${enviados} miembro(s)` });
  } catch (err) { next(err); }
}

// POST /api/correo/tarea-calificada/:entregaId
async function enviarTareaCalificada(req, res, next) {
  try {
    const entrega = await entregasModel.obtenerPorId(req.params.entregaId);
    if (!entrega) return fail(res, { message: 'Entrega no encontrada', status: 404 });
    if (entrega.calificacion === null) return fail(res, { message: 'La entrega aún no tiene calificación', status: 400 });

    const miembro = await miembrosModel.obtenerPorId(entrega.miembro_id);
    const email = miembro?.email;
    if (!email) return fail(res, { message: 'El miembro no tiene correo configurado', status: 400 });

    await enviarConPlantilla('tarea_calificada', { email }, {
      nombre: miembro.nombres_completos,
      titulo_tarea: entrega.tarea_titulo,
      calificacion: entrega.calificacion,
      comentario: entrega.retroalimentacion || '—',
    });
    return ok(res, { data: null, message: `Notificación de calificación enviada a ${email}` });
  } catch (err) { next(err); }
}

// POST /api/correo/recordatorio/:miembroId
async function enviarRecordatorio(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.miembroId);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });
    if (miembro.exento_pago) return fail(res, { message: 'El miembro está exento de pago', status: 400 });

    const email = miembro.email;
    if (!email) return fail(res, { message: 'El miembro no tiene correo configurado', status: 400 });

    // Obtener mensualidad configurada
    const [mensualidades] = await pool.query(
      'SELECT valor_mensualidad FROM mensualidades WHERE miembro_id = ? LIMIT 1',
      [miembro.id]
    );
    const valor = mensualidades[0]?.valor_mensualidad || 0;
    const ahora = new Date();
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesPendiente = `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`;

    await enviarConPlantilla('recordatorio_mensual', { email }, {
      nombre: miembro.nombres_completos,
      mes_pendiente: req.body?.mes_pendiente || mesPendiente,
      valor_mensualidad: `$${Number(valor).toLocaleString('es-CO')}`,
    });
    return ok(res, { data: null, message: `Recordatorio enviado a ${email}` });
  } catch (err) { next(err); }
}

module.exports = {
  listarPlantillas, obtenerPlantilla, actualizarPlantilla,
  enviarBienvenida, enviarTareaAsignada, enviarTareaCalificada, enviarRecordatorio,
};
