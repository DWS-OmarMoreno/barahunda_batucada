const { pool } = require('../config/db');

const CAMPOS = [
  'escuela_nombre',
  'escuela_logo',
  'escuela_telefono',
  'escuela_direccion',
  'fecha_go_live',
  'zona_horaria',
  'dominio',
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_password',
  'smtp_from',
  'smtp_secure',
  'multa_valor_por_tardanza',
  'asistencia_tolerancia_minutos',
  'color_primario',
  'color_secundario',
  'color_acento',
  'color_texto',
  'color_fondo',
];

// Campos que no se devuelven en GET (seguridad)
const CAMPOS_OCULTOS = ['smtp_password'];

// El sistema maneja una única fila de configuración (la primera que exista).
async function obtener({ incluirSecretos = false } = {}) {
  const [rows] = await pool.query('SELECT * FROM configuracion ORDER BY id ASC LIMIT 1');
  if (!rows[0]) return null;
  const config = { ...rows[0] };
  if (!incluirSecretos) {
    CAMPOS_OCULTOS.forEach((c) => delete config[c]);
  }
  return config;
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

module.exports = { obtener, actualizar, CAMPOS, CAMPOS_OCULTOS };
