// Consultas de solo lectura usadas por el módulo de Exportación: un dump
// completo (registros activos) de cada módulo exportable, con los joins
// mínimos necesarios para que el Excel resultante muestre nombres legibles
// en vez de solo IDs.
const { pool } = require('../config/db');

async function miembros() {
  const [rows] = await pool.query('SELECT * FROM miembros WHERE activo = 1 ORDER BY nombres_completos ASC');
  return rows;
}

async function niveles() {
  const [rows] = await pool.query('SELECT * FROM niveles WHERE activo = 1 ORDER BY nombre ASC');
  return rows;
}

async function horarios() {
  const [rows] = await pool.query(
    `SELECT h.*, n.nombre AS nivel_nombre
     FROM horarios h
     JOIN niveles n ON n.id = h.nivel_id
     WHERE h.activo = 1
     ORDER BY n.nombre ASC,
       FIELD(h.dia_semana, 'LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO'),
       h.hora_inicio ASC`
  );
  return rows;
}

async function instrumentos() {
  const [rows] = await pool.query('SELECT * FROM instrumentos WHERE activo = 1 ORDER BY nombre ASC');
  return rows;
}

async function pagos() {
  const [rows] = await pool.query(
    `SELECT p.*, m.nombres_completos, m.numero_documento
     FROM pagos p
     JOIN miembros m ON m.id = p.miembro_id
     WHERE p.activo = 1
     ORDER BY p.anio_correspondiente DESC, p.mes_correspondiente DESC, p.fecha_pago DESC`
  );
  return rows;
}

async function asistencias() {
  const [rows] = await pool.query(
    `SELECT a.*, m.nombres_completos, m.numero_documento, n.nombre AS nivel_nombre
     FROM asistencias a
     JOIN miembros m ON m.id = a.miembro_id
     JOIN niveles n ON n.id = a.nivel_id
     WHERE a.activo = 1
     ORDER BY a.fecha DESC, a.hora DESC`
  );
  return rows;
}

async function multas() {
  const [rows] = await pool.query(
    `SELECT mu.*, m.nombres_completos, m.numero_documento
     FROM multas mu
     JOIN miembros m ON m.id = mu.miembro_id
     WHERE mu.activo = 1
     ORDER BY mu.fecha_generada DESC`
  );
  return rows;
}

async function eventos() {
  const [rows] = await pool.query('SELECT * FROM eventos WHERE activo = 1 ORDER BY fecha DESC');
  return rows;
}

async function comunicaciones() {
  const [rows] = await pool.query(
    `SELECT c.*, pl.nombre AS plantilla_nombre, n.nombre AS nivel_nombre, u.nombre AS enviado_por_nombre
     FROM comunicaciones c
     LEFT JOIN plantillas_whatsapp pl ON pl.id = c.plantilla_id
     LEFT JOIN niveles n ON n.id = c.nivel_id
     LEFT JOIN usuarios u ON u.id = c.enviado_por
     WHERE c.activo = 1
     ORDER BY c.created_at DESC`
  );
  return rows;
}

module.exports = { miembros, niveles, horarios, instrumentos, pagos, asistencias, multas, eventos, comunicaciones };
