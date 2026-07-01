const { pool } = require('../config/db');

function construirFiltros({ miembroId, nivelId, fechaDesde, fechaHasta, estado }) {
  const condiciones = ['a.activo = 1'];
  const valores = [];

  if (miembroId) {
    condiciones.push('a.miembro_id = ?');
    valores.push(miembroId);
  }
  if (nivelId) {
    condiciones.push('a.nivel_id = ?');
    valores.push(nivelId);
  }
  if (fechaDesde) {
    condiciones.push('a.fecha >= ?');
    valores.push(fechaDesde);
  }
  if (fechaHasta) {
    condiciones.push('a.fecha <= ?');
    valores.push(fechaHasta);
  }
  if (estado) {
    condiciones.push('a.estado = ?');
    valores.push(estado);
  }

  return { whereSql: `WHERE ${condiciones.join(' AND ')}`, valores };
}

async function listar({ miembroId, nivelId, fechaDesde, fechaHasta, estado, limite, offset }) {
  const { whereSql, valores } = construirFiltros({ miembroId, nivelId, fechaDesde, fechaHasta, estado });

  const [filas] = await pool.query(
    `SELECT a.*, m.nombres_completos AS miembro_nombre, m.numero_documento, n.nombre AS nivel_nombre
     FROM asistencias a
     JOIN miembros m ON m.id = a.miembro_id
     JOIN niveles n ON n.id = a.nivel_id
     ${whereSql}
     ORDER BY a.fecha DESC, a.hora DESC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM asistencias a ${whereSql}`,
    valores
  );

  return { filas, total };
}

// Para el endpoint de reporte/exportación: sin paginación, con tope de seguridad.
async function listarTodas({ miembroId, nivelId, fechaDesde, fechaHasta, estado }) {
  const { whereSql, valores } = construirFiltros({ miembroId, nivelId, fechaDesde, fechaHasta, estado });

  const [filas] = await pool.query(
    `SELECT a.*, m.nombres_completos AS miembro_nombre, m.numero_documento, n.nombre AS nivel_nombre
     FROM asistencias a
     JOIN miembros m ON m.id = a.miembro_id
     JOIN niveles n ON n.id = a.nivel_id
     ${whereSql}
     ORDER BY a.fecha DESC, a.hora DESC
     LIMIT 5000`,
    valores
  );

  return filas;
}

async function contarPorEstado({ miembroId, nivelId, fechaDesde, fechaHasta }) {
  const { whereSql, valores } = construirFiltros({ miembroId, nivelId, fechaDesde, fechaHasta });

  const [filas] = await pool.query(
    `SELECT a.estado, COUNT(*) AS total FROM asistencias a ${whereSql} GROUP BY a.estado`,
    valores
  );

  const contadores = { A_TIEMPO: 0, TARDE: 0, AUSENTE: 0 };
  filas.forEach((f) => {
    contadores[f.estado] = Number(f.total);
  });
  contadores.total = contadores.A_TIEMPO + contadores.TARDE + contadores.AUSENTE;
  return contadores;
}

async function obtenerPorId(id) {
  const [rows] = await pool.query(
    `SELECT a.*, m.nombres_completos AS miembro_nombre, m.numero_documento, n.nombre AS nivel_nombre
     FROM asistencias a
     JOIN miembros m ON m.id = a.miembro_id
     JOIN niveles n ON n.id = a.nivel_id
     WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
}

// Evita registrar dos veces la asistencia del mismo miembro al mismo horario el mismo día.
async function buscarHoyPorMiembroYHorario(miembroId, horarioId, fecha) {
  const [rows] = await pool.query(
    'SELECT * FROM asistencias WHERE miembro_id = ? AND horario_id = ? AND fecha = ? AND activo = 1 LIMIT 1',
    [miembroId, horarioId, fecha]
  );
  return rows[0] || null;
}

async function crear({ miembro_id, nivel_id, horario_id, fecha, hora, estado, minutos_retraso }) {
  const [resultado] = await pool.query(
    `INSERT INTO asistencias (miembro_id, nivel_id, horario_id, fecha, hora, estado, minutos_retraso)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [miembro_id, nivel_id, horario_id || null, fecha, hora, estado, minutos_retraso || 0]
  );
  return obtenerPorId(resultado.insertId);
}

// Anula una asistencia (no la borra): queda con activo = 0, por lo que el
// filtro `a.activo = 1` de construirFiltros la excluye automáticamente de
// todos los listados/reportes/contadores existentes, sin tocar esas queries.
async function anular(id, motivo, anuladoPor) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Asistencia no encontrada'), { status: 404 });
  if (!actual.activo) throw Object.assign(new Error('Esta asistencia ya está anulada'), { status: 400 });

  await pool.query(
    `UPDATE asistencias SET activo = 0, motivo_anulacion = ?, anulado_por = ?, fecha_anulacion = NOW() WHERE id = ?`,
    [motivo, anuladoPor || null, id]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

// Edición manual de una asistencia por el administrador.
// Solo se puede editar estado y/o hora. Siempre queda registrado
// quién lo hizo, cuándo y por qué (modificado_manualmente = 1).
// Si cambia la hora, se recalculan los minutos_retraso automáticamente.
async function editar(id, { estado, hora, motivo }, modificadoPor) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Asistencia no encontrada'), { status: 404 });
  if (!actual.activo) throw Object.assign(new Error('No se puede editar una asistencia anulada'), { status: 400 });
  if (!motivo) throw Object.assign(new Error('Debes indicar el motivo de la modificación'), { status: 400 });

  const nuevoEstado = estado || actual.estado;
  const nuevaHora = hora || actual.hora;

  // Recalcular minutos_retraso si hay horario vinculado y la hora cambió
  let nuevosMinutos = actual.minutos_retraso;
  if (hora && actual.horario_id) {
    const [[horario]] = await pool.query(
      'SELECT hora_inicio, tolerancia_minutos FROM horarios WHERE id = ?',
      [actual.horario_id]
    );
    if (horario) {
      const [hi, mi] = String(horario.hora_inicio).split(':').map(Number);
      const [ha, ma] = String(nuevaHora).split(':').map(Number);
      const diff = (ha * 60 + ma) - (hi * 60 + mi);
      const tolerancia = horario.tolerancia_minutos ?? 10;
      nuevosMinutos = diff > tolerancia ? diff : 0;
    }
  }

  await pool.query(
    `UPDATE asistencias
     SET estado = ?, hora = ?, minutos_retraso = ?, modificado_manualmente = 1,
         motivo_modificacion = ?, modificado_por = ?, fecha_modificacion = NOW()
     WHERE id = ?`,
    [nuevoEstado, nuevaHora, nuevosMinutos, motivo, modificadoPor || null, id]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

module.exports = {
  listar,
  listarTodas,
  contarPorEstado,
  obtenerPorId,
  buscarHoyPorMiembroYHorario,
  crear,
  anular,
  editar,
};
