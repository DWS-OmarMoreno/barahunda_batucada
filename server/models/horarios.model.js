const { pool } = require('../config/db');

async function listar({ nivelId, diaSemana, activo, limite, offset }) {
  const condiciones = [];
  const valores = [];

  if (nivelId) {
    condiciones.push('h.nivel_id = ?');
    valores.push(nivelId);
  }
  if (diaSemana) {
    condiciones.push('h.dia_semana = ?');
    valores.push(diaSemana);
  }
  if (activo === '0' || activo === '1') {
    condiciones.push('h.activo = ?');
    valores.push(activo);
  }

  const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [filas] = await pool.query(
    `SELECT h.*, n.nombre AS nivel_nombre
     FROM horarios h
     JOIN niveles n ON n.id = h.nivel_id
     ${whereSql}
     ORDER BY n.nombre ASC,
       FIELD(h.dia_semana, 'LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO'),
       h.hora_inicio ASC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM horarios h JOIN niveles n ON n.id = h.nivel_id ${whereSql}`,
    valores
  );

  return { filas, total };
}

async function obtenerPorId(id) {
  const [rows] = await pool.query(
    `SELECT h.*, n.nombre AS nivel_nombre
     FROM horarios h
     JOIN niveles n ON n.id = h.nivel_id
     WHERE h.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function crear({ nivel_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos }) {
  const [resultado] = await pool.query(
    `INSERT INTO horarios (nivel_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos)
     VALUES (?, ?, ?, ?, ?)`,
    [nivel_id, dia_semana, hora_inicio, hora_fin, tolerancia_minutos ?? 10]
  );
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, cambios) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Horario no encontrado'), { status: 404 });

  const campos = ['nivel_id', 'dia_semana', 'hora_inicio', 'hora_fin', 'tolerancia_minutos'];
  const aplicar = {};
  campos.forEach((c) => {
    aplicar[c] = cambios[c] !== undefined ? cambios[c] : actual[c];
  });

  await pool.query(
    `UPDATE horarios SET nivel_id = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, tolerancia_minutos = ? WHERE id = ?`,
    [aplicar.nivel_id, aplicar.dia_semana, aplicar.hora_inicio, aplicar.hora_fin, aplicar.tolerancia_minutos, id]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function cambiarActivo(id, activo) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Horario no encontrado'), { status: 404 });

  await pool.query('UPDATE horarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

// Horario(s) activo(s) de un nivel para un día de la semana dado (usado por Asistencias).
async function buscarActivoPorNivelYDia(nivelId, diaSemana) {
  const [rows] = await pool.query(
    `SELECT * FROM horarios WHERE nivel_id = ? AND dia_semana = ? AND activo = 1`,
    [nivelId, diaSemana]
  );
  return rows;
}

// Todos los horarios activos (opcionalmente de un solo nivel), sin paginar.
// Se usa para sintetizar asistencias AUSENTE (cruzar horarios x inscripciones x fechas).
async function listarActivosTodos(nivelId) {
  const condiciones = ['h.activo = 1'];
  const valores = [];
  if (nivelId) {
    condiciones.push('h.nivel_id = ?');
    valores.push(nivelId);
  }

  const [filas] = await pool.query(
    `SELECT h.*, n.nombre AS nivel_nombre
     FROM horarios h
     JOIN niveles n ON n.id = h.nivel_id
     WHERE ${condiciones.join(' AND ')}`,
    valores
  );
  return filas;
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  cambiarActivo,
  buscarActivoPorNivelYDia,
  listarActivosTodos,
};
