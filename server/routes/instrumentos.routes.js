const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const controller = require('../controllers/instrumentos.controller');

router.get('/', verifyToken, controller.listar);

module.exports = router;
