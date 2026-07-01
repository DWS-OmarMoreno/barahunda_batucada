const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middlewares/auth.middleware');
const c = require('../controllers/correo.controller');

router.use(verifyToken, verificarRol('ADMIN'));

// Plantillas
router.get('/plantillas', c.listarPlantillas);
router.get('/plantillas/:id', c.obtenerPlantilla);
router.put('/plantillas/:id', c.actualizarPlantilla);

// Envíos
router.post('/bienvenida/:miembroId', c.enviarBienvenida);
router.post('/tarea-asignada/:tareaId', c.enviarTareaAsignada);
router.post('/tarea-calificada/:entregaId', c.enviarTareaCalificada);
router.post('/recordatorio/:miembroId', c.enviarRecordatorio);

module.exports = router;
