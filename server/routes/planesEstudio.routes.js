const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const ctrl = require('../controllers/planesEstudio.controller');

router.use(verifyToken, auditoriaMiddleware);

// Planes
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.post('/:id/activar', ctrl.activar);
router.post('/:id/desactivar', ctrl.desactivar);

// Ítems
router.get('/:id/items', ctrl.listarItems);
router.post('/:id/items', ctrl.crearItem);
router.put('/:id/items/:itemId', ctrl.actualizarItem);
router.delete('/:id/items/:itemId', ctrl.eliminarItem);
router.put('/:id/reordenar', ctrl.reordenarItems);

// Historial y calificaciones
router.get('/:id/historial', ctrl.historial);
router.patch('/:id/entregas/:entregaId/calificar', ctrl.calificarEntrega);
router.get('/:id/reporte', ctrl.reporte);

module.exports = router;
