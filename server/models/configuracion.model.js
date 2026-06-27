const { pool } = require('../config/db');

const CAMPOS = [
  'escuela_nombre',
  'escuela_logo',
  'escuela_telefono',
  'escuela_direccion',
  'fecha_go_live',
  'multa_valor_por_tardanza',
  'asistencia_tolerancia_minutos',
  'color_primario',
  'color_secundario',
  'color_acento',
  'color_texto',
  'color_fondo',
];

// El sistema maneja una única fila de configuración (la primera que exista).
async function obtener() {
  const [rows] = await pool.query('SELECT * FROM configuracion ORDER BY id ASC LIMIT 1');
  return rows[0] || null;
}

async function actualizar(cambios) {
  const actual = await obtener();
  if (!actual) throw Object.assign(new Error('No existe configuración para actualizar'), { status: 404 });

  const campos = CAMPOS.filter((c) => Object.prototype.hasOwnProperty.call(cambios, c));
  if (campos.length === 0) return actual;

  const sets = campos.map((c) => `${c} = ?`).join(', ');
  const valores = campos.map((c) => cambios[c]);

  await pool.query(`UPDATE configuracion SET ${sets} WHERE id = ?`, [...valores, actual.id]);
  const actualizado = await obtener();
  return { anterior: actual, nuevo: actualizado };
}

module.exports = { obtener, actualizar, CAMPOS };
