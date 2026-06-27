const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const { uploadImportacion } = require('../middlewares/upload.middleware');
const controller = require('../controllers/importacion.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/historial', controller.historial);
router.get('/plantillas/:modulo', controller.descargarPlantilla);
router.post('/:modulo', uploadImportacion.single('archivo'), controller.importar);

module.exports = router;
