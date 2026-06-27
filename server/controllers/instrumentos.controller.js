const { ok } = require('../utils/respuesta');
const instrumentosModel = require('../models/instrumentos.model');

async function listar(req, res, next) {
  try {
    const filas = await instrumentosModel.listarActivos();
    return ok(res, { data: filas, message: 'Instrumentos obtenidos' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar };
