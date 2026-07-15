// Modelo Plan de Estudios
// Gestiona planes, sus ítems (actividades/exámenes) y la lógica de desbloqueo.
const { pool } = require('../config/db');

const pad = (n) => String(n).padStart(2, '0');

// ── Planes ────────────────────────────────────────────────────────────────

async function listar({ nivelId } = {}) {
  const cond = nivelId ? 'WHERE pe.nivel_id = ?' : '';
  const vals = nivelId ? [nivelId] : [];
  const [filas] = await pool.query(
    `SELECT pe.*, n.nombre AS nivel_nombre,
            (SELECT COUNT(*) FROM plan_items pi WHERE pi.plan_id = pe.id AND pi.activo = 1) AS total_items
     FROM planes_estudio pe
     JOIN niveles n ON n.id = pe.nivel_id
     ${cond}
     ORDER BY pe.nivel_id ASC, pe.activo DESC, pe.created_at DESC`,
    vals
  );
  return filas;
}

async function obtenerPorId(id) {
  const [[plan]] = await pool.query(
    `SELECT pe.*, n.nombre AS nivel_nombre
     FROM planes_estudio pe
     JOIN niveles n ON n.id = pe.nivel_id
     WHERE pe.id = ?`,
    [id]
  );
  return plan || null;
}

async function obtenerConItems(id) {
  const plan = await obtenerPorId(id);
  if (!plan) return null;
  const items = await listarItems(id);
  return { ...plan, items };
}

async function crear({ nivelId, nombre, descripcion, tipoCalificacion, notaMinimaAprobacion, fechaInicio, fechaFin }) {
  const [res] = await pool.query(
    `INSERT INTO planes_estudio
       (nivel_id, nombre, descripcion, tipo_calificacion, nota_minima_aprobacion, fecha_inicio, fecha_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nivelId, nombre, descripcion || null, tipoCalificacion,
      tipoCalificacion === 'NUMERICA' ? (notaMinimaAprobacion ?? null) : null,
      fechaInicio || null, fechaFin || null]
  );
  return obtenerConItems(res.insertId);
}

// tipo_calificacion NO se puede editar después de crear.
async function actualizar(id, { nombre, descripcion, notaMinimaAprobacion, fechaInicio, fechaFin }) {
  const plan = await obtenerPorId(id);
  if (!plan) throw Object.assign(new Error('Plan no encontrado'), { status: 404 });
  await pool.query(
    `UPDATE planes_estudio
     SET nombre = ?, descripcion = ?,
         nota_minima_aprobacion = ?,
         fecha_inicio = ?, fecha_fin = ?
     WHERE id = ?`,
    [nombre ?? plan.nombre, descripcion ?? plan.descripcion,
      plan.tipo_calificacion === 'NUMERICA' ? (notaMinimaAprobacion ?? plan.nota_minima_aprobacion) : null,
      fechaInicio ?? plan.fecha_inicio, fechaFin ?? plan.fecha_fin, id]
  );
  return obtenerConItems(id);
}

// Solo un plan activo por nivel a la vez.
async function activar(id) {
  const plan = await obtenerPorId(id);
  if (!plan) throw Object.assign(new Error('Plan no encontrado'), { status: 404 });
  await pool.query('UPDATE planes_estudio SET activo = 0 WHERE nivel_id = ? AND id != ?', [plan.nivel_id, id]);
  await pool.query('UPDATE planes_estudio SET activo = 1 WHERE id = ?', [id]);
  return obtenerConItems(id);
}

async function desactivar(id) {
  await pool.query('UPDATE planes_estudio SET activo = 0 WHERE id = ?', [id]);
  return obtenerConItems(id);
}

// ── Items ─────────────────────────────────────────────────────────────────

async function listarItems(planId) {
  const [filas] = await pool.query(
    `SELECT * FROM plan_items
     WHERE plan_id = ? AND activo = 1
     ORDER BY orden ASC, id ASC`,
    [planId]
  );
  return filas;
}

async function obtenerItem(itemId) {
  const [[item]] = await pool.query('SELECT * FROM plan_items WHERE id = ?', [itemId]);
  return item || null;
}

async function crearItem({ planId, titulo, descripcion, tipo, orden, ponderado, fechaLimite }) {
  const [res] = await pool.query(
    `INSERT INTO plan_items (plan_id, titulo, descripcion, tipo, orden, ponderado, fecha_limite)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [planId, titulo, descripcion || null, tipo || 'ACTIVIDAD',
      orden ?? 0, ponderado ?? null, fechaLimite || null]
  );
  return obtenerItem(res.insertId);
}

