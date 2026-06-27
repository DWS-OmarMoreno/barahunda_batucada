const { pool } = require('../config/db');

const CAMPOS = [
  'nombres_completos', 'tipo_documento', 'numero_documento', 'whatsapp', 'email',
  'fecha_nacimiento', 'direccion', 'tipo_sangre', 'eps',
  'padece_enfermedad', 'enfermedad_cual', 'sufre_alergia', 'alergia_cual',
  'toma_medicamentos', 'medicamentos_cuales', 'restricciones_fisicas',
  'exento_pago', 'asistencia_obligatoria',
];

async function listar({ busqueda = '', activo, nivelId, limite, offset }) {
  const valoresJoin = [];
  let join = '';

  if (nivelId) {
    join = 'JOIN miembro_niveles mn ON mn.miembro_id = m.id AND mn.nivel_id = ? AND mn.activo = 1';
    valoresJoin.push(nivelId);
  }

  const condiciones = [];
  const valoresWhere = [];

  if (busqueda) {
    condiciones.push('(m.nombres_completos LIKE ? OR m.numero_documento LIKE ?)');
    valoresWhere.push(`%${busqueda}%`, `%${busqueda}%`);
  }
  if (activo === '0' || activo === '1' || activo === 0 || activo === 1) {
    condiciones.push('m.activo = ?');
    valoresWhere.push(Number(activo));
  }

  const whereSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const valores = [...valoresJoin, ...valoresWhere];

  const [filas] = await pool.query(
    `SELECT DISTINCT m.*
     FROM miembros m
     ${join}
     ${whereSql}
     ORDER BY m.nombres_completos ASC
     LIMIT ? OFFSET ?`,
    [...valores, limite, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(DISTINCT m.id) AS total FROM miembros m ${join} ${whereSql}`,
    valores
  );

  return { filas, total };
}

async function obtenerPorId(id) {
  const [rows] = await pool.query('SELECT * FROM miembros WHERE id = ?', [id]);
  return rows[0] || null;
}

async function obtenerPorDocumento(numeroDocumento) {
  const [rows] = await pool.query('SELECT * FROM miembros WHERE numero_documento = ?', [numeroDocumento]);
  return rows[0] || null;
}

async function crear(datos) {
  const campos = CAMPOS.filter((c) => Object.prototype.hasOwnProperty.call(datos, c));
  const columnas = campos.join(', ');
  const marcadores = campos.map(() => '?').join(', ');
  const valores = campos.map((c) => datos[c] ?? null);

  const [resultado] = await pool.query(`INSERT INTO miembros (${columnas}) VALUES (${marcadores})`, valores);
  return obtenerPorId(resultado.insertId);
}

async function actualizar(id, datos) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Miembro no encontrado'), { status: 404 });

  const campos = CAMPOS.filter((c) => Object.prototype.hasOwnProperty.call(datos, c));
  if (campos.length === 0) return { anterior: actual, nuevo: actual };

  const sets = campos.map((c) => `${c} = ?`).join(', ');
  const valores = campos.map((c) => datos[c] ?? null);

  await pool.query(`UPDATE miembros SET ${sets} WHERE id = ?`, [...valores, id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

async function cambiarActivo(id, activo) {
  const actual = await obtenerPorId(id);
  if (!actual) throw Object.assign(new Error('Miembro no encontrado'), { status: 404 });

  await pool.query('UPDATE miembros SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
  const nuevo = await obtenerPorId(id);
  return { anterior: actual, nuevo };
}

module.exports = { CAMPOS, listar, obtenerPorId, obtenerPorDocumento, crear, actualizar, cambiarActivo };
