// Modelo Plan de Estudios
// Jerarquía: Plan → Secciones → Ítems (ACTIVIDAD / EXAMEN)
const { pool } = require('../config/db');

// ── Planes ────────────────────────────────────────────────────────────────

async function listar({ nivelId } = {}) {
  const cond = nivelId ? 'WHERE pe.nivel_id = ?' : '';
  const vals = nivelId ? [nivelId] : [];
  const [filas] = await pool.query(
    `SELECT pe.*, n.nombre AS nivel_nombre,
            (SELECT COUNT(*) FROM plan_secciones ps WHERE ps.plan_id = pe.id AND ps.activo = 1) AS total_secciones,
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
  const secciones = await listarSecciones(id);
  return { ...plan, secciones };
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

async function actualizar(id, { nombre, descripcion, notaMinimaAprobacion, fechaInicio, fechaFin }) {
  const plan = await obtenerPorId(id);
  if (!plan) throw Object.assign(new Error('Plan no encontrado'), { status: 404 });
  await pool.query(
    `UPDATE planes_estudio
     SET nombre = ?, descripcion = ?, nota_minima_aprobacion = ?, fecha_inicio = ?, fecha_fin = ?
     WHERE id = ?`,
    [nombre ?? plan.nombre, descripcion ?? plan.descripcion,
      plan.tipo_calificacion === 'NUMERICA' ? (notaMinimaAprobacion ?? plan.nota_minima_aprobacion) : null,
      fechaInicio ?? plan.fecha_inicio, fechaFin ?? plan.fecha_fin, id]
  );
  return obtenerConItems(id);
}

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

// ── Secciones ─────────────────────────────────────────────────────────────

async function listarSecciones(planId) {
  const [secciones] = await pool.query(
    `SELECT * FROM plan_secciones WHERE plan_id = ? AND activo = 1 ORDER BY orden ASC, id ASC`,
    [planId]
  );
  if (secciones.length === 0) return [];

  const [items] = await pool.query(
    `SELECT * FROM plan_items
     WHERE plan_id = ? AND activo = 1 AND seccion_id IS NOT NULL
     ORDER BY seccion_id ASC, orden ASC, id ASC`,
    [planId]
  );

  const mapa = new Map(secciones.map((s) => [s.id, { ...s, items: [] }]));
  for (const item of items) {
    if (mapa.has(item.seccion_id)) mapa.get(item.seccion_id).items.push(item);
  }
  return [...mapa.values()];
}

async function obtenerSeccion(seccionId) {
  const [[s]] = await pool.query('SELECT * FROM plan_secciones WHERE id = ?', [seccionId]);
  return s || null;
}

async function crearSeccion({ planId, nombre }) {
  const [[{ maxOrden }]] = await pool.query(
    'SELECT COALESCE(MAX(orden), 0) AS maxOrden FROM plan_secciones WHERE plan_id = ? AND activo = 1',
    [planId]
  );
  const [res] = await pool.query(
    'INSERT INTO plan_secciones (plan_id, nombre, orden) VALUES (?, ?, ?)',
    [planId, nombre || 'Nueva sección', maxOrden + 1]
  );
  const [[sec]] = await pool.query('SELECT * FROM plan_secciones WHERE id = ?', [res.insertId]);
  return { ...sec, items: [] };
}

async function actualizarSeccion(seccionId, { nombre }) {
  const sec = await obtenerSeccion(seccionId);
  if (!sec) throw Object.assign(new Error('Sección no encontrada'), { status: 404 });
  await pool.query('UPDATE plan_secciones SET nombre = ? WHERE id = ?', [nombre ?? sec.nombre, seccionId]);
  return obtenerSeccion(seccionId);
}

async function eliminarSeccion(seccionId) {
  await pool.query('UPDATE plan_items SET activo = 0 WHERE seccion_id = ?', [seccionId]);
  await pool.query('UPDATE plan_secciones SET activo = 0 WHERE id = ?', [seccionId]);
  return { id: seccionId };
}

async function reordenarSecciones(planId, ordenes) {
  for (const { id, orden } of ordenes) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(
      'UPDATE plan_secciones SET orden = ? WHERE id = ? AND plan_id = ?',
      [orden, id, planId]
    );
  }
  return listarSecciones(planId);
}

// ── Ítems ─────────────────────────────────────────────────────────────────

async function listarItems(planId) {
  const [filas] = await pool.query(
    `SELECT pi.*, ps.nombre AS seccion_nombre, ps.orden AS seccion_orden
     FROM plan_items pi
     LEFT JOIN plan_secciones ps ON ps.id = pi.seccion_id
     WHERE pi.plan_id = ? AND pi.activo = 1
     ORDER BY ps.orden ASC, pi.orden ASC, pi.id ASC`,
    [planId]
  );
  return filas;
}

async function obtenerItem(itemId) {
  const [[item]] = await pool.query('SELECT * FROM plan_items WHERE id = ?', [itemId]);
  return item || null;
}

async function crearItem({ planId, seccionId, titulo, descripcion, tipo, ponderado, fechaLimite }) {
  // Auto-asignar orden dentro de la sección (o plan si sin sección)
  let maxRow;
  if (seccionId) {
    [[maxRow]] = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) AS maxOrden FROM plan_items WHERE seccion_id = ? AND activo = 1',
      [seccionId]
    );
  } else {
    [[maxRow]] = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) AS maxOrden FROM plan_items WHERE plan_id = ? AND seccion_id IS NULL AND activo = 1',
      [planId]
    );
  }
  const orden = maxRow.maxOrden + 1;

  const [res] = await pool.query(
    `INSERT INTO plan_items (plan_id, seccion_id, titulo, descripcion, tipo, orden, ponderado, fecha_limite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [planId, seccionId || null, titulo, descripcion || null,
      tipo || 'ACTIVIDAD', orden, ponderado ?? null, fechaLimite || null]
  );
  return obtenerItem(res.insertId);
}

async function actualizarItem(itemId, { titulo, descripcion, tipo, seccionId, ponderado, fechaLimite }) {
  const item = await obtenerItem(itemId);
  if (!item) throw Object.assign(new Error('Ítem no encontrado'), { status: 404 });
  await pool.query(
    `UPDATE plan_items
     SET titulo = ?, descripcion = ?, tipo = ?, seccion_id = ?, ponderado = ?, fecha_limite = ?
     WHERE id = ?`,
    [titulo ?? item.titulo,
      descripcion !== undefined ? (descripcion || null) : item.descripcion,
      tipo ?? item.tipo,
      seccionId !== undefined ? (seccionId || null) : item.seccion_id,
      ponderado !== undefined ? (ponderado ?? null) : item.ponderado,
      fechaLimite !== undefined ? (fechaLimite || null) : item.fecha_limite,
      itemId]
  );
  return obtenerItem(itemId);
}

async function eliminarItem(itemId) {
  const item = await obtenerItem(itemId);
  if (!item) throw Object.assign(new Error('Ítem no encontrado'), { status: 404 });
  await pool.query('UPDATE plan_items SET activo = 0 WHERE id = ?', [itemId]);
  return { id: itemId };
}

// Recibe [{ id, orden }] — IDs deben pertenecer al plan.
async function reordenarItems(planId, ordenes) {
  for (const { id, orden } of ordenes) {
    // eslint-disable-next-line no-await-in-loop
    await pool.query(
      'UPDATE plan_items SET orden = ? WHERE id = ? AND plan_id = ?',
      [orden, id, planId]
    );
  }
  return listarSecciones(planId);
}

// ── Lógica de desbloqueo ──────────────────────────────────────────────────
// ACTIVIDAD → siempre desbloqueada.
// EXAMEN    → desbloqueado cuando todas las ACTIVIDADs de la misma sección
//             con orden < este ítem tienen al menos una entrega del miembro.
async function verificarDesbloqueo(planItemId, miembroId) {
  const item = await obtenerItem(planItemId);
  if (!item) throw Object.assign(new Error('Ítem no encontrado'), { status: 404 });
  if (item.tipo === 'ACTIVIDAD') return true;

  let actividadesPrevias;
  if (item.seccion_id) {
    [actividadesPrevias] = await pool.query(
      `SELECT id FROM plan_items
       WHERE seccion_id = ? AND tipo = 'ACTIVIDAD' AND orden < ? AND activo = 1`,
      [item.seccion_id, item.orden]
    );
  } else {
    [actividadesPrevias] = await pool.query(
      `SELECT id FROM plan_items
       WHERE plan_id = ? AND seccion_id IS NULL AND tipo = 'ACTIVIDAD' AND orden < ? AND activo = 1`,
      [item.plan_id, item.orden]
    );
  }

  if (actividadesPrevias.length === 0) return true;

  const ids = actividadesPrevias.map((a) => a.id);
  const ph = ids.map(() => '?').join(', ');
  const [entregadas] = await pool.query(
    `SELECT DISTINCT plan_item_id FROM entregas
     WHERE miembro_id = ? AND plan_item_id IN (${ph})`,
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
  const ph = ids.map(() => '?').join(', ');
  const [entregas] = await pool.query(
    `SELECT plan_item_id, calificacion, calificacion_categorica, fecha_entrega
     FROM entregas WHERE miembro_id = ? AND plan_item_id IN (${ph})`,
    [miembroId, ...ids]
  );
  const porItem = new Map(entregas.map((e) => [e.plan_item_id, e]));
  const itemsConNota = items.map((item) => ({ ...item, entrega: porItem.get(item.id) || null }));

  if (plan.tipo_calificacion === 'NUMERICA') {
    const calificados = itemsConNota.filter((i) => i.entrega?.calificacion != null && i.ponderado != null);
    const notaCalc = calificados.reduce((s, i) => s + Number(i.entrega.calificacion) * (Number(i.ponderado) / 100), 0);
    return {
      tipo: 'NUMERICA', items: itemsConNota,
      resumen: {
        nota_final: calificados.length > 0 ? Math.round(notaCalc * 100) / 100 : null,
        nota_minima_aprobacion: plan.nota_minima_aprobacion,
        aprobado: plan.nota_minima_aprobacion != null && notaCalc >= plan.nota_minima_aprobacion,
        items_calificados: calificados.length,
        total_items: items.length,
      },
    };
  }

  if (plan.tipo_calificacion === 'CATEGORICA') {
    return {
      tipo: 'CATEGORICA', items: itemsConNota,
      resumen: {
        excelente: itemsConNota.filter((i) => i.entrega?.calificacion_categorica === 'EXCELENTE').length,
        por_mejorar: itemsConNota.filter((i) => i.entrega?.calificacion_categorica === 'POR_MEJORAR').length,
        sin_entregar: itemsConNota.filter((i) => !i.entrega).length,
        total_items: items.length,
      },
    };
  }

  const entregados = itemsConNota.filter((i) => i.entrega != null).length;
  return {
    tipo: 'SIMPLE', items: itemsConNota,
    resumen: { entregados, total_items: items.length, porcentaje: items.length > 0 ? Math.round((entregados / items.length) * 100) : 0 },
  };
}

// ── Historial: sección > ítem > entregas ──────────────────────────────────

async function historialEntregas(planId) {
  const secciones = await listarSecciones(planId);
  const resultado = [];
  for (const sec of secciones) {
    const itemsConEntregas = [];
    for (const item of sec.items) {
      // eslint-disable-next-line no-await-in-loop
      const [entregas] = await pool.query(
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
      itemsConEntregas.push({ ...item, entregas });
    }
    resultado.push({ ...sec, items: itemsConEntregas });
  }
  return resultado;
}

// ── Reporte de calificaciones ─────────────────────────────────────────────

async function reporteCalificaciones(planId) {
  const plan = await obtenerPorId(planId);
  if (!plan) throw Object.assign(new Error('Plan no encontrado'), { status: 404 });

  const secciones = await listarSecciones(planId);
  const items = secciones.flatMap((s) => s.items);

  const [miembros] = await pool.query(
    `SELECT m.id, m.nombres_completos, m.numero_documento
     FROM miembros m
     JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.nivel_id = ? AND mn.activo = 1
     WHERE m.activo = 1
     ORDER BY m.nombres_completos ASC`,
    [plan.nivel_id]
  );

  if (items.length === 0 || miembros.length === 0) return { plan, secciones, items, miembros: [] };

  const itemIds = items.map((i) => i.id);
  const miembroIds = miembros.map((m) => m.id);
  const phI = itemIds.map(() => '?').join(', ');
  const phM = miembroIds.map(() => '?').join(', ');

  const [todasEntregas] = await pool.query(
    `SELECT e.miembro_id, e.plan_item_id, e.calificacion, e.calificacion_categorica, e.fecha_entrega
     FROM entregas e
     WHERE e.plan_item_id IN (${phI}) AND e.miembro_id IN (${phM})`,
    [...itemIds, ...miembroIds]
  );

  const miembrosConNotas = miembros.map((m) => {
    const em = todasEntregas.filter((e) => e.miembro_id === m.id);
    const calificaciones = {}; // { [item_id]: valor }

    if (plan.tipo_calificacion === 'NUMERICA') {
      let notaFinal = 0;
      for (const item of items) {
        const e = em.find((x) => x.plan_item_id === item.id);
        const cal = e?.calificacion != null ? Number(e.calificacion) : null;
        calificaciones[item.id] = cal;
        if (cal != null && item.ponderado != null) notaFinal += cal * (Number(item.ponderado) / 100);
      }
      return { ...m, calificaciones, nota_final: Math.round(notaFinal * 100) / 100, aprobado: plan.nota_minima_aprobacion != null ? notaFinal >= plan.nota_minima_aprobacion : null };
    }

    if (plan.tipo_calificacion === 'CATEGORICA') {
      for (const item of items) {
        const e = em.find((x) => x.plan_item_id === item.id);
        calificaciones[item.id] = e?.calificacion_categorica || null;
      }
      return { ...m, calificaciones };
    }

    for (const item of items) {
      calificaciones[item.id] = em.some((x) => x.plan_item_id === item.id) ? 'ENTREGADO' : null;
    }
    const entregados = Object.values(calificaciones).filter(Boolean).length;
    return { ...m, calificaciones, porcentaje_entrega: items.length > 0 ? Math.round((entregados / items.length) * 100) : 0 };
  });

  return { plan, secciones, items, miembros: miembrosConNotas };
}

module.exports = {
  listar, obtenerPorId, obtenerConItems,
  crear, actualizar, activar, desactivar,
  listarSecciones, obtenerSeccion, crearSeccion, actualizarSeccion, eliminarSeccion, reordenarSecciones,
  listarItems, obtenerItem, crearItem, actualizarItem, eliminarItem, reordenarItems,
  verificarDesbloqueo, calcularNota,
  historialEntregas, reporteCalificaciones,
};
