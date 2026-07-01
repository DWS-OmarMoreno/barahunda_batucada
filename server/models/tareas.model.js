const { pool } = require('../config/db');

async function listar({ nivelId, activo, limite, offset }) {
  const condiciones = [];
  const valores = [];
  if (nivelId) { condiciones.push('t.nivel_id = ?'); valores.push(nivelId); }
  if (activo === '0' || activo === '1') { condiciones.push('t.activo = ?'); valores.push(Number(activo)); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT t.*, n.nombre AS nivel_nombre
     FROM tareas t
     JOIN niveles n ON n.id = t.nivel_id
     ${where}
     ORDER BY t.fecha_limite IS NULL ASC, t.fecha_limite ASC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM tareas t ${where}`, valores);
  return { filas, total };
}

async function obtenerPorId(id) {
  const [rows] = await pool.query(
    `SELECT t.*, n.nombre AS nivel_nombre FROM tareas t JOIN niveles n ON n.id = t.nivel_id WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function crear({ titulo, descripcion, nivelId, fechaLimite }) {
  const [res] = await pool.query(
    'INSERT INTO tareas (titulo, descripcion, nivel_id, fecha_limite) VALUES (?, ?, ?, ?)',
    [titulo, descripcion || null, nivelId, fechaLimite || null]
  );
  return obtenerPorId(res.insertId);
}

async function actualizar(id, { titulo, descripcion, nivelId, fechaLimite }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });
  await pool.query(
    'UPDATE tareas SET titulo = ?, descripcion = ?, nivel_id = ?, fecha_limite = ? WHERE id = ?',
    [
      titulo !== undefined ? titulo : actual.titulo,
      descripcion !== undefined ? descripcion : actual.descripcion,
      nivelId !== undefined ? nivelId : actual.nivel_id,
      fechaLimite !== undefined ? (fechaLimite || null) : actual.fecha_limite,
      id,
    ]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function cambiarActivo(id, activo) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Tarea no encontrada'), { status: 404 });
  await pool.query('UPDATE tareas SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

// IDs de miembros inscritos en el nivel de la tarea (para enviar notificaciones)
async function obtenerMiembrosDelNivel(tareaId) {
  const [rows] = await pool.query(
    `SELECT m.id, m.nombres_completos, m.email, m.correo_institucional
     FROM miembros m
     JOIN miembro_niveles mn ON mn.miembro_id = m.id
     JOIN tareas t ON t.nivel_id = mn.nivel_id
     WHERE t.id = ? AND mn.activo = 1 AND m.activo = 1`,
    [tareaId]
  );
  return rows;
}

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarActivo, obtenerMiembrosDelNivel };
