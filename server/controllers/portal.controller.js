const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const portalModel = require('../models/portal.model');
const entregasModel = require('../models/entregas.model');

function miembroId(req) {
  return req.usuario?.miembro_id;
}

async function perfil(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });
    const datos = await portalModel.obtenerPerfil(id);
    if (!datos) return fail(res, { message: 'Perfil no encontrado', status: 404 });
    return ok(res, { data: datos, message: 'Perfil obtenido' });
  } catch (err) { next(err); }
}

async function misAsistencias(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });

    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 30 });
    const resultado = await portalModel.obtenerAsistencias(id, {
      fechaDesde: req.query.fecha_desde,
      fechaHasta: req.query.fecha_hasta,
      nivelId: req.query.nivel_id,
      estado: req.query.estado,
      limite,
      offset,
    });
    return ok(res, {
      data: resultado.filas,
      message: 'Asistencias obtenidas',
      pagination: construirPaginacion({ pagina, limite, total: resultado.total }),
    });
  } catch (err) { next(err); }
}

async function misMensualidades(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });

    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 24 });
    const resultado = await portalModel.obtenerMensualidades(id, { limite, offset });
    return ok(res, {
      data: resultado.filas,
      message: 'Mensualidades obtenidas',
      pagination: construirPaginacion({ pagina, limite, total: resultado.total }),
    });
  } catch (err) { next(err); }
}

async function misTareas(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });
    const tareas = await portalModel.obtenerTareas(id);
    return ok(res, { data: tareas, message: 'Tareas obtenidas' });
  } catch (err) { next(err); }
}

async function misGuias(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });
    const guias = await portalModel.obtenerGuias(id);
    return ok(res, { data: guias, message: 'Guías obtenidas' });
  } catch (err) { next(err); }
}

async function entregar(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });

    const { tarea_id, url_evidencia, observaciones } = req.body || {};
    if (!tarea_id) return fail(res, { message: 'tarea_id es obligatorio', status: 400 });

    const entrega = await entregasModel.crearOActualizar({
      tareaId: tarea_id,
      miembroId: id,
      urlEvidencia: url_evidencia,
      observaciones,
    });
    return ok(res, { data: entrega, message: 'Entrega registrada correctamente', status: 201 });
  } catch (err) { next(err); }
}

async function actualizarPerfil(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });

    const datos = req.body || {};
    const perfil = await portalModel.actualizarPerfil(id, datos);
    if (!perfil) return fail(res, { message: 'No se enviaron campos válidos para actualizar', status: 400 });

    return ok(res, { data: perfil, message: 'Perfil actualizado correctamente' });
  } catch (err) { next(err); }
}

async function miPlan(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });
    const planes = await portalModel.obtenerPlanesActivos(id);
    return ok(res, { data: planes, message: 'Planes obtenidos' });
  } catch (err) { next(err); }
}

async function entregarItem(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });

    const { plan_item_id, url_evidencia, observaciones } = req.body || {};
    if (!plan_item_id) return fail(res, { message: 'plan_item_id es obligatorio', status: 400 });

    const entregasModel = require('../models/entregas.model');
    const entrega = await entregasModel.crearOActualizarPlanItem({
      planItemId: plan_item_id,
      miembroId: id,
      urlEvidencia: url_evidencia,
      observaciones,
    });
    return ok(res, { data: entrega, message: 'Entrega registrada correctamente', status: 201 });
  } catch (err) { next(err); }
}

// PATCH /api/portal/entregas/:id — miembro edita su propia entrega (solo antes de fecha_limite)
async function editarEntrega(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });

    const { pool } = require('../config/db');
    const [[entrega]] = await pool.query(
      `SELECT e.id, e.miembro_id, e.tarea_id, e.plan_item_id,
              t.fecha_limite AS tarea_limite,
              pi.fecha_limite AS item_limite
       FROM entregas e
       LEFT JOIN tareas t ON t.id = e.tarea_id
       LEFT JOIN plan_items pi ON pi.id = e.plan_item_id
       WHERE e.id = ?`,
      [req.params.id]
    );
    if (!entrega) return fail(res, { message: 'Entrega no encontrada', status: 404 });
    if (entrega.miembro_id !== id) return fail(res, { message: 'No tienes permiso para editar esta entrega', status: 403 });

    // Verificar que la fecha límite no haya pasado
    const fechaLimite = entrega.item_limite || entrega.tarea_limite;
    if (fechaLimite) {
      const limite = new Date(fechaLimite);
      limite.setHours(23, 59, 59, 999);
      if (new Date() > limite) {
        return fail(res, { message: 'La fecha límite ya pasó, no puedes editar esta entrega', status: 400 });
      }
    }

    const { url_evidencia, observaciones } = req.body || {};
    await pool.query(
      'UPDATE entregas SET url_evidencia = ?, observaciones = ? WHERE id = ?',
      [url_evidencia || null, observaciones || null, entrega.id]
    );
    const [[actualizada]] = await pool.query('SELECT * FROM entregas WHERE id = ?', [entrega.id]);
    return ok(res, { data: actualizada, message: 'Entrega actualizada correctamente' });
  } catch (err) { next(err); }
}

