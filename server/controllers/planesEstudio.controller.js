const { ok, fail } = require('../utils/respuesta');
const model = require('../models/planesEstudio.model');
const { generarExcel, generarPdf, enviarArchivo } = require('../utils/exportador');
const { reemplazarVariables, construirUrlWhatsApp } = require('../utils/whatsapp');
const emailUtil = require('../utils/email');

const MODULO = 'PLANES_ESTUDIO';
const ETIQUETAS_CAT = { EXCELENTE: 'Excelente', POR_MEJORAR: 'Por mejorar' };

// ── Planes ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const planes = await model.listar({ nivelId: req.query.nivel_id || undefined });
    return ok(res, { data: planes, message: 'Planes obtenidos' });
  } catch (err) { next(err); }
}

async function obtener(req, res, next) {
  try {
    const plan = await model.obtenerConItems(req.params.id);
    if (!plan) return fail(res, { message: 'Plan no encontrado', status: 404 });
    return ok(res, { data: plan, message: 'Plan obtenido' });
  } catch (err) { next(err); }
}

async function crear(req, res, next) {
  try {
    const { nivel_id, nombre, descripcion, tipo_calificacion, nota_minima_aprobacion, fecha_inicio, fecha_fin } = req.body;
    if (!nivel_id || !nombre || !tipo_calificacion)
      return fail(res, { message: 'nivel_id, nombre y tipo_calificacion son obligatorios', status: 400 });
    if (!['NUMERICA', 'CATEGORICA', 'SIMPLE'].includes(tipo_calificacion))
      return fail(res, { message: 'tipo_calificacion debe ser NUMERICA, CATEGORICA o SIMPLE', status: 400 });
    const plan = await model.crear({ nivelId: nivel_id, nombre, descripcion, tipoCalificacion: tipo_calificacion, notaMinimaAprobacion: nota_minima_aprobacion, fechaInicio: fecha_inicio, fechaFin: fecha_fin });
    if (req.auditoria) await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: plan.id, detalle: { nombre } });
    return ok(res, { data: plan, message: 'Plan creado', status: 201 });
  } catch (err) { next(err); }
}

async function actualizar(req, res, next) {
  try {
    const { nombre, descripcion, nota_minima_aprobacion, fecha_inicio, fecha_fin } = req.body;
    const plan = await model.actualizar(req.params.id, { nombre, descripcion, notaMinimaAprobacion: nota_minima_aprobacion, fechaInicio: fecha_inicio, fechaFin: fecha_fin });
    if (req.auditoria) await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'UPDATE', entidadId: plan.id, detalle: { nombre } });
    return ok(res, { data: plan, message: 'Plan actualizado' });
  } catch (err) { next(err); }
}

async function activar(req, res, next) {
  try {
    const plan = await model.activar(req.params.id);
    if (req.auditoria) await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'ACTIVAR', entidadId: plan.id, detalle: {} });
    return ok(res, { data: plan, message: 'Plan activado. Los otros planes del nivel fueron desactivados.' });
  } catch (err) { next(err); }
}

async function desactivar(req, res, next) {
  try {
    const plan = await model.desactivar(req.params.id);
    if (req.auditoria) await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'DESACTIVAR', entidadId: plan.id, detalle: {} });
    return ok(res, { data: plan, message: 'Plan desactivado' });
  } catch (err) { next(err); }
}

// ── Secciones ─────────────────────────────────────────────────────────────

async function listarSecciones(req, res, next) {
  try {
    const secciones = await model.listarSecciones(req.params.id);
    return ok(res, { data: secciones, message: 'Secciones obtenidas' });
  } catch (err) { next(err); }
}

async function crearSeccion(req, res, next) {
  try {
    const { nombre } = req.body;
    const sec = await model.crearSeccion({ planId: req.params.id, nombre });
    if (req.auditoria) await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE_SECCION', entidadId: sec.id, detalle: { nombre } });
    return ok(res, { data: sec, message: 'Sección creada', status: 201 });
  } catch (err) { next(err); }
}

async function actualizarSeccion(req, res, next) {
  try {
    const { nombre } = req.body;
    const sec = await model.actualizarSeccion(req.params.seccionId, { nombre });
    return ok(res, { data: sec, message: 'Sección actualizada' });
  } catch (err) { next(err); }
}

