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

module.exports = { perfil, misAsistencias, misMensualidades, misTareas, entregar };
