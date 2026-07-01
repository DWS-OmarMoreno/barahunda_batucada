const { pool } = require('../config/db');

async function listar() {
  const [rows] = await pool.query(
    'SELECT id, nombre, clave, asunto, cuerpo, variables_disponibles, activo, updated_at FROM plantillas_correo ORDER BY id ASC'
  );
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM plantillas_correo WHERE id = ?', [id]);
  return rows[0] || null;
}

async function obtenerPorClave(clave) {
  const [rows] = await pool.query('SELECT * FROM plantillas_correo WHERE clave = ? LIMIT 1', [clave]);
  return rows[0] || null;
}

async function actualizar(id, { nombre, asunto, cuerpo, activo }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Plantilla no encontrada'), { status: 404 });
  await pool.query(
    'UPDATE plantillas_correo SET nombre = ?, asunto = ?, cuerpo = ?, activo = ? WHERE id = ?',
    [
      nombre !== undefined ? nombre : actual.nombre,
      asunto !== undefined ? asunto : actual.asunto,
      cuerpo !== undefined ? cuerpo : actual.cuerpo,
      activo !== undefined ? (activo ? 1 : 0) : actual.activo,
      id,
    ]
  );
  return obtenerPorId(id);
}

module.exports = { listar, obtenerPorId, obtenerPorClave, actualizar };