async function eliminarSeccion(req, res, next) {
  try {
    await model.eliminarSeccion(req.params.seccionId);
    return ok(res, { data: null, message: 'Sección eliminada' });
  } catch (err) { next(err); }
}

async function reordenarSecciones(req, res, next) {
  try {
    const { ordenes } = req.body;
    if (!Array.isArray(ordenes)) return fail(res, { message: 'ordenes debe ser un array', status: 400 });
    const secciones = await model.reordenarSecciones(req.params.id, ordenes);
    return ok(res, { data: secciones, message: 'Secciones reordenadas' });
  } catch (err) { next(err); }
}

// ── Ítems ─────────────────────────────────────────────────────────────────

async function listarItems(req, res, next) {
  try {
    const items = await model.listarItems(req.params.id);
    return ok(res, { data: items, message: 'Ítems obtenidos' });
  } catch (err) { next(err); }
}

async function crearItem(req, res, next) {
  try {
    const { titulo, descripcion, tipo, ponderado, fecha_limite, seccion_id } = req.body;
    if (!titulo) return fail(res, { message: 'El título del ítem es obligatorio', status: 400 });
    // seccionId desde URL (ruta /secciones/:seccionId/items) o desde body
    const seccionId = req.params.seccionId || seccion_id || null;
    const item = await model.crearItem({ planId: req.params.id, seccionId, titulo, descripcion, tipo, ponderado, fechaLimite: fecha_limite });
    if (req.auditoria) await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE_ITEM', entidadId: item.id, detalle: { titulo, tipo } });
    return ok(res, { data: item, message: 'Ítem creado', status: 201 });
  } catch (err) { next(err); }
}

async function actualizarItem(req, res, next) {
  try {
    const { titulo, descripcion, tipo, ponderado, fecha_limite, seccion_id } = req.body;
    const item = await model.actualizarItem(req.params.itemId, { titulo, descripcion, tipo, seccionId: seccion_id, ponderado, fechaLimite: fecha_limite });
    return ok(res, { data: item, message: 'Ítem actualizado' });
  } catch (err) { next(err); }
}

async function eliminarItem(req, res, next) {
  try {
    await model.eliminarItem(req.params.itemId);
    return ok(res, { data: null, message: 'Ítem eliminado' });
  } catch (err) { next(err); }
}

async function reordenarItems(req, res, next) {
  try {
    const { ordenes } = req.body;
    if (!Array.isArray(ordenes)) return fail(res, { message: 'ordenes debe ser un array', status: 400 });
    const secciones = await model.reordenarItems(req.params.id, ordenes);
    return ok(res, { data: secciones, message: 'Ítems reordenados' });
  } catch (err) { next(err); }
}

// ── Historial ─────────────────────────────────────────────────────────────

async function historial(req, res, next) {
  try {
    const plan = await model.obtenerPorId(req.params.id);
    if (!plan) return fail(res, { message: 'Plan no encontrado', status: 404 });
    const secciones = await model.historialEntregas(req.params.id);
    return ok(res, { data: { plan, secciones }, message: 'Historial obtenido' });
  } catch (err) { next(err); }
}

async function calificarEntrega(req, res, next) {
  try {
    const { calificacion, calificacion_categorica, retroalimentacion } = req.body;
    const entregaId = req.params.entregaId;
    const { pool } = require('../config/db');

    const [rows] = await pool.query(
      `SELECT e.*, pi.plan_id FROM entregas e
       JOIN plan_items pi ON pi.id = e.plan_item_id
       WHERE e.id = ?`,
      [entregaId]
    );
    const entrega = rows[0];
    if (!entrega) return fail(res, { message: 'Entrega no encontrada', status: 404 });

    const plan = await model.obtenerPorId(entrega.plan_id);
    if (!plan) return fail(res, { message: 'Plan no encontrado', status: 404 });

    const sets = ['retroalimentacion = ?', 'calificado_por = ?', 'fecha_calificacion = NOW()'];
    const vals = [retroalimentacion || null, req.usuario?.id];

    if (plan.tipo_calificacion === 'NUMERICA') {
      if (calificacion == null) return fail(res, { message: 'calificacion es obligatoria', status: 400 });
      sets.push('calificacion = ?'); vals.push(calificacion);
    } else if (plan.tipo_calificacion === 'CATEGORICA') {
      if (!calificacion_categorica) return fail(res, { message: 'calificacion_categorica es obligatoria', status: 400 });
      sets.push('calificacion_categorica = ?'); vals.push(calificacion_categorica);
    }

    await pool.query(`UPDATE entregas SET ${sets.join(', ')} WHERE id = ?`, [...vals, entregaId]);
    const [[actualizada]] = await pool.query(
      `SELECT e.*, m.nombres_completos AS miembro_nombre FROM entregas e
       JOIN miembros m ON m.id = e.miembro_id WHERE e.id = ?`,
      [entregaId]
    );

    if (req.auditoria) await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CALIFICAR', entidadId: entregaId, detalle: { calificacion, calificacion_categorica } });
    return ok(res, { data: actualizada, message: 'Entrega calificada' });
  } catch (err) { next(err); }
}

