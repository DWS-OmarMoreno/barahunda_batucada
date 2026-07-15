const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const { uploadLogo } = require('../middlewares/upload.middleware');
const { superAdmin } = require('../middlewares/superAdmin.middleware');
const controller = require('../controllers/configuracion.controller');

// Pública: el frontend la consulta al cargar la app (tema de colores), incluso sin sesión.
router.get('/', controller.obtener);

// Protegidas: solo el admin autenticado puede modificar la configuración.
router.put('/', verifyToken, auditoriaMiddleware, controller.actualizar);
router.post('/logo', verifyToken, uploadLogo.single('logo'), controller.subirLogo);
router.get('/auditoria', verifyToken, controller.obtenerAuditoria);
router.post('/smtp/test', verifyToken, controller.probarSmtp);

// ── BD Management — solo super admin ─────────────────────────────────────────
router.get('/bd/resumen', verifyToken, superAdmin, controller.bdResumen);
router.get('/bd/tabla/:tabla', verifyToken, superAdmin, controller.bdListar);
router.delete('/bd/tabla/:tabla/:id', verifyToken, superAdmin, controller.bdEliminarUno);
router.delete('/bd/tabla/:tabla', verifyToken, superAdmin, controller.bdEliminarTodos);

module.exports = router;
