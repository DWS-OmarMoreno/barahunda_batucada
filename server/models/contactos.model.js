const { pool } = require('../config/db');

async function listarPorMiembro(miembroId) {
  const [rows] = await pool.query(
    'SELECT * FROM contactos_emergencia WHERE miembro_id = ? AND activo = 1 ORDER BY created_at ASC',
    [miembroId]
  );
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM contactos_emergencia WHERE id = ?', [id]);
  return rows[0] || null;
}

async function agregar(miembroId, { nombre, parentesco, telefono }) {
  const [resultado] = await pool.query(
    'INSERT INTO contactos_emergencia (miembro_id, nombre, parentesco, telefono) VALUES (?, ?, ?, ?)',
    [miembroId, nombre, parentesco || null, telefono]
  );
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, { nombre, parentesco, telefono }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Contacto no encontrado'), { status: 404 });

  await pool.query(
    'UPDATE contactos_emergencia SET nombre = ?, parentesco = ?, telefono = ? WHERE id = ?',
    [
      nombre ?? actual.nombre,
      parentesco !== undefined ? parentesco : actual.parentesco,
      telefono ?? actual.telefono,
      id,
    ]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function eliminar(id) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Contacto no encontrado'), { status: 404 });

  await pool.query('UPDATE contactos_emergencia SET activo = 0 WHERE id = ?', [id]);
  return actual;
}

module.exports = { listarPorMiembro, obtenerPorId, agregar, actualizar, eliminar };
