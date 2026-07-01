const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const { uploadSoporte } = require('../middlewares/upload.middleware');
const controller = require('../controllers/miembros.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.patch('/:id/inactivar', controller.inactivar);

router.get('/:id/niveles', controller.listarNiveles);
router.post('/:id/niveles', controller.agregarNivel);
router.put('/:id/niveles/:nivelRegistroId', controller.actualizarNivel);
router.delete('/:id/niveles/:nivelRegistroId', controller.quitarNivel);

router.get('/:id/contactos', controller.listarContactos);
router.post('/:id/contactos', controller.agregarContacto);
router.put('/:id/contactos/:contactoId', controller.actualizarContacto);
router.delete('/:id/contactos/:contactoId', controller.eliminarContacto);

router.get('/:id/pagos', controller.listarPagos);
router.post('/:id/pagos', uploadSoporte.single('soporte'), controller.registrarPago);

router.get('/:id/auditoria', controller.auditoria);
router.get('/:id/whatsapp-recordatorio', controller.whatsappRecordatorio);
router.post('/:id/generar-correo', controller.generarCorreo);
router.post('/:id/conceder-acceso', controller.concederAcceso);
router.post('/:id/remover-acceso', controller.removerAcceso);

module.exports = router;
