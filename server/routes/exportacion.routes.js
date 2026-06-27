const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/exportacion.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/:modulo', controller.exportar);

module.exports = router;
