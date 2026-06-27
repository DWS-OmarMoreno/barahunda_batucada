// Modelo de la tabla `importaciones` — log histórico de cada importación y
// exportación realizada (Módulo 11), independiente de la tabla `auditoria`
// global (que también recibe una entrada resumida vía registrarAccion).
const { pool } = require('../config/db');

async function registrarLog({ modulo, tipo, usuarioId, nombreArchivo, registrosProcesados, registrosExitosos, registrosError, detalleErrores }) {
  const [resultado] = await pool.query(
    `INSERT INTO importaciones
       (modulo, tipo, usuario_id, nombre_archivo, registros_procesados, registros_exitosos, registros_error, detalle_errores)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      modulo,
      tipo,
      usuarioId || null,
      nombreArchivo || null,
      registrosProcesados || 0,
      registrosExitosos || 0,
      registrosError || 0,
      detalleErrores || null,
    ]
  );
  const [rows] = await pool.query('SELECT * FROM importaciones WHERE id = ?', [resultado.insertId]);
  return rows[0];
}

async function listarHistorial({ limite, offset }) {
  const [filas] = await pool.query(
    `SELECT i.*, u.nombre AS usuario_nombre
     FROM importaciones i
     LEFT JOIN usuarios u ON u.id = i.usuario_id
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [limite, offset]
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM importaciones');
  return { filas, total };
}

module.exports = { registrarLog, listarHistorial };
