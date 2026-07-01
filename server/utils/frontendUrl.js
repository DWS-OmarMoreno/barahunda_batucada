// Devuelve la URL base del frontend para construir enlaces (QR, etc.).
// Prioridad: campo `dominio` de la tabla configuracion → variable FRONTEND_URL → localhost.
const configuracionModel = require('../models/configuracion.model');

async function getFrontendUrl() {
  try {
    const config = await configuracionModel.obtener();
    if (config?.dominio) {
      return config.dominio.replace(/\/+$/, '');
    }
  } catch (_) {
    // Si falla la consulta, caer al env
  }
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

module.exports = { getFrontendUrl };
