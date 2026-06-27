const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/eventos.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.post('/', controller.crear);
router.get('/:id', controller.obtener);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);
router.get('/:id/auditoria', controller.auditoria);
router.post('/:id/miembros', controller.agregarMiembro);
router.put('/:id/miembros/:miembroId', controller.actualizarMiembro);
router.delete('/:id/miembros/:miembroId', controller.quitarMiembro);

module.exports = router;
