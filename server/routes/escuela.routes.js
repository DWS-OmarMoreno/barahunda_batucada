const express = require('express');
const router = express.Router();
const { verifyToken, verificarRol } = require('../middlewares/auth.middleware');
const c = require('../controllers/escuela.controller');

router.use(verifyToken, verificarRol('ADMIN'));

// Tareas
router.get('/tareas', c.listarTareas);
router.get('/tareas/:id', c.obtenerTarea);
router.post('/tareas', c.crearTarea);
router.put('/tareas/:id', c.actualizarTarea);
router.patch('/tareas/:id/toggle', c.toggleTarea);

// Guías
router.get('/guias', c.listarGuias);
router.get('/guias/:id', c.obtenerGuia);
router.post('/guias', c.crearGuia);
router.put('/guias/:id', c.actualizarGuia);
router.patch('/guias/:id/toggle', c.toggleGuia);

// Entregas (vista admin: listar + calificar + eliminar)
router.get('/entregas', c.listarEntregas);
router.patch('/entregas/:id/calificar', c.calificarEntrega);
router.delete('/entregas/:id', c.eliminarEntrega);

// Notificaciones de tareas
router.post('/tareas/:id/notificar', c.notificarTarea);

module.exports = router;
