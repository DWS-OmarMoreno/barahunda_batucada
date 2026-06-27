const { pool } = require('../config/db');

async function listarActivos() {
  const [rows] = await pool.query('SELECT * FROM instrumentos WHERE activo = 1 ORDER BY nombre ASC');
  return rows;
}

module.exports = { listarActivos };
