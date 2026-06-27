const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/asistencias.controller');

// Rutas públicas (sin autenticación): portal de autoregistro de asistencia.
// auditoriaMiddleware funciona igual sin sesión (usuario_id queda en null).
router.post('/publica', auditoriaMiddleware, controller.registrarPublica);
// Enlace fijo del único punto de registro de la sede (ver routes/puntoRegistro.routes.js).
router.post('/punto-fijo', auditoriaMiddleware, controller.registrarPuntoFijo);

// Rutas estáticas del panel admin antes de '/:id' para que no sean capturadas por el param.
router.get('/', verifyToken, controller.listar);
router.get('/contadores', verifyToken, controller.contadores);
router.get('/reporte', verifyToken, controller.reporte);
router.get('/con-ausentes', verifyToken, controller.conAusentes);
router.get('/:id', verifyToken, controller.obtener);
router.patch('/:id/anular', verifyToken, auditoriaMiddleware, controller.anular);
router.get('/:id/auditoria', verifyToken, controller.auditoria);

module.exports = router;
