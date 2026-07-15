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

// ── BD Management (solo super admin) ─────────────────────────────────────────

// Tablas permitidas (excluye 'configuracion' para no romper la app)
const TABLAS_PERMITIDAS = new Set([
  'niveles', 'instrumentos', 'horarios',
  'miembros', 'miembro_niveles', 'contactos_emergencia',
  'mensualidades', 'pagos', 'asistencias', 'multas',
  'eventos', 'evento_miembros',
  'plantillas_whatsapp', 'comunicaciones',
  'auditoria', 'importaciones', 'puntos_registro', 'plantillas_correo',
  'tareas', 'guias', 'entregas',
  'planes_estudio', 'plan_secciones', 'plan_items',
  'usuarios',
]);

const ETIQUETAS_TABLAS = {
  niveles: 'Niveles', instrumentos: 'Instrumentos', horarios: 'Horarios',
  miembros: 'Miembros', miembro_niveles: 'Inscripciones',
  contactos_emergencia: 'Contactos emergencia',
  mensualidades: 'Mensualidades', pagos: 'Pagos',
  asistencias: 'Asistencias', multas: 'Multas',
  eventos: 'Eventos', evento_miembros: 'Participantes eventos',
  plantillas_whatsapp: 'Plantillas WhatsApp', comunicaciones: 'Comunicaciones',
  auditoria: 'Auditoría', importaciones: 'Importaciones',
  puntos_registro: 'Puntos de registro', plantillas_correo: 'Plantillas correo',
  tareas: 'Tareas', guias: 'Guías', entregas: 'Entregas',
  planes_estudio: 'Planes de estudio', plan_secciones: 'Secciones',
  plan_items: 'Ítems de planes', usuarios: 'Usuarios',
};

// GET /api/configuracion/bd/resumen — conteo de registros por tabla
async function bdResumen(req, res, next) {
  try {
    const tablas = [...TABLAS_PERMITIDAS];
    const resultados = await Promise.all(
      tablas.map(async (tabla) => {
        const [[row]] = await pool.query(`SELECT COUNT(*) AS total FROM \`${tabla}\``);
        return { tabla, etiqueta: ETIQUETAS_TABLAS[tabla] || tabla, total: row.total };
      })
    );
    return ok(res, { data: resultados, message: 'Resumen obtenido' });
  } catch (err) { next(err); }
}

// GET /api/configuracion/bd/tabla/:tabla?page=1&limit=50 — registros paginados
async function bdListar(req, res, next) {
  try {
    const { tabla } = req.params;
    if (!TABLAS_PERMITIDAS.has(tabla)) {
      return fail(res, { message: 'Tabla no permitida', status: 400 });
    }
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM \`${tabla}\``);
    const [rows] = await pool.query(
      `SELECT * FROM \`${tabla}\` ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return ok(res, {
      data: rows,
      message: 'Registros obtenidos',
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
}

// DELETE /api/configuracion/bd/tabla/:tabla/:id — eliminar un registro
async function bdEliminarUno(req, res, next) {
  try {
    const { tabla, id } = req.params;
    if (!TABLAS_PERMITIDAS.has(tabla)) {
      return fail(res, { message: 'Tabla no permitida', status: 400 });
    }
    // Protección: no puede eliminarse a sí mismo si es usuarios
    if (tabla === 'usuarios' && parseInt(id) === req.usuario.id) {
      return fail(res, { message: 'No puedes eliminar tu propia cuenta', status: 400 });
    }
    const [result] = await pool.query(`DELETE FROM \`${tabla}\` WHERE id = ?`, [id]);
    if (result.affectedRows === 0) {
      return fail(res, { message: 'Registro no encontrado', status: 404 });
    }
    return ok(res, { data: null, message: 'Registro eliminado' });
  } catch (err) { next(err); }
}

// DELETE /api/configuracion/bd/tabla/:tabla — eliminar TODOS los registros
async function bdEliminarTodos(req, res, next) {
  try {
    const { tabla } = req.params;
    if (!TABLAS_PERMITIDAS.has(tabla)) {
      return fail(res, { message: 'Tabla no permitida', status: 400 });
    }
    // Protección: en usuarios no se puede truncar (quedaría sin super admin)
    if (tabla === 'usuarios') {
      return fail(res, { message: 'La tabla de usuarios no puede vaciarse desde aquí', status: 400 });
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query(`TRUNCATE TABLE \`${tabla}\``);
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    return ok(res, { data: null, message: `Tabla ${tabla} vaciada correctamente` });
  } catch (err) {
    await pool.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    next(err);
  }
}

module.exports = { obtener, actualizar, subirLogo, obtenerAuditoria, probarSmtp, bdResumen, bdListar, bdEliminarUno, bdEliminarTodos };
