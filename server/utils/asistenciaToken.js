// Token rotativo para los códigos QR de autoregistro de asistencia.
//
// En vez de guardar tokens en la base de datos (con su propia limpieza de
// expirados), se usa un esquema sin estado: el token es un HMAC del
// horario_id y un "bucket" de tiempo (Date.now() dividido en intervalos de
// ASISTENCIA_TOKEN_INTERVALO_MS). Cualquiera que conozca el secreto del
// servidor puede recalcularlo, pero nadie fuera del servidor puede
// adivinarlo, y como cambia cada pocos minutos, una foto o reenvío del
// enlace fuera de ese lapso deja de servir.
//
// Se acepta el bucket actual y el inmediatamente anterior para tolerar el
// caso borde de un escaneo justo cuando el token está rotando.
const crypto = require('crypto');

const SECRET = process.env.ASISTENCIA_TOKEN_SECRET || 'cambia_esto_por_un_secreto_largo_y_aleatorio';
const INTERVALO_MS = Number(process.env.ASISTENCIA_TOKEN_INTERVALO_MS) || 180000; // 3 minutos

function calcularBucket(timestamp = Date.now()) {
  return Math.floor(timestamp / INTERVALO_MS);
}

function generarTokenParaBucket(horarioId, bucket) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${horarioId}:${bucket}`)
    .digest('hex')
    .slice(0, 16);
}

// Genera el token vigente para un horario, junto con cuánto falta (ms)
// para que rote, útil para que el frontend sepa cuándo refrescar el QR.
function generarToken(horarioId) {
  const ahora = Date.now();
  const bucket = calcularBucket(ahora);
  return {
    token: generarTokenParaBucket(horarioId, bucket),
    expiraEnMs: INTERVALO_MS - (ahora % INTERVALO_MS),
    intervaloMs: INTERVALO_MS,
  };
}

function validarToken(horarioId, token) {
  if (!horarioId || !token) return false;
  const bucketActual = calcularBucket();
  return (
    generarTokenParaBucket(horarioId, bucketActual) === String(token) ||
    generarTokenParaBucket(horarioId, bucketActual - 1) === String(token)
  );
}

module.exports = { generarToken, validarToken, INTERVALO_MS };