async function actualizarItem(itemId, { titulo, descripcion, tipo, orden, ponderado, fechaLimite }) {
  const item = await obtenerItem(itemId);
  if (!item) throw Object.assign(new Error('Ítem no encontrado'), { status: 404 });
  await pool.query(
    `UPDATE plan_items
     SET titulo = ?, descripcion = ?, tipo = ?, orden = ?, ponderado = ?, fecha_limite = ?
     WHERE id = ?`,
    [titulo ?? item.titulo, descripcion ?? item.descripcion,
      tipo ?? item.tipo, orden ?? item.orden,
      ponderado ?? item.ponderado, fechaLimite ?? item.fecha_limite, itemId]
  );
  return obtenerItem(itemId);
}

async function eliminarItem(itemId) {
  const item = await obtenerItem(itemId);
  if (!item) throw Object.assign(new Error('Ítem no encontrado'), { status: 404 });
  await pool.query('UPDATE plan_items SET activo = 0 WHERE id = ?', [itemId]);
  return { id: itemId };
}

// Recibe array [{ id, orden }] y actualiza el orden de todos los ítems del plan.
async function reordenarItems(planId, ordenes) {
  for (const { id, orden } of ordenes) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query('UPDATE plan_items SET orden = ? WHERE id = ? AND plan_id = ?', [orden, id, planId]);
  }
  return listarItems(planId);
}

// ── Lógica de desbloqueo ──────────────────────────────────────────────────

// Un ítem de tipo ACTIVIDAD siempre está desbloqueado.
// Un ítem de tipo EXAMEN se desbloquea cuando todas las ACTIVIDADES
// con orden < este ítem (en el mismo plan) tienen al menos una entrega del miembro.
async function verificarDesbloqueo(planItemId, miembroId) {
  const item = await obtenerItem(planItemId);
  if (!item) throw Object.assign(new Error('Ítem no encontrado'), { status: 404 });
  if (item.tipo === 'ACTIVIDAD') return true;

  // Obtener todas las actividades anteriores en el mismo plan
  const [actividadesPrevias] = await pool.query(
    `SELECT id FROM plan_items
     WHERE plan_id = ? AND tipo = 'ACTIVIDAD' AND orden < ? AND activo = 1`,
    [item.plan_id, item.orden]
  );

  if (actividadesPrevias.length === 0) return true;

  // Verificar que el miembro tenga entrega en cada actividad previa
  const ids = actividadesPrevias.map((a) => a.id);
  const placeholders = ids.map(() => '?').join(', ');
  const [entregadas] = await pool.query(
    `SELECT DISTINCT plan_item_id FROM entregas
     WHERE miembro_id = ? AND plan_item_id IN (${placeholders})`,
    [miembroId, ...ids]
  );

  return entregadas.length === actividadesPrevias.length;
}

// ── Cálculo de nota ───────────────────────────────────────────────────────

async function calcularNota(planId, miembroId) {
  const plan = await obtenerPorId(planId);
  if (!plan) return null;

  const items = await listarItems(planId);
  if (items.length === 0) return { tipo: plan.tipo_calificacion, items: [], resumen: null };

  const ids = items.map((i) => i.id);
  const placeholders = ids.map(() => '?').join(', ');
  const [entregas] = await pool.query(
    `SELECT plan_item_id, calificacion, calificacion_categorica, fecha_entrega
     FROM entregas
     WHERE miembro_id = ? AND plan_item_id IN (${placeholders})`,
    [miembroId, ...ids]
  );

  const porItem = new Map(entregas.map((e) => [e.plan_item_id, e]));

  const itemsConNota = items.map((item) => {
    const entrega = porItem.get(item.id) || null;
    return { ...item, entrega };
  });

  if (plan.tipo_calificacion === 'NUMERICA') {
    const calificados = itemsConNota.filter((i) => i.entrega?.calificacion != null && i.ponderado != null);
    const sumaPonderado = calificados.reduce((s, i) => s + Number(i.ponderado), 0);
    const notaFinal = sumaPonderado > 0
      ? calificados.reduce((s, i) => s + (Number(i.entrega.calificacion) * Number(i.ponderado)), 0) / sumaPonderado * (sumaPonderado / 100)
      : null;
    // Cálculo real: suma(calificacion * ponderado/100)
    const notaCalculada = calificados.reduce((s, i) => s + Number(i.entrega.calificacion) * (Number(i.ponderado) / 100), 0);
    return {
      tipo: 'NUMERICA',
      items: itemsConNota,
      resumen: {
        nota_final: calificados.length > 0 ? Math.round(notaCalculada * 100) / 100 : null,
        nota_minima_aprobacion: plan.nota_minima_aprobacion,
        aprobado: plan.nota_minima_aprobacion != null && notaCalculada >= plan.nota_minima_aprobacion,
        items_calificados: calificados.length,
        total_items: items.length,
      },
    };
  }

  if (plan.tipo_calificacion === 'CATEGORICA') {
    return {
      tipo: 'CATEGORICA',
      items: itemsConNota,
      resumen: {
        excelente: itemsConNota.filter((i) => i.entrega?.calificacion_categorica === 'EXCELENTE').length,
        por_mejorar: itemsConNota.filter((i) => i.entrega?.calificacion_categorica === 'POR_MEJORAR').length,
        sin_entregar: itemsConNota.filter((i) => !i.entrega).length,
        total_items: items.length,
      },
    };
  }

  // SIMPLE
  const entregados = itemsConNota.filter((i) => i.entrega != null).length;
  return {
    tipo: 'SIMPLE',
    items: itemsConNota,
    resumen: {
      entregados,
      total_items: items.length,
      porcentaje: items.length > 0 ? Math.round((entregados / items.length) * 100) : 0,
    },
  };
}

