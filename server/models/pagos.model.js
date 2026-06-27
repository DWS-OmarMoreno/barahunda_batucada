// Modelo de `pagos`, compartido por el módulo Miembros (registrar pago
// desde el detalle de un miembro) y el módulo Mensualidades (vista mensual
// y reportes de recaudo).
const { pool } = require('../config/db');

async function listarPorMiembro(miembroId) {
  const [rows] = await pool.query(
    `SELECT p.*, u.nombre AS registrado_por_nombre
     FROM pagos p
     LEFT JOIN usuarios u ON u.id = p.registrado_por
     WHERE p.miembro_id = ? AND p.activo = 1
     ORDER BY p.anio_correspondiente DESC, p.mes_correspondiente DESC, p.fecha_pago DESC`,
    [miembroId]
  );
  return rows;
}

async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM pagos WHERE id = ?', [id]);
  return rows[0] || null;
}

async function crear({ miembro_id, valor, fecha_pago, mes_correspondiente, anio_correspondiente, soporte_url, observaciones, registrado_por }) {
  const [resultado] = await pool.query(
    `INSERT INTO pagos (miembro_id, valor, fecha_pago, mes_correspondiente, anio_correspondiente, soporte_url, observaciones, registrado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [miembro_id, valor, fecha_pago, mes_correspondiente, anio_correspondiente, soporte_url || null, observaciones || null, registrado_por || null]
  );
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, cambios) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Pago no encontrado'), { status: 404 });

  const campos = ['valor', 'fecha_pago', 'mes_correspondiente', 'anio_correspondiente', 'soporte_url', 'observaciones'];
  const aplicar = {};
  campos.forEach((c) => {
    aplicar[c] = cambios[c] !== undefined ? cambios[c] : actual[c];
  });

  await pool.query(
    `UPDATE pagos SET valor = ?, fecha_pago = ?, mes_correspondiente = ?, anio_correspondiente = ?, soporte_url = ?, observaciones = ? WHERE id = ?`,
    [aplicar.valor, aplicar.fecha_pago, aplicar.mes_correspondiente, aplicar.anio_correspondiente, aplicar.soporte_url, aplicar.observaciones, id]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function eliminar(id) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Pago no encontrado'), { status: 404 });

  await pool.query('UPDATE pagos SET activo = 0 WHERE id = ?', [id]);
  return actual;
}

// Total pagado por un miembro en un mes/año específico (puede haber pagos parciales).
async function totalPagadoMes(miembroId, mes, anio) {
  const [[{ total }]] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM pagos
     WHERE miembro_id = ? AND mes_correspondiente = ? AND anio_correspondiente = ? AND activo = 1`,
    [miembroId, mes, anio]
  );
  return Number(total);
}

// Total pagado por TODOS los miembros en un mes/año (para indicadores resumen).
async function totalRecaudadoMes(mes, anio) {
  const [[{ total }]] = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS total FROM pagos
     WHERE mes_correspondiente = ? AND anio_correspondiente = ? AND activo = 1`,
    [mes, anio]
  );
  return Number(total);
}

module.exports = { listarPorMiembro, obtenerPorId, crear, actualizar, eliminar, totalPagadoMes, totalRecaudadoMes };
