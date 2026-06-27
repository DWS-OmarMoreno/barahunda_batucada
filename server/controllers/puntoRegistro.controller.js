const { ok } = require('../utils/respuesta');
const puntoRegistroModel = require('../models/puntoRegistro.model');

const MODULO = 'PUNTO_REGISTRO';

function construirUrl(token) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  return `${frontendUrl}/asistencia?token=${token}`;
}

function conUrl(punto) {
  return { ...punto, url: construirUrl(punto.token) };
}

// GET /api/punto-registro — protegida (admin). Si todavía no existe ningún
// punto de registro fijo, se crea automáticamente la primera vez.
async function obtener(req, res, next) {
  try {
    const punto = await puntoRegistroModel.obtenerOcrear();
    return ok(res, { data: conUrl(punto), message: 'Punto de registro obtenido' });
  } catch (err) {
    next(err);
  }
}

// POST /api/punto-registro/regenerar — protegida (admin). Invalida el enlace
// vigente y genera uno nuevo; el dispositivo del punto de registro deberá
// actualizarse con el nuevo enlace.
async function regenerar(req, res, next) {
  try {
    const actual = await puntoRegistroModel.obtenerOcrear();
    const { anterior, nuevo } = await puntoRegistroModel.regenerarToken(actual.id);

    if (req.auditoria) {
      await req.auditoria.registrarCambios({
        modulo: MODULO,
        entidadId: nuevo.id,
        anterior,
        nuevo,
      });
    }

    return ok(res, { data: conUrl(nuevo), message: 'Enlace regenerado correctamente. El enlace anterior ya no funciona.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { obtener, regenerar };
