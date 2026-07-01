const { ok, fail } = require('../utils/respuesta');
const configuracionModel = require('../models/configuracion.model');
const { pool } = require('../config/db');

// GET /api/configuracion — pública, se consulta antes de iniciar sesión
// para aplicar el tema de colores y el nombre/logo de la escuela.
// smtp_password se omite siempre de la respuesta por seguridad.
async function obtener(req, res, next) {
  try {
    const config = await configuracionModel.obtener({ incluirSecretos: false });
    if (!config) return fail(res, { message: 'No hay configuración registrada', status: 404 });
    return ok(res, { data: config, message: 'Configuración obtenida' });
  } catch (err) {
    next(err);
  }
}

// PUT /api/configuracion — protegida (admin)
async function actualizar(req, res, next) {
  try {
    const resultado = await configuracionModel.actualizar(req.body || {});
    const { anterior, nuevo } = resultado;

    if (req.auditoria) {
      await req.auditoria.registrarCambios({
        modulo: 'CONFIGURACION',
        entidadId: nuevo.id,
        anterior,
        nuevo,
      });
    }

    return ok(res, { data: nuevo, message: 'Configuración actualizada correctamente' });
  } catch (err) {
    next(err);
  }
}

// POST /api/configuracion/logo — sube el logo y devuelve la URL pública
async function subirLogo(req, res, next) {
  try {
    if (!req.file) return fail(res, { message: 'No se recibió ningún archivo', status: 400 });
    const url = `/uploads/logos/${req.file.filename}`;
    return ok(res, { data: { url }, message: 'Logo subido correctamente' });
  } catch (err) {
    next(err);
  }
}

// GET /api/configuracion/auditoria — protegida
async function obtenerAuditoria(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS usuario_nombre
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.modulo = 'CONFIGURACION'
       ORDER BY a.fecha_hora DESC
       LIMIT 200`
    );
    return ok(res, { data: rows, message: 'Auditoría de configuración' });
  } catch (err) {
    next(err);
  }
}

// POST /api/configuracion/smtp/test — verifica la conexión SMTP con los datos guardados
async function probarSmtp(req, res, next) {
  try {
    const { verificarConexion } = require('../utils/email');
    await verificarConexion();
    return ok(res, { data: null, message: 'Conexión SMTP verificada correctamente' });
  } catch (err) {
    return fail(res, { message: `Error de conexión SMTP: ${err.message}`, status: 400 });
  }
}

module.exports = { obtener, actualizar, subirLogo, obtenerAuditoria, probarSmtp };
