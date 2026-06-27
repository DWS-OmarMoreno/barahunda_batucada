const { pool } = require('../config/db');

async function listar({ busqueda = '', activo, limite, offset }) {
  const condiciones = [];
  const valores = [];

  if (busqueda) {
    condiciones.push('n.nombre LIKE ?');
    valores.push(`%${busqueda}%`);
  }
  if (activo === '0' || activo === '1') {
    condiciones.push('n.activo = ?');
    valores.push(activo);
  }

  const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT n.*,
            (SELECT COUNT(*) FROM miembro_niveles mn WHERE mn.nivel_id = n.id AND mn.activo = 1) AS total_miembros
     FROM niveles n
     ${whereSql}
     ORDER BY n.nombre ASC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM niveles n ${whereSql}`, valores);

  return { filas, total };
}

async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM niveles WHERE id = ?', [id]);
  return rows[0] || null;
}

async function obtenerPorNombre(nombre) {
  const [rows] = await pool.query('SELECT * FROM niveles WHERE nombre = ?', [nombre]);
  return rows[0] || null;
}

async function crear({ nombre, descripcion }) {
  const [resultado] = await pool.query('INSERT INTO niveles (nombre, descripcion) VALUES (?, ?)', [
    nombre,
    descripcion || null,
  ]);
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, { nombre, descripcion }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Nivel no encontrado'), { status: 404 });

  await pool.query('UPDATE niveles SET nombre = ?, descripcion = ? WHERE id = ?', [
    nombre ?? actual.nombre,
    descripcion ?? actual.descripcion,
    id,
  ]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function cambiarActivo(id, activo) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Nivel no encontrado'), { status: 404 });

  await pool.query('UPDATE niveles SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function miembrosDelNivel(nivelId) {
  const [rows] = await pool.query(
    `SELECT mn.id AS miembro_nivel_id, mn.progreso, mn.fecha_inicio, mn.activo AS inscripcion_activa,
            m.id AS miembro_id, m.nombres_completos, m.numero_documento, m.whatsapp,
            i.id AS instrumento_id, i.nombre AS instrumento_nombre
     FROM miembro_niveles mn
     JOIN miembros m ON m.id = mn.miembro_id
     JOIN instrumentos i ON i.id = mn.instrumento_id
     WHERE mn.nivel_id = ? AND mn.activo = 1 AND m.activo = 1
     ORDER BY m.nombres_completos ASC`,
    [nivelId]
  );
  return rows;
}

module.exports = {
  listar,
  obtenerPorId,
  obtenerPorNombre,
  crear,
  actualizar,
  cambiarActivo,
  miembrosDelNivel,
};
