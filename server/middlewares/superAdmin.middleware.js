// Solo el administrador con el ID más bajo (más antiguo) puede acceder.
const { pool } = require('../config/db');
const { fail } = require('../utils/respuesta');

async function superAdmin(req, res, next) {
  if (!req.usuario) {
    return fail(res, { message: 'No autenticado', status: 401 });
  }
  if (req.usuario.rol !== 'ADMIN') {
    return fail(res, { message: 'Acceso denegado', status: 403 });
  }
  try {
    const [[row]] = await pool.query(
      `SELECT MIN(id) AS min_id FROM usuarios WHERE rol = 'ADMIN' AND activo = 1`
    );
    if (!row || row.min_id !== req.usuario.id) {
      return fail(res, { message: 'Solo el super administrador puede acceder a esta sección', status: 403 });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { superAdmin };
