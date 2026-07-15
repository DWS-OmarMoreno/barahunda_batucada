// Queries del portal del miembro (rol MIEMBRO).
// Todas las funciones reciben miembroId y devuelven solo los datos
// que le pertenecen a ese miembro.
const { pool } = require('../config/db');

async function obtenerPerfil(miembroId) {
  const [rows] = await pool.query(
    `SELECT m.*, GROUP_CONCAT(DISTINCT n.nombre ORDER BY n.nombre SEPARATOR ', ') AS niveles_nombres
     FROM miembros m
     LEFT JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.activo = 1
     LEFT JOIN niveles n ON n.id = mn.nivel_id
     WHERE m.id = ?
     GROUP BY m.id`,
    [miembroId]
  );
  return rows[0] || null;
}

async function obtenerAsistencias(miembroId, { fechaDesde, fechaHasta, nivelId, estado, limite, offset }) {
  const condiciones = ['a.miembro_id = ?', 'a.activo = 1'];
  const valores = [miembroId];

  if (fechaDesde) { condiciones.push('a.fecha >= ?'); valores.push(fechaDesde); }
  if (fechaHasta) { condiciones.push('a.fecha <= ?'); valores.push(fechaHasta); }
  if (nivelId) { condiciones.push('a.nivel_id = ?'); valores.push(nivelId); }
  if (estado) { condiciones.push('a.estado = ?'); valores.push(estado); }

  const where = `WHERE ${condiciones.join(' AND ')}`;

  const [filas] = await pool.query(
    `SELECT a.id, a.fecha, a.hora, a.estado, a.minutos_retraso, a.modificado_manualmente,
            n.nombre AS nivel_nombre
     FROM asistencias a
     JOIN niveles n ON n.id = a.nivel_id
     ${where}
     ORDER BY a.fecha DESC, a.hora DESC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM asistencias a ${where}`,
    valores
  );
  return { filas, total };
}

async function obtenerMensualidades(miembroId, { limite, offset }) {
  const [filas] = await pool.query(
    `SELECT p.id, p.mes_correspondiente, p.anio_correspondiente, p.valor,
            p.fecha_pago, p.observaciones, p.soporte_url,
            ms.valor_mensualidad AS mensualidad_configurada
     FROM pagos p
     LEFT JOIN mensualidades ms ON ms.miembro_id = p.miembro_id
     WHERE p.miembro_id = ? AND p.activo = 1
     ORDER BY p.anio_correspondiente DESC, p.mes_correspondiente DESC
     LIMIT ? OFFSET ?`,
    [miembroId, limite, offset]
  );
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM pagos WHERE miembro_id = ? AND activo = 1',
    [miembroId]
  );
  return { filas, total };
}

async function obtenerGuias(miembroId) {
  // Guías activas de todos los niveles a los que pertenece el miembro
  const [filas] = await pool.query(
    `SELECT g.id, g.titulo, g.descripcion, g.tipo, g.url_video, g.contenido, g.created_at,
            n.id AS nivel_id, n.nombre AS nivel_nombre
     FROM guias g
     JOIN niveles n ON n.id = g.nivel_id
     JOIN miembro_niveles mn ON mn.nivel_id = g.nivel_id AND mn.miembro_id = ? AND mn.activo = 1
     WHERE g.activo = 1
     ORDER BY n.nombre ASC, g.created_at DESC`,
    [miembroId]
  );
  return filas;
}

async function obtenerTareas(miembroId) {
  // Tareas del nivel activo del miembro, con su entrega (si existe)
  const [filas] = await pool.query(
    `SELECT t.id, t.titulo, t.descripcion, t.fecha_limite,
            n.nombre AS nivel_nombre,
            e.id AS entrega_id, e.url_evidencia, e.observaciones AS entrega_observaciones,
            e.fecha_entrega, e.calificacion, e.retroalimentacion
     FROM tareas t
     JOIN niveles n ON n.id = t.nivel_id
     JOIN miembro_niveles mn ON mn.nivel_id = t.nivel_id AND mn.miembro_id = ? AND mn.activo = 1
     LEFT JOIN entregas e ON e.tarea_id = t.id AND e.miembro_id = ?
     WHERE t.activo = 1
     ORDER BY t.fecha_limite IS NULL ASC, t.fecha_limite ASC, t.created_at DESC`,
    [miembroId, miembroId]
  );
  return filas;
}

