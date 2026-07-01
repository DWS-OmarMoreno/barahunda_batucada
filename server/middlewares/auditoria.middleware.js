// Middleware que se monta globalmente (después de verifyToken) y expone
// en cada request un helper `req.auditoria` ya atado al usuario autenticado
// y a la IP de origen, para que los controladores no tengan que repetir
// esa información en cada llamada.
const { registrar, registrarCambios, registrarAccion } = require('../utils/auditoria');

function auditoriaMiddleware(req, res, next) {
  const usuarioId = req.usuario ? req.usuario.id : null;
  const usuarioEmail = req.usuario ? req.usuario.email : null;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

  req.auditoria = {
    registrar: (params) => registrar({ usuarioId, usuarioEmail, ip, ...params }),
    registrarCambios: (params) => registrarCambios({ usuarioId, usuarioEmail, ip, ...params }),
    registrarAccion: (params) => registrarAccion({ usuarioId, usuarioEmail, ip, ...params }),
  };

  next();
}

module.exports = auditoriaMiddleware;
