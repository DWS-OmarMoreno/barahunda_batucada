const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/comunicaciones.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.post('/enviar', controller.enviar);
router.get('/auditoria', controller.auditoria);

module.exports = router;
