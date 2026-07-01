const { pool } = require('../config/db');

async function listar({ nivelId, tipo, activo, limite, offset }) {
  const condiciones = [];
  const valores = [];
  if (nivelId) { condiciones.push('g.nivel_id = ?'); valores.push(nivelId); }
  if (tipo) { condiciones.push('g.tipo = ?'); valores.push(tipo); }
  if (activo === '0' || activo === '1') { condiciones.push('g.activo = ?'); valores.push(Number(activo)); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT g.id, g.titulo, g.descripcion, g.nivel_id, g.tipo, g.url_video, g.activo, g.created_at,
            n.nombre AS nivel_nombre
     FROM guias g
     JOIN niveles n ON n.id = g.nivel_id
     ${where}
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM guias g ${where}`, valores);
  return { filas, total };
}

async function obtenerPorId(id, incluirContenido = false) {
  const campos = incluirContenido
    ? 'g.*, n.nombre AS nivel_nombre'
    : 'g.id, g.titulo, g.descripcion, g.nivel_id, g.tipo, g.url_video, g.activo, g.created_at, g.updated_at, n.nombre AS nivel_nombre';
  const [rows] = await pool.query(
    `SELECT ${campos} FROM guias g JOIN niveles n ON n.id = g.nivel_id WHERE g.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function crear({ titulo, descripcion, nivelId, tipo, contenido, urlVideo }) {
  const [res] = await pool.query(
    'INSERT INTO guias (titulo, descripcion, nivel_id, tipo, contenido, url_video) VALUES (?, ?, ?, ?, ?, ?)',
    [titulo, descripcion || null, nivelId, tipo || 'TEXTO', contenido || null, urlVideo || null]
  );
  return obtenerPorId(res.insertId, true);
}

async function actualizar(id, { titulo, descripcion, nivelId, tipo, contenido, urlVideo }) {
  const actual = await obtenerPorId(id, true);
  if (!actual) throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
  await pool.query(
    'UPDATE guias SET titulo = ?, descripcion = ?, nivel_id = ?, tipo = ?, contenido = ?, url_video = ? WHERE id = ?',
    [
      titulo !== undefined ? titulo : actual.titulo,
      descripcion !== undefined ? descripcion : actual.descripcion,
      nivelId !== undefined ? nivelId : actual.nivel_id,
      tipo !== undefined ? tipo : actual.tipo,
      contenido !== undefined ? contenido : actual.contenido,
      urlVideo !== undefined ? urlVideo : actual.url_video,
      id,
    ]
  );
  const nuevo = await obtenerPorId(id, true);
  return { anterior: actual, nuevo };
}

async function cambiarActivo(id, activo) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Guía no encontrada'), { status: 404 });
  await pool.query('UPDATE guias SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarActivo };
