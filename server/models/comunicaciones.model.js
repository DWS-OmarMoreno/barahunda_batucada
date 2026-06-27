const { pool } = require('../config/db');

async function listar({ limite, offset }) {
  const [filas] = await pool.query(
    `SELECT c.*, p.nombre AS plantilla_nombre, n.nombre AS nivel_nombre, u.nombre AS enviado_por_nombre
     FROM comunicaciones c
     LEFT JOIN plantillas_whatsapp p ON p.id = c.plantilla_id
     LEFT JOIN niveles n ON n.id = c.nivel_id
     LEFT JOIN usuarios u ON u.id = c.enviado_por
     WHERE c.activo = 1
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [limite, offset]
  );

  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM comunicaciones WHERE activo = 1");

  return { filas, total };
}

async function obtenerPorId(id) {
  const [rows] = await pool.query(
    `SELECT c.*, p.nombre AS plantilla_nombre, n.nombre AS nivel_nombre, u.nombre AS enviado_por_nombre
     FROM comunicaciones c
     LEFT JOIN plantillas_whatsapp p ON p.id = c.plantilla_id
     LEFT JOIN niveles n ON n.id = c.nivel_id
     LEFT JOIN usuarios u ON u.id = c.enviado_por
     WHERE c.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function crear({ plantilla_id, destinatarios_tipo, nivel_id, mensaje_generado, total_destinatarios, enviado_por }) {
  const [resultado] = await pool.query(
    `INSERT INTO comunicaciones (plantilla_id, destinatarios_tipo, nivel_id, mensaje_generado, total_destinatarios, enviado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [plantilla_id || null, destinatarios_tipo, nivel_id || null, mensaje_generado, total_destinatarios || 0, enviado_por || null]
  );
  return obtenerPorId(resultado.insertId);
}

// Resuelve la lista de miembros destinatarios según el tipo de envío, incluyendo
// el nivel "principal" (nivel activo más reciente) y el valor de mensualidad,
// datos usados para sustituir las variables {nivel} y {valor_mensualidad} de
// la plantilla. Se usan subconsultas correlacionadas para evitar N+1 queries.
const SELECT_DESTINATARIO = `
  SELECT m.id AS miembro_id, m.nombres_completos AS miembro_nombre, m.numero_documento, m.whatsapp,
         COALESCE(me.valor_mensualidad, 0) AS valor_mensualidad,
         (SELECT n.nombre FROM miembro_niveles mn
          JOIN niveles n ON n.id = mn.nivel_id
          WHERE mn.miembro_id = m.id AND mn.activo = 1
          ORDER BY mn.created_at DESC LIMIT 1) AS nivel_nombre
  FROM miembros m
  LEFT JOIN mensualidades me ON me.miembro_id = m.id
`;

async function resolverDestinatarios({ tipo, nivelId, miembroIds }) {
  if (tipo === 'POR_NIVEL') {
    if (!nivelId) throw Object.assign(new Error('nivel_id es obligatorio para destinatarios POR_NIVEL'), { status: 400 });
    const [filas] = await pool.query(
      `${SELECT_DESTINATARIO}
       JOIN miembro_niveles mn2 ON mn2.miembro_id = m.id AND mn2.nivel_id = ? AND mn2.activo = 1
       WHERE m.activo = 1
       GROUP BY m.id
       ORDER BY m.nombres_completos ASC`,
      [nivelId]
    );
    return filas;
  }

  if (tipo === 'MANUAL') {
    if (!Array.isArray(miembroIds) || miembroIds.length === 0) {
      throw Object.assign(new Error('miembro_ids es obligatorio para destinatarios MANUAL'), { status: 400 });
    }
    const [filas] = await pool.query(
      `${SELECT_DESTINATARIO} WHERE m.id IN (?) AND m.activo = 1 ORDER BY m.nombres_completos ASC`,
      [miembroIds]
    );
    return filas;
  }

  // TODOS
  const [filas] = await pool.query(`${SELECT_DESTINATARIO} WHERE m.activo = 1 ORDER BY m.nombres_completos ASC`);
  return filas;
}

module.exports = { listar, obtenerPorId, crear, resolverDestinatarios };