// ── Reporte ───────────────────────────────────────────────────────────────

async function reporte(req, res, next) {
  try {
    const datos = await model.reporteCalificaciones(req.params.id);
    const { plan, items, miembros } = datos;
    const formato = String(req.query.formato || '').toLowerCase();

    if (formato === 'excel' || formato === 'pdf') {
      const columnas = [
        { clave: 'nombres_completos', titulo: 'Miembro' },
        { clave: 'numero_documento', titulo: 'Documento' },
        ...items.map((i) => ({
          clave: `item_${i.id}`,
          titulo: `${i.titulo}${plan.tipo_calificacion === 'NUMERICA' ? ` (${i.ponderado}%)` : ''}`,
          render: (f) => {
            const v = f.calificaciones?.[i.id];
            if (v == null) return '—';
            if (plan.tipo_calificacion === 'NUMERICA') return String(v);
            if (plan.tipo_calificacion === 'CATEGORICA') return ETIQUETAS_CAT[v] || v;
            return v === 'ENTREGADO' ? 'Sí' : 'No';
          },
        })),
        ...(plan.tipo_calificacion === 'NUMERICA' ? [
          { clave: 'nota_final', titulo: 'Nota final', render: (f) => f.nota_final ?? '—' },
          { clave: 'aprobado', titulo: 'Estado', render: (f) => (f.aprobado == null ? '—' : f.aprobado ? 'Aprobado' : 'Reprobado') },
        ] : plan.tipo_calificacion === 'SIMPLE' ? [
          { clave: 'porcentaje_entrega', titulo: '% Entregado', render: (f) => `${f.porcentaje_entrega ?? 0}%` },
        ] : []),
      ];
      const filas = miembros.map((m) => ({ ...m }));
      const buffer = formato === 'excel'
        ? generarExcel({ columnas, filas, nombreHoja: 'Reporte' })
        : await generarPdf({ titulo: `Reporte: ${plan.nombre}`, columnas, filas });
      return enviarArchivo(res, { formato, buffer, nombreArchivo: `reporte_${plan.nombre.replace(/\s+/g, '_')}` });
    }

    return ok(res, { data: datos, message: 'Reporte generado' });
  } catch (err) { next(err); }
}

// ── Notificaciones ─────────────────────────────────────────────────────────

// Helper: obtiene miembros del nivel del plan con whatsapp + email
async function _miembrosDelPlan(planId) {
  const { pool } = require('../config/db');
  const [[plan]] = await pool.query(
    'SELECT p.*, n.nombre AS nivel_nombre FROM planes_estudio p JOIN niveles n ON n.id = p.nivel_id WHERE p.id = ?',
    [planId]
  );
  if (!plan) return { plan: null, miembros: [] };
  const [miembros] = await pool.query(
    `SELECT m.id, m.nombres_completos, m.whatsapp, m.email
     FROM miembros m
     JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.nivel_id = ? AND mn.activo = 1
     WHERE m.activo = 1`,
    [plan.nivel_id]
  );
  return { plan, miembros };
}

