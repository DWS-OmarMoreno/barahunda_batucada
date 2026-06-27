const { pool } = require('../config/db');

// NOTA: este modelo nace en el módulo de Asistencias (generación automática de
// multas por tardanza) y se completa aquí, en el módulo de Multas propiamente
// dicho (listar, condonar, marcar pagada, resumen, etc.).

const SELECT_BASE = `
  SELECT mu.*, m.nombres_completos AS miembro_nombre, m.numero_documento,
         a.fecha AS asistencia_fecha, a.minutos_retraso AS asistencia_minutos_retraso,
         n.nombre AS nivel_nombre
  FROM multas mu
  JOIN miembros m ON m.id = mu.miembro_id
  LEFT JOIN asistencias a ON a.id = mu.asistencia_id
  LEFT JOIN niveles n ON n.id = a.nivel_id
`;

function construirFiltros({ miembroId, estado, tipo, fechaDesde, fechaHasta }) {
  const condiciones = ['mu.activo = 1'];
  const valores = [];
  if (miembroId) { condiciones.push('mu.miembro_id = ?'); valores.push(miembroId); }
  if (estado) { condiciones.push('mu.estado = ?'); valores.push(estado); }
  if (tipo) { condiciones.push('mu.tipo = ?'); valores.push(tipo); }
  if (fechaDesde) { condiciones.push('mu.fecha_generada >= ?'); valores.push(fechaDesde); }
  if (fechaHasta) { condiciones.push('mu.fecha_generada <= ?'); valores.push(fechaHasta); }
  return { whereSql: `WHERE ${condiciones.join(' AND ')}`, valores };
}

async function obtenerPorId(id) {
  const [rows] = await pool.query(`${SELECT_BASE} WHERE mu.id = ?`, [id]);
  return rows[0] || null;
}

async function crear({ miembro_id, asistencia_id, tipo, valor, fecha_generada }) {
  const [resultado] = await pool.query(
    `INSERT INTO multas (miembro_id, asistencia_id, tipo, valor, fecha_generada)
     VALUES (?, ?, ?, ?, ?)`,
    [miembro_id, asistencia_id || null, tipo || 'TARDANZA', valor, fecha_generada]
  );
  return obtenerPorId(resultado.insertId);
}

async function listar({ miembroId, estado, tipo, fechaDesde, fechaHasta, limite, offset }) {
  const { whereSql, valores } = construirFiltros({ miembroId, estado, tipo, fechaDesde, fechaHasta });

  const [filas] = await pool.query(
    `${SELECT_BASE} ${whereSql} ORDER BY mu.fecha_generada DESC, mu.id DESC LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM multas mu ${whereSql}`,
    valores
  );

  return { filas, total };
}

async function listarPorMiembro(miembroId) {
  const [filas] = await pool.query(
    `${SELECT_BASE} WHERE mu.miembro_id = ? AND mu.activo = 1 ORDER BY mu.fecha_generada DESC`,
    [miembroId]
  );
  return filas;
}

// Indicadores resumen (total pendientes, recaudado, condonado) respetando los
// mismos filtros de `listar`, ya que la tabla de multas puede estar paginada.
async function resumen({ miembroId, estado, tipo, fechaDesde, fechaHasta } = {}) {
  const { whereSql, valores } = construirFiltros({ miembroId, estado, tipo, fechaDesde, fechaHasta });

  const [[fila]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN mu.estado = 'PENDIENTE' THEN mu.valor ELSE 0 END), 0) AS total_pendiente,
       COALESCE(SUM(CASE WHEN mu.estado = 'PAGADA' THEN mu.valor ELSE 0 END), 0) AS total_recaudado,
       COALESCE(SUM(CASE WHEN mu.estado = 'CONDONADA' THEN mu.valor ELSE 0 END), 0) AS total_condonado,
       SUM(CASE WHEN mu.estado = 'PENDIENTE' THEN 1 ELSE 0 END) AS cantidad_pendientes,
       SUM(CASE WHEN mu.estado = 'PAGADA' THEN 1 ELSE 0 END) AS cantidad_pagadas,
       SUM(CASE WHEN mu.estado = 'CONDONADA' THEN 1 ELSE 0 END) AS cantidad_condonadas
     FROM multas mu ${whereSql}`,
    valores
  );

  return {
    total_pendiente: Number(fila.total_pendiente),
    total_recaudado: Number(fila.total_recaudado),
    total_condonado: Number(fila.total_condonado),
    cantidad_pendientes: Number(fila.cantidad_pendientes),
    cantidad_pagadas: Number(fila.cantidad_pagadas),
    cantidad_condonadas: Number(fila.cantidad_condonadas),
  };
}

// Multas pendientes generadas por una asistencia puntual (usado por la
// cascada de anulación de asistencias: si la asistencia se anula, las
// multas que dependían de ella dejan de tener fundamento).
async function listarPendientesPorAsistencia(asistenciaId) {
  const [rows] = await pool.query(
    `SELECT * FROM multas WHERE asistencia_id = ? AND estado = 'PENDIENTE' AND activo = 1`,
    [asistenciaId]
  );
  return rows;
}

async function condonar(id, motivoCondonacion) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Multa no encontrada'), { status: 404 });
  if (actual.estado !== 'PENDIENTE') {
    throw Object.assign(new Error('Solo se pueden condonar multas pendientes'), { status: 400 });
  }

  await pool.query(
    `UPDATE multas SET estado = 'CONDONADA', motivo_condonacion = ? WHERE id = ?`,
    [motivoCondonacion, id]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function marcarPagada(id, { valor, fecha_pago }) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Multa no encontrada'), { status: 404 });
  if (actual.estado !== 'PENDIENTE') {
    throw Object.assign(new Error('Solo se pueden marcar como pagadas las multas pendientes'), { status: 400 });
  }

  const valorFinal = valor !== undefined && valor !== null && valor !== '' ? valor : actual.valor;
  await pool.query(
    `UPDATE multas SET estado = 'PAGADA', valor = ?, fecha_pago = ? WHERE id = ?`,
    [valorFinal, fecha_pago, id]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

// Elimina (soft-delete) una multa: igual al patrón usado para pagos
// (pagos.model.js#eliminar). No se borra el registro, solo se desactiva,
// para conservar el rastro en auditoría e historial.
async function eliminar(id) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Multa no encontrada'), { status: 404 });

  await pool.query('UPDATE multas SET activo = 0 WHERE id = ?', [id]);
  return actual;
}

module.exports = {
  obtenerPorId,
  crear,
  listar,
  listarPorMiembro,
  listarPendientesPorAsistencia,
  resumen,
  condonar,
  marcarPagada,
  eliminar,
};
