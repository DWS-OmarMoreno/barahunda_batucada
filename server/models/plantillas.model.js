const { pool } = require('../config/db');

async function listar({ busqueda = '', activo, limite, offset }) {
  const condiciones = [];
  const valores = [];

  if (busqueda) {
    condiciones.push('nombre LIKE ?');
    valores.push(`%${busqueda}%`);
  }
  if (activo === '0' || activo === '1') {
    condiciones.push('activo = ?');
    valores.push(activo);
  }

  const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT * FROM plantillas_whatsapp ${whereSql} ORDER BY nombre ASC LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM plantillas_whatsapp ${whereSql}`, valores);

  return { filas, total };
}

async function listarActivas() {
  const [rows] = await pool.query('SELECT * FROM plantillas_whatsapp WHERE activo = 1 ORDER BY nombre ASC');
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM plantillas_whatsapp WHERE id = ?', [id]);
  return rows[0] || null;
}

async function crear({ nombre, contenido }) {
  const [resultado] = await pool.query(
    'INSERT INTO plantillas_whatsapp (nombre, contenido) VALUES (?, ?)',
    [nombre, contenido]
  );
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, { nombre, contenido }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Plantilla no encontrada'), { status: 404 });

  await pool.query('UPDATE plantillas_whatsapp SET nombre = ?, contenido = ? WHERE id = ?', [
    nombre ?? actual.nombre,
    contenido ?? actual.contenido,
    id,
  ]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function eliminar(id) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Plantilla no encontrada'), { status: 404 });

  await pool.query('UPDATE plantillas_whatsapp SET activo = 0 WHERE id = ?', [id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

module.exports = { listar, listarActivas, obtenerPorId, crear, actualizar, eliminar };
