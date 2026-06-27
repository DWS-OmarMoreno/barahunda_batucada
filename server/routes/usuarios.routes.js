const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/usuarios.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.get('/:id/auditoria', controller.auditoria);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.patch('/:id/password', controller.cambiarPassword);
router.patch('/:id/activo', controller.cambiarActivo);

module.exports = router;
