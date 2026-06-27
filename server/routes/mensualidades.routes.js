const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const { uploadSoporte } = require('../middlewares/upload.middleware');
const controller = require('../controllers/mensualidades.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.get('/pendientes', controller.pendientes);
router.get('/al-dia', controller.alDia);
router.get('/auditoria', controller.auditoria);
router.get('/miembro/:id', controller.historialMiembro);

router.post('/pago', uploadSoporte.single('soporte'), controller.registrarPago);
router.put('/pago/:id', controller.actualizarPago);
router.delete('/pago/:id', controller.eliminarPago);

router.put('/valor/:miembroId', controller.actualizarValor);

module.exports = router;