// POST /:id/notificar — notifica sobre el plan general
async function notificarPlan(req, res, next) {
  try {
    const { canal = 'WHATSAPP' } = req.body || {};
    const { plan, miembros } = await _miembrosDelPlan(req.params.id);
    if (!plan) return fail(res, { message: 'Plan no encontrado', status: 404 });

    const msgTpl = `Hola {nombre}, tienes un plan de estudio activo: "${plan.nombre}" (${plan.nivel_nombre}). ¡Revisa tus actividades pendientes!`;

    const destinatarios = miembros.map((m) => {
      const texto = reemplazarVariables(msgTpl, { nombre: m.nombres_completos });
      return {
        miembro_id: m.id, nombre: m.nombres_completos,
        whatsapp: m.whatsapp, email: m.email, mensaje: texto,
        url_whatsapp: (canal === 'WHATSAPP' || canal === 'AMBOS') && m.whatsapp
          ? construirUrlWhatsApp(m.whatsapp, texto) : null,
      };
    });

    if (canal === 'EMAIL' || canal === 'AMBOS') {
      for (const d of destinatarios) {
        if (d.email) {
          await emailUtil.enviarMensaje(
            { email: d.email, nombre: d.nombre },
            { asunto: `Plan de estudio: ${plan.nombre}`, cuerpo: d.mensaje }
          ).catch(() => {});
        }
      }
    }

    return ok(res, { data: destinatarios, message: `Notificación generada para ${destinatarios.length} miembros` });
  } catch (err) { next(err); }
}

// POST /:id/items/:itemId/notificar — notifica sobre un ítem específico del plan
async function notificarItem(req, res, next) {
  try {
    const { canal = 'WHATSAPP' } = req.body || {};
    const { pool } = require('../config/db');
    const [[item]] = await pool.query(
      'SELECT pi.*, pe.nombre AS plan_nombre, pe.nivel_id FROM plan_items pi JOIN planes_estudio pe ON pe.id = pi.plan_id WHERE pi.id = ?',
      [req.params.itemId]
    );
    if (!item) return fail(res, { message: 'Ítem no encontrado', status: 404 });

    const [miembros] = await pool.query(
      `SELECT m.id, m.nombres_completos, m.whatsapp, m.email
       FROM miembros m
       JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.nivel_id = ? AND mn.activo = 1
       WHERE m.activo = 1`,
      [item.nivel_id]
    );

    const limiteTxt = item.fecha_limite
      ? ` (fecha límite: ${String(item.fecha_limite).slice(0, 10)})`
      : '';
    const msgTpl = `Hola {nombre}, tienes una actividad pendiente: "${item.titulo}"${limiteTxt}. ¡Recuerda entregar a tiempo!`;

    const destinatarios = miembros.map((m) => {
      const texto = reemplazarVariables(msgTpl, { nombre: m.nombres_completos });
      return {
        miembro_id: m.id, nombre: m.nombres_completos,
        whatsapp: m.whatsapp, email: m.email, mensaje: texto,
        url_whatsapp: (canal === 'WHATSAPP' || canal === 'AMBOS') && m.whatsapp
          ? construirUrlWhatsApp(m.whatsapp, texto) : null,
      };
    });

    if (canal === 'EMAIL' || canal === 'AMBOS') {
      for (const d of destinatarios) {
        if (d.email) {
          await emailUtil.enviarMensaje(
            { email: d.email, nombre: d.nombre },
            { asunto: `Actividad: ${item.titulo}`, cuerpo: d.mensaje }
          ).catch(() => {});
        }
      }
    }

    return ok(res, { data: destinatarios, message: `Notificación generada para ${destinatarios.length} miembros` });
  } catch (err) { next(err); }
}

// DELETE /:id/entregas/:entregaId — admin elimina entrega de un plan item
async function eliminarEntrega(req, res, next) {
  try {
    const { pool } = require('../config/db');
    const [[row]] = await pool.query('SELECT id FROM entregas WHERE id = ?', [req.params.entregaId]);
    if (!row) return fail(res, { message: 'Entrega no encontrada', status: 404 });
    await pool.query('DELETE FROM entregas WHERE id = ?', [req.params.entregaId]);
    return ok(res, { data: null, message: 'Entrega eliminada' });
  } catch (err) { next(err); }
}

module.exports = {
  listar, obtener, crear, actualizar, activar, desactivar,
  listarSecciones, crearSeccion, actualizarSeccion, eliminarSeccion, reordenarSecciones,
  listarItems, crearItem, actualizarItem, eliminarItem, reordenarItems,
  historial, calificarEntrega, reporte,
  notificarPlan, notificarItem, eliminarEntrega,
};
