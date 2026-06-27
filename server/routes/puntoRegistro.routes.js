const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/puntoRegistro.controller');

// Todas protegidas: el enlace fijo solo lo debe conocer el admin que lo
// entrega al dispositivo del punto de registro, nunca los miembros.
router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.obtener);
router.post('/regenerar', controller.regenerar);

module.exports = router;
