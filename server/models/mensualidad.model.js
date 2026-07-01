// Modelo para la tabla `mensualidades`: una fila por miembro con el valor
// personalizado de su mensualidad. No confundir con el módulo de reportes
// "Mensualidades", que usa este modelo junto con `pagos.model.js`.
const { pool } = require('../config/db');

async function obtenerPorMiembro(miembroId) {
  const [rows] = await pool.query('SELECT * FROM mensualidades WHERE miembro_id = ?', [miembroId]);
  return rows[0] || null;
}

async function establecerValor(miembroId, valor) {
  const actual = await obtenerPorMiembro(miembroId);
  if (actual) {
    await pool.query('UPDATE mensualidades SET valor_mensualidad = ? WHERE miembro_id = ?', [valor, miembroId]);
  } else {
    await pool.query('INSERT INTO mensualidades (miembro_id, valor_mensualidad) VALUES (?, ?)', [miembroId, valor]);
  }
  return obtenerPorMiembro(miembroId);
}

// Todos los miembros activos con su valor de mensualidad (0 si aún no se ha configurado).
async function listarActivosConValor() {
  const [rows] = await pool.query(
    `SELECT m.id AS miembro_id, m.nombres_completos, m.numero_documento, m.whatsapp,
            COALESCE(me.valor_mensualidad, 0) AS valor_mensualidad
     FROM miembros m
     LEFT JOIN mensualidades me ON me.miembro_id = m.id
     WHERE m.activo = 1
     ORDER BY m.nombres_completos ASC`
  );
  return rows;
}

// Estado de pago de todos los miembros activos para un mes/año específico:
// valor configurado, total pagado (sumando posibles pagos parciales) y estado
// derivado (PAGADO / PARCIAL / PENDIENTE / EXENTO). Usado por el módulo
// Mensualidades. Los miembros exentos de pago siempre quedan en estado
// EXENTO sin importar lo que se haya pagado, ya que no se les cobra la
// mensualidad (ver miembros.exento_pago).
async function listarEstadoPorMes(mes, anio) {
  const [rows] = await pool.query(
    `SELECT m.id AS miembro_id, m.nombres_completos, m.numero_documento, m.whatsapp, m.exento_pago,
            niv.nivel_id, niv.nivel_nombre,
            COALESCE(me.valor_mensualidad, 0) AS valor_mensualidad,
            COALESCE(SUM(p.valor), 0) AS total_pagado,
            MAX(p.fecha_pago) AS ultima_fecha_pago
     FROM miembros m
     LEFT JOIN (
       SELECT mn.miembro_id, MIN(mn.nivel_id) AS nivel_id
       FROM miembro_niveles mn WHERE mn.activo = 1 GROUP BY mn.miembro_id
     ) mn_first ON mn_first.miembro_id = m.id
     LEFT JOIN niveles niv ON niv.id = mn_first.nivel_id
     LEFT JOIN mensualidades me ON me.miembro_id = m.id
     LEFT JOIN pagos p ON p.miembro_id = m.id
       AND p.mes_correspondiente = ? AND p.anio_correspondiente = ? AND p.activo = 1
     WHERE m.activo = 1
     GROUP BY m.id, m.nombres_completos, m.numero_documento, m.whatsapp, m.exento_pago,
              niv.nivel_id, niv.nivel_nombre, me.valor_mensualidad
     ORDER BY m.nombres_completos ASC`,
    [mes, anio]
  );

  return rows.map((r) => {
    const valorMensualidad = Number(r.valor_mensualidad);
    const totalPagado = Number(r.total_pagado);
    let estado = 'PENDIENTE';
    if (valorMensualidad > 0 && totalPagado >= valorMensualidad) estado = 'PAGADO';
    else if (totalPagado > 0) estado = 'PARCIAL';
    if (r.exento_pago) estado = 'EXENTO';
    return { ...r, valor_mensualidad: valorMensualidad, total_pagado: totalPagado, estado };
  });
}

// ¿El miembro lleva 2+ meses consecutivos (el actual y el anterior) sin pagar
// la mensualidad, sin estar exento? Se usa para que la ficha del miembro
// (módulo Miembros) muestre la asistencia como obligatoria aunque no esté
// marcada manualmente — mismo criterio que reportes.model.js#alertas().
async function tieneDosMesesPendientes(miembroId) {
  const ahora = new Date();
  const actual = { mes: ahora.getMonth() + 1, anio: ahora.getFullYear() };
  const fechaAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const anterior = { mes: fechaAnterior.getMonth() + 1, anio: fechaAnterior.getFullYear() };

  const [estadoActual, estadoAnterior] = await Promise.all([
    listarEstadoPorMes(actual.mes, actual.anio),
    listarEstadoPorMes(anterior.mes, anterior.anio),
  ]);

  const idNum = Number(miembroId);
  const filaActual = estadoActual.find((f) => f.miembro_id === idNum);
  const filaAnterior = estadoAnterior.find((f) => f.miembro_id === idNum);
  if (!filaActual || !filaAnterior) return false;

  const pendienteActual = filaActual.estado !== 'PAGADO' && filaActual.estado !== 'EXENTO';
  const pendienteAnterior = filaAnterior.estado !== 'PAGADO' && filaAnterior.estado !== 'EXENTO';
  return pendienteActual && pendienteAnterior;
}

module.exports = {
  obtenerPorMiembro,
  establecerValor,
  listarActivosConValor,
  listarEstadoPorMes,
  tieneDosMesesPendientes,
};
