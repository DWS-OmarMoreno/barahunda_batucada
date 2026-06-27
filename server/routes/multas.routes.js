const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/multas.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.get('/resumen', controller.resumen);
router.get('/auditoria', controller.auditoria);
router.get('/miembro/:id', controller.historialMiembro);
router.post('/', controller.crear);
router.get('/:id', controller.obtener);
router.patch('/:id/condonar', controller.condonar);
router.patch('/:id/pagar', controller.pagar);
router.delete('/:id', controller.eliminar);

module.exports = router;
