const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middlewares/auth.middleware');
const controller = require('../controllers/portal.controller');

// Todas las rutas del portal requieren sesión + rol MIEMBRO
router.use(verifyToken, verificarRol('MIEMBRO'));

router.get('/perfil', controller.perfil);
router.get('/mis-asistencias', controller.misAsistencias);
router.get('/mis-mensualidades', controller.misMensualidades);
router.get('/mis-tareas', controller.misTareas);
router.post('/entregar', controller.entregar);

module.exports = router;