// ── Admin: historial de entregas agrupado por ítem ────────────────────────

async function historialEntregas(planId) {
  const items = await listarItems(planId);

  const resultado = [];
  for (const item of items) {
    const [entregas] = await pool.query( // eslint-disable-line no-await-in-loop
      `SELECT e.id, e.miembro_id, e.url_evidencia, e.observaciones,
              e.fecha_entrega, e.calificacion, e.calificacion_categorica,
              e.retroalimentacion, e.calificado_por, e.fecha_calificacion,
              m.nombres_completos AS miembro_nombre, m.numero_documento,
              u.nombre AS calificado_por_nombre
       FROM entregas e
       JOIN miembros m ON m.id = e.miembro_id
       LEFT JOIN usuarios u ON u.id = e.calificado_por
       WHERE e.plan_item_id = ?
       ORDER BY e.fecha_entrega DESC`,
      [item.id]
    );
    resultado.push({ ...item, entregas });
  }
  return resultado;
}

// ── Admin: reporte de calificaciones ─────────────────────────────────────

async function reporteCalificaciones(planId) {
  const plan = await obtenerPorId(planId);
  if (!plan) throw Object.assign(new Error('Plan no encontrado'), { status: 404 });

  const items = await listarItems(planId);

  // Todos los miembros activos inscritos en el nivel
  const [miembros] = await pool.query(
    `SELECT m.id, m.nombres_completos, m.numero_documento
     FROM miembros m
     JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.nivel_id = ? AND mn.activo = 1
     WHERE m.activo = 1
     ORDER BY m.nombres_completos ASC`,
    [plan.nivel_id]
  );

  if (items.length === 0 || miembros.length === 0) {
    return { plan, items, miembros: [] };
  }

  const itemIds = items.map((i) => i.id);
  const placeholders = itemIds.map(() => '?').join(', ');
  const miembroIds = miembros.map((m) => m.id);
  const placeholdersMiembros = miembroIds.map(() => '?').join(', ');

  const [todasEntregas] = await pool.query(
    `SELECT e.miembro_id, e.plan_item_id, e.calificacion, e.calificacion_categorica, e.fecha_entrega
     FROM entregas e
     WHERE e.plan_item_id IN (${placeholders}) AND e.miembro_id IN (${placeholdersMiembros})`,
    [...itemIds, ...miembroIds]
  );

  const miembrosConNotas = miembros.map((m) => {
    const entregasMiembro = todasEntregas.filter((e) => e.miembro_id === m.id);
    const porItem = new Map(entregasMiembro.map((e) => [e.plan_item_id, e]));

    if (plan.tipo_calificacion === 'NUMERICA') {
      let notaFinal = 0;
      const calificaciones = {};
      for (const item of items) {
        const e = porItem.get(item.id);
        const cal = e?.calificacion != null ? Number(e.calificacion) : null;
        calificaciones[item.id] = cal;
        if (cal != null && item.ponderado != null) {
          notaFinal += cal * (Number(item.ponderado) / 100);
        }
      }
      return {
        ...m,
        calificaciones,
        nota_final: Math.round(notaFinal * 100) / 100,
        aprobado: plan.nota_minima_aprobacion != null ? notaFinal >= plan.nota_minima_aprobacion : null,
      };
    }

    if (plan.tipo_calificacion === 'CATEGORICA') {
      const calificaciones = {};
      for (const item of items) {
        const e = porItem.get(item.id);
        calificaciones[item.id] = e?.calificacion_categorica || null;
      }
      return { ...m, calificaciones };
    }

    // SIMPLE
    const calificaciones = {};
    for (const item of items) {
      calificaciones[item.id] = porItem.has(item.id) ? 'ENTREGADO' : 'NO_ENTREGADO';
    }
    const entregados = Object.values(calificaciones).filter((v) => v === 'ENTREGADO').length;
    return { ...m, calificaciones, porcentaje_entrega: Math.round((entregados / items.length) * 100) };
  });

  return { plan, items, miembros: miembrosConNotas };
}

module.exports = {
  listar, obtenerPorId, obtenerConItems,
  crear, actualizar, activar, desactivar,
  listarItems, obtenerItem, crearItem, actualizarItem, eliminarItem, reordenarItems,
  verificarDesbloqueo, calcularNota,
  historialEntregas, reporteCalificaciones,
};
