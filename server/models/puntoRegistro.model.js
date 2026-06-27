const crypto = require('crypto');
const { pool } = require('../config/db');

function generarToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 caracteres hexadecimales
}

async function obtenerPrincipal() {
  const [rows] = await pool.query(
    'SELECT * FROM puntos_registro WHERE activo = 1 ORDER BY id ASC LIMIT 1'
  );
  return rows[0] || null;
}

async function buscarPorTokenActivo(token) {
  if (!token) return null;
  const [rows] = await pool.query(
    'SELECT * FROM puntos_registro WHERE token = ? AND activo = 1',
    [String(token)]
  );
  return rows[0] || null;
}

async function crear(nombre) {
  const token = generarToken();
  const [resultado] = await pool.query(
    'INSERT INTO puntos_registro (nombre, token) VALUES (?, ?)',
    [nombre || 'Punto de registro principal', token]
  );
  const [rows] = await pool.query('SELECT * FROM puntos_registro WHERE id = ?', [resultado.insertId]);
  return rows[0];
}

// El sistema solo necesita un punto de registro fijo por ahora: si no existe
// ninguno, se crea automáticamente la primera vez que se consulta.
async function obtenerOcrear() {
  const existente = await obtenerPrincipal();
  if (existente) return existente;
  return crear('Punto de registro principal');
}

// Genera un token nuevo para el punto indicado, invalidando el anterior de
// inmediato (cualquier dispositivo que tuviera el enlace viejo deja de poder
// registrar asistencia).
async function regenerarToken(id) {
  const [rowsAntes] = await pool.query('SELECT * FROM puntos_registro WHERE id = ?', [id]);
  const anterior = rowsAntes[0];
  if (!anterior) throw Object.assign(new Error('Punto de registro no encontrado'), { status: 404 });

  const token = generarToken();
  await pool.query('UPDATE puntos_registro SET token = ? WHERE id = ?', [token, id]);
  const [rowsDespues] = await pool.query('SELECT * FROM puntos_registro WHERE id = ?', [id]);
  return { anterior, nuevo: rowsDespues[0] };
}

module.exports = { obtenerPrincipal, obtenerOcrear, buscarPorTokenActivo, crear, regenerarToken };