// Campos que el miembro puede editar desde su portal.
// correo_institucional, numero_documento, tipo_documento, exento_pago y
// asistencia_obligatoria son campos de gestión exclusiva del administrador.
const CAMPOS_EDITABLES = [
  'nombres_completos', 'whatsapp', 'email',
  'fecha_nacimiento', 'direccion', 'tipo_sangre', 'eps',
  'padece_enfermedad', 'enfermedad_cual',
  'sufre_alergia', 'alergia_cual',
  'toma_medicamentos', 'medicamentos_cuales',
  'restricciones_fisicas',
];

// Columnas TINYINT(1) — deben enviarse como 0 o 1, no como cadena.
const CAMPOS_BOOLEANOS = new Set(['padece_enfermedad', 'sufre_alergia', 'toma_medicamentos']);

async function actualizarPerfil(miembroId, datos) {
  const sets = [];
  const valores = [];

  for (const campo of CAMPOS_EDITABLES) {
    if (Object.prototype.hasOwnProperty.call(datos, campo)) {
      sets.push(`${campo} = ?`);
      const val = CAMPOS_BOOLEANOS.has(campo)
        ? (datos[campo] ? 1 : 0)
        : (datos[campo] ?? null);
      valores.push(val);
    }
  }

  if (sets.length === 0) return null;

  valores.push(miembroId);
  await pool.query(
    `UPDATE miembros SET ${sets.join(', ')} WHERE id = ?`,
    valores
  );

  return obtenerPerfil(miembroId);
}

// ── Plan de estudios activo del miembro ──────────────────────────────────

async function obtenerPlanesActivos(miembroId) {
  const planesModel = require('./planesEstudio.model');

  const [inscripciones] = await pool.query(
    `SELECT mn.nivel_id, n.nombre AS nivel_nombre
     FROM miembro_niveles mn
     JOIN niveles n ON n.id = mn.nivel_id
     WHERE mn.miembro_id = ? AND mn.activo = 1`,
    [miembroId]
  );
  if (inscripciones.length === 0) return [];

  const resultado = [];

  for (const insc of inscripciones) {
    // eslint-disable-next-line no-await-in-loop
    const [[plan]] = await pool.query(
      `SELECT * FROM planes_estudio WHERE nivel_id = ? AND activo = 1 LIMIT 1`,
      [insc.nivel_id]
    );
    if (!plan) continue;

    // eslint-disable-next-line no-await-in-loop
    const secciones = await planesModel.listarSecciones(plan.id);

    if (secciones.length === 0) {
      resultado.push({ ...plan, nivel_nombre: insc.nivel_nombre, secciones: [], total_items: 0, items_entregados: 0 });
      continue;
    }

    const todosItems = secciones.flatMap((s) => s.items);
    if (todosItems.length === 0) {
      resultado.push({ ...plan, nivel_nombre: insc.nivel_nombre, secciones, total_items: 0, items_entregados: 0 });
      continue;
    }

    const ids = todosItems.map((i) => i.id);
    const ph = ids.map(() => '?').join(', ');

    // eslint-disable-next-line no-await-in-loop
    const [entregas] = await pool.query(
      `SELECT plan_item_id, calificacion, calificacion_categorica, fecha_entrega,
              url_evidencia, observaciones, retroalimentacion
       FROM entregas
       WHERE miembro_id = ? AND plan_item_id IN (${ph})`,
      [miembroId, ...ids]
    );
    const porItem = new Map(entregas.map((e) => [e.plan_item_id, e]));

    const seccionesConEstado = [];
    for (const sec of secciones) {
      const itemsConEstado = [];
      for (const item of sec.items) {
        const entrega = porItem.get(item.id) || null;
        let desbloqueado = true;
        if (item.tipo === 'EXAMEN') {
          // eslint-disable-next-line no-await-in-loop
          desbloqueado = await planesModel.verificarDesbloqueo(item.id, miembroId);
        }
        itemsConEstado.push({ ...item, entrega, desbloqueado });
      }
      const itemsEntregados = itemsConEstado.filter((i) => i.entrega).length;
      seccionesConEstado.push({ ...sec, items: itemsConEstado, total_items: itemsConEstado.length, items_entregados: itemsEntregados });
    }

    const entregadosGlobal = seccionesConEstado.reduce((s, sec) => s + sec.items_entregados, 0);
    resultado.push({
      ...plan,
      nivel_nombre: insc.nivel_nombre,
      secciones: seccionesConEstado,
      total_items: todosItems.length,
      items_entregados: entregadosGlobal,
    });
  }

  return resultado;
}

module.exports = { obtenerPerfil, obtenerAsistencias, obtenerMensualidades, obtenerTareas, obtenerGuias, actualizarPerfil, obtenerPlanesActivos };
