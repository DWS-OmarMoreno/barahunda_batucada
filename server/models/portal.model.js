// Queries del portal del miembro (rol MIEMBRO).
// Todas las funciones reciben miembroId y devuelven solo los datos
// que le pertenecen a ese miembro.
const { pool } = require('../config/db');

async function obtenerPerfil(miembroId) {
  const [rows] = await pool.query(
    `SELECT m.*, GROUP_CONCAT(DISTINCT n.nombre ORDER BY n.nombre SEPARATOR ', ') AS niveles_nombres
     FROM miembros m
     LEFT JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.activo = 1
     LEFT JOIN niveles n ON n.id = mn.nivel_id
     WHERE m.id = ?
     GROUP BY m.id`,
    [miembroId]
  );
  return rows[0] || null;
}

async function obtenerAsistencias(miembroId, { fechaDesde, fechaHasta, nivelId, estado, limite, offset }) {
  const condiciones = ['a.miembro_id = ?', 'a.activo = 1'];
  const valores = [miembroId];

  if (fechaDesde) { condiciones.push('a.fecha >= ?'); valores.push(fechaDesde); }
  if (fechaHasta) { condiciones.push('a.fecha <= ?'); valores.push(fechaHasta); }
  if (nivelId) { condiciones.push('a.nivel_id = ?'); valores.push(nivelId); }
  if (estado) { condiciones.push('a.estado = ?'); valores.push(estado); }

  const where = `WHERE ${condiciones.join(' AND ')}`;

  const [filas] = await pool.query(
    `SELECT a.id, a.fecha, a.hora, a.estado, a.minutos_retraso, a.modificado_manualmente,
            n.nombre AS nivel_nombre
     FROM asistencias a
     JOIN niveles n ON n.id = a.nivel_id
     ${where}
     ORDER BY a.fecha DESC, a.hora DESC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM asistencias a ${where}`,
    valores
  );
  return { filas, total };
}

async function obtenerMensualidades(miembroId, { limite, offset }) {
  const [filas] = await pool.query(
    `SELECT mp.id, mp.mes_correspondiente, mp.anio_correspondiente, mp.valor,
            mp.fecha_pago, mp.observaciones, mp.soporte_url,
            ms.valor_mensualidad AS mensualidad_configurada
     FROM mensualidades_pagos mp
     LEFT JOIN mensualidades ms ON ms.miembro_id = mp.miembro_id
     WHERE mp.miembro_id = ?
     ORDER BY mp.anio_correspondiente DESC, mp.mes_correspondiente DESC
     LIMIT ? OFFSET ?`,
    [miembroId, limite, offset]
  );
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM mensualidades_pagos WHERE miembro_id = ?',
    [miembroId]
  );
  return { filas, total };
}

async function obtenerTareas(miembroId) {
  // Tareas del nivel activo del miembro, con su entrega (si existe)
  const [filas] = await pool.query(
    `SELECT t.id, t.titulo, t.descripcion, t.fecha_limite,
            n.nombre AS nivel_nombre,
            e.id AS entrega_id, e.url_evidencia, e.observaciones AS entrega_observaciones,
            e.fecha_entrega, e.calificacion, e.retroalimentacion
     FROM tareas t
     JOIN niveles n ON n.id = t.nivel_id
     JOIN miembro_niveles mn ON mn.nivel_id = t.nivel_id AND mn.miembro_id = ? AND mn.activo = 1
     LEFT JOIN entregas e ON e.tarea_id = t.id AND e.miembro_id = ?
     WHERE t.activo = 1
     ORDER BY t.fecha_limite IS NULL ASC, t.fecha_limite ASC, t.created_at DESC`,
    [miembroId, miembroId]
  );
  return filas;
}

module.exports = { obtenerPerfil, obtenerAsistencias, obtenerMensualidades, obtenerTareas };