// GET /api/portal/mis-asistencias-full — asistencias reales + ausencias sintéticas por horario
async function misAsistenciasFull(req, res, next) {
  try {
    const id = miembroId(req);
    if (!id) return fail(res, { message: 'No estás vinculado a ningún miembro', status: 403 });

    const { pool } = require('../config/db');
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 20 });

    // 1. Inscripciones activas del miembro
    const [inscripciones] = await pool.query(
      `SELECT mn.nivel_id, mn.created_at AS inscrito_desde, n.nombre AS nivel_nombre
       FROM miembro_niveles mn
       JOIN niveles n ON n.id = mn.nivel_id
       WHERE mn.miembro_id = ? AND mn.activo = 1`,
      [id]
    );

    // 2. fecha_go_live de la configuración
    const [[cfg]] = await pool.query('SELECT fecha_go_live FROM configuracion LIMIT 1');
    const goLive = cfg?.fecha_go_live ? new Date(cfg.fecha_go_live) : null;

    // 3. Asistencias registradas del miembro
    const [asistenciasReales] = await pool.query(
      `SELECT a.fecha, a.estado, a.hora, a.minutos_retraso, n.nombre AS nivel_nombre, a.nivel_id
       FROM asistencias a
       JOIN niveles n ON n.id = a.nivel_id
       WHERE a.miembro_id = ? AND a.activo = 1
       ORDER BY a.fecha DESC`,
      [id]
    );
    // Mapa para lookup rápido: "YYYY-MM-DD_nivelId"
    const mapaReales = new Set(asistenciasReales.map((a) => `${a.fecha}_${a.nivel_id}`));

    const DIA_MAP = { DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6 };
    const toISO = (d) => d.toISOString().slice(0, 10);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    // 4. Para cada inscripción, obtener horarios activos y generar ausencias virtuales
    const ausenciasVirtuales = [];
    for (const insc of inscripciones) {
      const [horarios] = await pool.query(
        'SELECT dia_semana FROM horarios WHERE nivel_id = ? AND activo = 1',
        [insc.nivel_id]
      );
      if (horarios.length === 0) continue;

      const diasClase = new Set(horarios.map((h) => DIA_MAP[h.dia_semana]));
      let desde = new Date(insc.inscrito_desde);
      desde.setHours(0, 0, 0, 0);
      if (goLive && goLive > desde) desde = new Date(goLive);

      const cursor = new Date(desde);
      while (cursor <= hoy) {
        if (diasClase.has(cursor.getDay())) {
          const key = `${toISO(cursor)}_${insc.nivel_id}`;
          if (!mapaReales.has(key)) {
            ausenciasVirtuales.push({
              fecha: toISO(cursor),
              estado: 'AUSENTE',
              hora: null,
              minutos_retraso: 0,
              nivel_nombre: insc.nivel_nombre,
              nivel_id: insc.nivel_id,
              sintetico: true,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    // 5. Unir reales + virtuales, ordenar por fecha DESC
    const todos = [
      ...asistenciasReales.map((a) => ({ ...a, sintetico: false, fecha: a.fecha instanceof Date ? toISO(a.fecha) : String(a.fecha).slice(0, 10) })),
      ...ausenciasVirtuales,
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));

    const total = todos.length;
    const pagina_n = Math.max(1, parseInt(req.query.pagina || req.query.page) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(req.query.limite || req.query.limit) || limite));
    const off = (pagina_n - 1) * lim;
    const pagina_res = todos.slice(off, off + lim);

    // 6. Contadores globales
    const contadores = { A_TIEMPO: 0, TARDE: 0, AUSENTE: 0, total: todos.length };
    todos.forEach((r) => { contadores[r.estado] = (contadores[r.estado] || 0) + 1; });

    return ok(res, {
      data: { registros: pagina_res, contadores },
      message: 'Asistencias obtenidas',
      pagination: { total, page: pagina_n, limit: lim, pages: Math.ceil(total / lim) },
    });
  } catch (err) { next(err); }
}

module.exports = { perfil, misAsistencias, misAsistenciasFull, misMensualidades, misTareas, misGuias, entregar, actualizarPerfil, miPlan, entregarItem, editarEntrega };
