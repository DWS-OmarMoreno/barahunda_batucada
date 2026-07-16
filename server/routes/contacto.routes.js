// Ruta pública — no requiere JWT
const express = require('express');
const router = express.Router();
const { enviarContacto } = require('../controllers/contacto.controller');

router.post('/', enviarContacto);

module.exports = router;
