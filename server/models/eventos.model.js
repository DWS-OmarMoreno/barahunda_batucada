const { pool } = require('../config/db');

function construirFiltros({ tipo, fechaDesde, fechaHasta }) {
  const condiciones = ['e.activo = 1'];
  const valores = [];

  if (tipo) {
    condiciones.push('e.tipo = ?');
    valores.push(tipo);
  }
  if (fechaDesde) {
    condiciones.push('e.fecha >= ?');
    valores.push(fechaDesde);
  }
  if (fechaHasta) {
    condiciones.push('e.fecha <= ?');
    valores.push(fechaHasta);
  }

  return { whereSql: `WHERE ${condiciones.join(' AND ')}`, valores };
}

async function listar({ tipo, fechaDesde, fechaHasta, limite, offset }) {
  const { whereSql, valores } = construirFiltros({ tipo, fechaDesde, fechaHasta });

  const [filas] = await pool.query(
    `SELECT e.*,
            (SELECT COUNT(*) FROM evento_miembros em WHERE em.evento_id = e.id AND em.activo = 1) AS total_participantes,
            (SELECT COALESCE(SUM(em.valor_individual), 0) FROM evento_miembros em WHERE em.evento_id = e.id AND em.activo = 1) AS total_asignado
     FROM eventos e
     ${whereSql}
     ORDER BY e.fecha DESC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM eventos e ${whereSql}`, valores);

  return { filas, total };
}

async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM eventos WHERE id = ?', [id]);
  return rows[0] || null;
}

async function crear({ nombre, fecha, descripcion, tipo, valor_total, quien_contrata_nombre, quien_contrata_contacto }) {
  const [resultado] = await pool.query(
    `INSERT INTO eventos (nombre, fecha, descripcion, tipo, valor_total, quien_contrata_nombre, quien_contrata_contacto)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombre, fecha, descripcion || null, tipo || 'PAGO', valor_total || 0, quien_contrata_nombre || null, quien_contrata_contacto || null]
  );
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, cambios) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Evento no encontrado'), { status: 404 });

  const campos = ['nombre', 'fecha', 'descripcion', 'tipo', 'valor_total', 'quien_contrata_nombre', 'quien_contrata_contacto'];
  const aplicar = {};
  campos.forEach((c) => {
    aplicar[c] = cambios[c] !== undefined ? cambios[c] : actual[c];
  });

  await pool.query(
    `UPDATE eventos SET nombre = ?, fecha = ?, descripcion = ?, tipo = ?, valor_total = ?, quien_contrata_nombre = ?, quien_contrata_contacto = ?
     WHERE id = ?`,
    [aplicar.nombre, aplicar.fecha, aplicar.descripcion, aplicar.tipo, aplicar.valor_total, aplicar.quien_contrata_nombre, aplicar.quien_contrata_contacto, id]
  );
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function eliminar(id) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Evento no encontrado'), { status: 404 });

  await pool.query('UPDATE eventos SET activo = 0 WHERE id = ?', [id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function listarParticipantes(eventoId) {
  const [rows] = await pool.query(
    `SELECT em.*, m.nombres_completos AS miembro_nombre, m.numero_documento, m.whatsapp
     FROM evento_miembros em
     JOIN miembros m ON m.id = em.miembro_id
     WHERE em.evento_id = ? AND em.activo = 1
     ORDER BY m.nombres_completos ASC`,
    [eventoId]
  );
  return rows;
}

async function obtenerParticipante(eventoId, miembroId) {
  const [rows] = await pool.query(
    `SELECT em.*, m.nombres_completos AS miembro_nombre, m.numero_documento, m.whatsapp
     FROM evento_miembros em
     JOIN miembros m ON m.id = em.miembro_id
     WHERE em.evento_id = ? AND em.miembro_id = ? AND em.activo = 1`,
    [eventoId, miembroId]
  );
  return rows[0] || null;
}

async function agregarParticipante(eventoId, { miembro_id, valor_individual, notas }) {
  const [existente] = await pool.query(
    'SELECT * FROM evento_miembros WHERE evento_id = ? AND miembro_id = ?',
    [eventoId, miembro_id]
  );

  if (existente[0]) {
    if (existente[0].activo) {
      throw Object.assign(new Error('Este miembro ya participa en el evento'), { status: 400 });
    }
    await pool.query(
      'UPDATE evento_miembros SET activo = 1, valor_individual = ?, notas = ? WHERE id = ?',
      [valor_individual || 0, notas || null, existente[0].id]
    );
    return obtenerParticipante(eventoId, miembro_id);
  }

  await pool.query(
    'INSERT INTO evento_miembros (evento_id, miembro_id, valor_individual, notas) VALUES (?, ?, ?, ?)',
    [eventoId, miembro_id, valor_individual || 0, notas || null]
  );
  return obtenerParticipante(eventoId, miembro_id);
}

async function actualizarParticipante(eventoId, miembroId, { valor_individual, notas }) {
  const actual = await obtenerParticipante(eventoId, miembroId);
  if (!actual) throw Object.assign(new Error('Participante no encontrado en este evento'), { status: 404 });

  await pool.query(
    'UPDATE evento_miembros SET valor_individual = ?, notas = ? WHERE evento_id = ? AND miembro_id = ?',
    [
      valor_individual !== undefined ? valor_individual : actual.valor_individual,
      notas !== undefined ? notas : actual.notas,
      eventoId,
      miembroId,
    ]
  );
  const nuevo = await obtenerParticipante(eventoId, miembroId);
  return { anterior: actual, nuevo };
}

async function quitarParticipante(eventoId, miembroId) {
  const actual = await obtenerParticipante(eventoId, miembroId);
  if (!actual) throw Object.assign(new Error('Participante no encontrado en este evento'), { status: 404 });

  await pool.query('UPDATE evento_miembros SET activo = 0 WHERE evento_id = ? AND miembro_id = ?', [eventoId, miembroId]);
  return actual;
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarParticipantes,
  obtenerParticipante,
  agregarParticipante,
  actualizarParticipante,
  quitarParticipante,
};
