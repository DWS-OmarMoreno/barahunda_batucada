const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function buscarPorEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, password_hash, rol, miembro_id, activo FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function buscarPorId(id) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, rol, miembro_id, activo, created_at, updated_at FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

// ---------------------------------------------------------------------
// CRUD administrativo (módulo Usuarios / Administradores).
// Las consultas de este bloque nunca seleccionan password_hash: la
// contraseña solo se lee en buscarPorEmail (login) y se escribe a través
// de crear()/cambiarPassword(), nunca se expone en una respuesta.
// ---------------------------------------------------------------------

async function listar({ busqueda = '', activo, limite, offset }) {
  const condiciones = [];
  const valores = [];

  if (busqueda) {
    condiciones.push('(nombre LIKE ? OR email LIKE ?)');
    valores.push(`%${busqueda}%`, `%${busqueda}%`);
  }
  if (activo === '0' || activo === '1' || activo === 0 || activo === 1) {
    condiciones.push('activo = ?');
    valores.push(Number(activo));
  }

  const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT id, nombre, email, rol, activo, created_at, updated_at
     FROM usuarios
     ${whereSql}
     ORDER BY nombre ASC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios ${whereSql}`,
    valores
  );

  return { filas, total: Number(total) };
}

// Cuenta administradores activos, opcionalmente excluyendo un id — se usa
// para impedir que se desactive/elimine al último administrador disponible.
async function contarActivos(excluirId) {
  const condiciones = ['activo = 1'];
  const valores = [];
  if (excluirId) {
    condiciones.push('id != ?');
    valores.push(excluirId);
  }
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios WHERE ${condiciones.join(' AND ')}`,
    valores
  );
  return Number(total);
}

async function crear({ nombre, email, password, rol, miembro_id }) {
  const password_hash = await bcrypt.hash(password, 10);
  const [resultado] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol, miembro_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, email, password_hash, rol || 'ADMIN', miembro_id || null]
  );
  return buscarPorId(resultado.insertId);
}

async function actualizar(id, { nombre, email, rol, miembro_id }) {
  const actual = await buscarPorId(id);
  if (!actual) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  await pool.query(
    'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, miembro_id = ? WHERE id = ?',
    [
      nombre !== undefined ? nombre : actual.nombre,
      email !== undefined ? email : actual.email,
      rol !== undefined ? rol : actual.rol,
      miembro_id !== undefined ? (miembro_id || null) : actual.miembro_id,
      id,
    ]
  );
  const nuevo = await buscarPorId(id);
  return { anterior: actual, nuevo };
}

async function cambiarPassword(id, nuevaPassword) {
  const actual = await buscarPorId(id);
  if (!actual) throw Object.assign(new Error('Administrador no encontrado'), { status: 404 });

  const password_hash = await bcrypt.hash(nuevaPassword, 10);
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [password_hash, id]);
  return actual;
}

async function cambiarActivo(id, activo) {
  const actual = await buscarPorId(id);
  if (!actual) throw Object.assign(new Error('Administrador no encontrado'), { status: 404 });

  await pool.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  const nuevo = await buscarPorId(id);
  return { anterior: actual, nuevo };
}

async function buscarPorMiembroId(miembroId) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, rol, miembro_id, activo FROM usuarios WHERE miembro_id = ? LIMIT 1',
    [miembroId]
  );
  return rows[0] || null;
}

async function concederAcceso({ miembroId, nombre, email, password }) {
  const existente = await buscarPorMiembroId(miembroId);
  if (existente) {
    // Reactivar y resetear contraseña
    const password_hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE usuarios SET activo = 1, password_hash = ? WHERE id = ?',
      [password_hash, existente.id]
    );
    return buscarPorId(existente.id);
  }
  // Crear nueva cuenta
  const password_hash = await bcrypt.hash(password, 10);
  const [resultado] = await pool.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol, miembro_id) VALUES (?, ?, ?, ?, ?)',
    [nombre, email, password_hash, 'MIEMBRO', miembroId]
  );
  return buscarPorId(resultado.insertId);
}

async function removerAcceso(miembroId) {
  const existente = await buscarPorMiembroId(miembroId);
  if (!existente) throw Object.assign(new Error('Este miembro no tiene acceso al portal'), { status: 404 });
  await pool.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [existente.id]);
  return buscarPorId(existente.id);
}

module.exports = {
  buscarPorEmail,
  buscarPorId,
  buscarPorMiembroId,
  listar,
  contarActivos,
  crear,
  actualizar,
  cambiarPassword,
  cambiarActivo,
  concederAcceso,
  removerAcceso,
};
