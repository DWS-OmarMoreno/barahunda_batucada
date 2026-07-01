const { pool } = require('../config/db');

async function obtenerPorId(id) {
  const [rows] = await pool.query(
    `SELECT e.*, t.titulo AS tarea_titulo, m.nombres_completos AS miembro_nombre,
            u.nombre AS calificado_por_nombre
     FROM entregas e
     JOIN tareas t ON t.id = e.tarea_id
     JOIN miembros m ON m.id = e.miembro_id
     LEFT JOIN usuarios u ON u.id = e.calificado_por
     WHERE e.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function listar({ tareaId, miembroId, calificado, limite, offset }) {
  const condiciones = [];
  const valores = [];
  if (tareaId) { condiciones.push('e.tarea_id = ?'); valores.push(tareaId); }
  if (miembroId) { condiciones.push('e.miembro_id = ?'); valores.push(miembroId); }
  if (calificado === 'true' || calificado === '1') {
    condiciones.push('e.calificacion IS NOT NULL');
  } else if (calificado === 'false' || calificado === '0') {
    condiciones.push('e.calificacion IS NULL');
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT e.id, e.tarea_id, e.miembro_id, e.url_evidencia, e.observaciones,
            e.fecha_entrega, e.calificacion, e.retroalimentacion, e.fecha_calificacion,
            t.titulo AS tarea_titulo, m.nombres_completos AS miembro_nombre,
            u.nombre AS calificado_por_nombre
     FROM entregas e
     JOIN tareas t ON t.id = e.tarea_id
     JOIN miembros m ON m.id = e.miembro_id
     LEFT JOIN usuarios u ON u.id = e.calificado_por
     ${where}
     ORDER BY e.fecha_entrega DESC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM entregas e ${where}`, valores);
  return { filas, total };
}

// INSERT si no existe, UPDATE si ya existe (upsert por tarea+miembro)
async function crearOActualizar({ tareaId, miembroId, urlEvidencia, observaciones }) {
  const [existentes] = await pool.query(
    'SELECT id FROM entregas WHERE tarea_id = ? AND miembro_id = ?',
    [tareaId, miembroId]
  );
  if (existentes.length > 0) {
    await pool.query(
      'UPDATE entregas SET url_evidencia = ?, observaciones = ? WHERE id = ?',
      [urlEvidencia || null, observaciones || null, existentes[0].id]
    );
    return obtenerPorId(existentes[0].id);
  }
  const [res] = await pool.query(
    'INSERT INTO entregas (tarea_id, miembro_id, url_evidencia, observaciones) VALUES (?, ?, ?, ?)',
    [tareaId, miembroId, urlEvidencia || null, observaciones || null]
  );
  return obtenerPorId(res.insertId);
}

async function calificar(id, { calificacion, retroalimentacion, calificadoPor }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Entrega no encontrada'), { status: 404 });
  await pool.query(
    'UPDATE entregas SET calificacion = ?, retroalimentacion = ?, calificado_por = ?, fecha_calificacion = NOW() WHERE id = ?',
    [calificacion, retroalimentacion || null, calificadoPor, id]
  );
  return obtenerPorId(id);
}

module.exports = { obtenerPorId, listar, crearOActualizar, calificar };
