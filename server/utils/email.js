// Servicio de envío de correo usando nodemailer + configuración SMTP de la BD.
// Importa la config de BD cada vez que se invoca para reflejar cambios sin
// reiniciar el servidor.
const nodemailer = require('nodemailer');
const configuracionModel = require('../models/configuracion.model');
const { pool } = require('../config/db');

// Sustituye variables {clave} en la plantilla con los valores del objeto data.
function renderizarPlantilla(texto, datos) {
  return texto.replace(/\{(\w+)\}/g, (_, clave) => {
    return datos[clave] !== undefined ? String(datos[clave]) : `{${clave}}`;
  });
}

async function obtenerTransporter() {
  const config = await configuracionModel.obtener({ incluirSecretos: true });
  if (!config.smtp_host || !config.smtp_user) {
    throw Object.assign(new Error('SMTP no configurado. Ve a Configuración → Correo electrónico.'), { status: 503 });
  }
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: Number(config.smtp_port) || 587,
    secure: !!config.smtp_secure,
    auth: { user: config.smtp_user, pass: config.smtp_password },
  });
}

async function obtenerPlantilla(clave) {
  const [rows] = await pool.query(
    'SELECT * FROM plantillas_correo WHERE clave = ? AND activo = 1 LIMIT 1',
    [clave]
  );
  if (!rows[0]) throw Object.assign(new Error(`Plantilla de correo "${clave}" no encontrada o inactiva`), { status: 404 });
  return rows[0];
}

// Envía un correo usando una plantilla de la BD.
// destinatario: { email, nombre } (puede ser correo_institucional o email personal)
// datos: objeto con las variables de la plantilla
async function enviarConPlantilla(clave, destinatario, datos) {
  if (!destinatario?.email) return; // silencioso si no hay correo

  const config = await configuracionModel.obtener({ incluirSecretos: false });
  const plantilla = await obtenerPlantilla(clave);
  const transporter = await obtenerTransporter();

  const datosConConfig = {
    ...datos,
    escuela_nombre: config.escuela_nombre || 'Escuela de Música',
  };

  await transporter.sendMail({
    from: config.smtp_from || config.smtp_user,
    to: destinatario.email,
    subject: renderizarPlantilla(plantilla.asunto, datosConConfig),
    html: renderizarPlantilla(plantilla.cuerpo, datosConConfig),
  });
}

// Envía directamente sin plantilla de BD (asunto y cuerpo ya renderizados)
async function enviarMensaje(destinatario, { asunto, cuerpo }) {
  if (!destinatario?.email) return;
  const config = await configuracionModel.obtener({ incluirSecretos: false });
  const transporter = await obtenerTransporter();
  await transporter.sendMail({
    from: config.smtp_from || config.smtp_user,
    to: destinatario.email,
    subject: asunto || 'Mensaje de la escuela',
    html: `<div style="font-family:sans-serif;max-width:600px">${cuerpo.replace(/\n/g, '<br>')}</div>`,
  });
}

// Envía directamente sin plantilla (para prueba de conexión)
async function verificarConexion() {
  const transporter = await obtenerTransporter();
  await transporter.verify();
}

module.exports = { enviarConPlantilla, enviarMensaje, verificarConexion, renderizarPlantilla };
