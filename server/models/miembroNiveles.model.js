const { pool } = require('../config/db');

async function listarPorMiembro(miembroId) {
  const [rows] = await pool.query(
    `SELECT mn.*, n.nombre AS nivel_nombre, i.nombre AS instrumento_nombre
     FROM miembro_niveles mn
     JOIN niveles n ON n.id = mn.nivel_id
     JOIN instrumentos i ON i.id = mn.instrumento_id
     WHERE mn.miembro_id = ?
     ORDER BY mn.activo DESC, mn.created_at DESC`,
    [miembroId]
  );
  return rows;
}

async function listarActivosPorMiembro(miembroId) {
  const [rows] = await pool.query(
    `SELECT mn.*, n.nombre AS nivel_nombre, i.nombre AS instrumento_nombre
     FROM miembro_niveles mn
     JOIN niveles n ON n.id = mn.nivel_id
     JOIN instrumentos i ON i.id = mn.instrumento_id
     WHERE mn.miembro_id = ? AND mn.activo = 1
     ORDER BY mn.created_at DESC`,
    [miembroId]
  );
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await pool.query(
    `SELECT mn.*, n.nombre AS nivel_nombre, i.nombre AS instrumento_nombre
     FROM miembro_niveles mn
     JOIN niveles n ON n.id = mn.nivel_id
     JOIN instrumentos i ON i.id = mn.instrumento_id
     WHERE mn.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function agregar(miembroId, { nivel_id, instrumento_id, progreso, fecha_inicio }) {
  const [resultado] = await pool.query(
    `INSERT INTO miembro_niveles (miembro_id, nivel_id, instrumento_id, progreso, fecha_inicio)
     VALUES (?, ?, ?, ?, ?)`,
    [miembroId, nivel_id, instrumento_id, progreso || null, fecha_inicio || null]
  );
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, { progreso, fecha_inicio, instrumento_id }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Registro de nivel no encontrado'), { status: 404 });

  await pool.query(
    'UPDATE miembro_niveles SET progreso = ?, fecha_inicio = ?, instrumento_id = ? WHERE id = ?',
    [
      progreso !== undefined ? progreso : actual.progreso,
      fecha_inicio !== undefined ? fecha_inicio : actual.fecha_inicio,
      instrumento_id !== undefined ? instrumento_id : actual.instrumento_id,
      id,
    ]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function quitar(id) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Registro de nivel no encontrado'), { status: 404 });

  await pool.query('UPDATE miembro_niveles SET activo = 0 WHERE id = ?', [id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

// Todas las inscripciones activas (de miembros activos), opcionalmente
// filtradas por miembro y/o nivel. Se usa para sintetizar asistencias
// AUSENTE (cruzar inscripciones x horarios x fechas contra asistencias reales).
async function listarActivosTodos({ miembroId, nivelId } = {}) {
  const condiciones = ['mn.activo = 1', 'm.activo = 1'];
  const valores = [];
  if (miembroId) { condiciones.push('mn.miembro_id = ?'); valores.push(miembroId); }
  if (nivelId) { condiciones.push('mn.nivel_id = ?'); valores.push(nivelId); }

  const [rows] = await pool.query(
    `SELECT mn.miembro_id, mn.nivel_id, mn.fecha_inicio,
            m.nombres_completos AS miembro_nombre, m.numero_documento
     FROM miembro_niveles mn
     JOIN miembros m ON m.id = mn.miembro_id
     WHERE ${condiciones.join(' AND ')}`,
    valores
  );
  return rows;
}

module.exports = {
  listarPorMiembro,
  listarActivosPorMiembro,
  obtenerPorId,
  agregar,
  actualizar,
  quitar,
  listarActivosTodos,
};
