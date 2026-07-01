const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/horarios.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.patch('/:id/toggle', controller.toggle);
router.delete('/:id', controller.eliminar);
router.get('/:id/qr', controller.qr);
router.get('/:id/auditoria', controller.auditoria);

module.exports = router;
