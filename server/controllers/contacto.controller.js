// Endpoint público para el formulario de contacto del sitio web.
// No requiere autenticación.
const { enviarMensaje } = require('../utils/email');
const configuracionModel = require('../models/configuracion.model');

async function enviarContacto(req, res, next) {
  const { nombre, email, telefono, tipoEvento, mensaje } = req.body;

  if (!nombre?.trim() || !mensaje?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nombre y mensaje son requeridos.',
    });
  }

  try {
    const config = await configuracionModel.obtener({ incluirSecretos: true });

    // Destino: variable de entorno CONTACT_EMAIL, o el correo configurado en el sistema.
    const destino = process.env.CONTACT_EMAIL || config.smtp_from || config.smtp_user;

    if (!destino) {
      return res.status(503).json({
        success: false,
        message: 'El correo de contacto no está configurado aún. Por favor comunícate directamente por WhatsApp.',
      });
    }

    const lineas = [
      `<p><strong>Nombre:</strong> ${nombre}</p>`,
      email    ? `<p><strong>Correo:</strong> <a href="mailto:${email}">${email}</a></p>` : '',
      telefono ? `<p><strong>Teléfono / WhatsApp:</strong> ${telefono}</p>` : '',
      tipoEvento ? `<p><strong>Tipo de evento:</strong> ${tipoEvento}</p>` : '',
      `<p><strong>Mensaje:</strong></p><p>${mensaje.replace(/\n/g, '<br>')}</p>`,
    ].filter(Boolean).join('\n');

    await enviarMensaje(
      { email: destino },
      {
        asunto: `[Sitio web] Nuevo contacto${tipoEvento ? ` — ${tipoEvento}` : ''} de ${nombre}`,
        cuerpo: `
          <div style="font-family:sans-serif;max-width:600px;color:#333">
            <h2 style="color:#D4A017;border-bottom:2px solid #D4A017;padding-bottom:8px">
              Nueva consulta desde el sitio web
            </h2>
            ${lineas}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
            <p style="font-size:12px;color:#999">
              Este mensaje fue enviado desde el formulario de contacto de barahundabatucada.com.co
            </p>
          </div>
        `,
      }
    );

    res.json({ success: true, message: '¡Mensaje enviado! Nos pondremos en contacto pronto.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { enviarContacto };
