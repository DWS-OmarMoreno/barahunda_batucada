const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware');
const controller = require('../controllers/reportes.controller');

router.use(verifyToken, auditoriaMiddleware);

router.get('/dashboard', controller.dashboard);
router.get('/mensualidades', controller.mensualidades);
router.get('/pendientes', controller.pendientes);
router.get('/al-dia', controller.alDia);
router.get('/multas', controller.multas);
router.get('/asistencia-miembro', controller.asistenciaMiembro);
router.get('/asistencia-nivel', controller.asistenciaNivel);

module.exports = router;
