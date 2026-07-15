const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const ctrl = require('../controllers/planesEstudio.controller');

router.use(verifyToken, auditoriaMiddleware);

// ── Planes ────────────────────────────────────────────────────────────────
router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', ctrl.actualizar);
router.post('/:id/activar', ctrl.activar);
router.post('/:id/desactivar', ctrl.desactivar);

// ── Secciones (estático antes que dinámico para evitar conflictos) ────────
router.get('/:id/secciones', ctrl.listarSecciones);
router.post('/:id/secciones', ctrl.crearSeccion);
router.put('/:id/secciones/reordenar', ctrl.reordenarSecciones);       // estático primero
router.put('/:id/secciones/:seccionId', ctrl.actualizarSeccion);
router.delete('/:id/secciones/:seccionId', ctrl.eliminarSeccion);

// Crear ítem dentro de una sección (vía URL)
router.post('/:id/secciones/:seccionId/items', ctrl.crearItem);

// ── Ítems (rutas heredadas, compatibilidad) ───────────────────────────────
router.get('/:id/items', ctrl.listarItems);
router.post('/:id/items', ctrl.crearItem);           // acepta seccion_id en body
router.put('/:id/items/:itemId', ctrl.actualizarItem);
router.delete('/:id/items/:itemId', ctrl.eliminarItem);
router.put('/:id/reordenar', ctrl.reordenarItems);

// ── Historial y calificaciones ────────────────────────────────────────────
router.get('/:id/historial', ctrl.historial);
router.patch('/:id/entregas/:entregaId/calificar', ctrl.calificarEntrega);
router.delete('/:id/entregas/:entregaId', ctrl.eliminarEntrega);
router.get('/:id/reporte', ctrl.reporte);

// ── Notificaciones ────────────────────────────────────────────────────────
router.post('/:id/notificar', ctrl.notificarPlan);
router.post('/:id/items/:itemId/notificar', ctrl.notificarItem);

module.exports = router;
