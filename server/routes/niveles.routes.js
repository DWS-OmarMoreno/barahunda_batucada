const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/niveles.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.patch('/:id/inactivar', controller.inactivar);
router.get('/:id/miembros', controller.miembros);
router.get('/:id/auditoria', controller.auditoria);

module.exports = router;
