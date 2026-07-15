const { pool } = require('../config/db');
const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const { reemplazarVariables, construirUrlWhatsApp } = require('../utils/whatsapp');
const { formatearMoneda } = require('../utils/formato');
const emailUtil = require('../utils/email');

const comunicacionesModel = require('../models/comunicaciones.model');
const plantillasModel = require('../models/plantillas.model');
const nivelesModel = require('../models/niveles.model');

const MODULO = 'COMUNICACIONES';
const TIPOS_VALIDOS = ['TODOS', 'POR_NIVEL', 'MANUAL'];
const CANALES_VALIDOS = ['WHATSAPP', 'EMAIL', 'AMBOS'];

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 20 });
    const { filas, total } = await comunicacionesModel.listar({ limite, offset });
    return ok(res, {
      data: filas,
      message: 'Historial de comunicaciones obtenido',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function enviar(req, res, next) {
  try {
    const { plantilla_id, destinatarios_tipo, nivel_id, miembro_ids, variables_extra, canal: canalRaw } = req.body || {};
    const canal = CANALES_VALIDOS.includes(canalRaw) ? canalRaw : 'WHATSAPP';

    if (!plantilla_id) return fail(res, { message: 'plantilla_id es obligatorio', status: 400 });
    if (!TIPOS_VALIDOS.includes(destinatarios_tipo)) {
      return fail(res, { message: `destinatarios_tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`, status: 400 });
    }

    const plantilla = await plantillasModel.obtenerPorId(plantilla_id);
    if (!plantilla) return fail(res, { message: 'Plantilla no encontrada', status: 404 });

    if (destinatarios_tipo === 'POR_NIVEL' && nivel_id) {
      const nivel = await nivelesModel.obtenerPorId(nivel_id);
      if (!nivel) return fail(res, { message: 'Nivel no encontrado', status: 404 });
    }

    const destinatarios = await comunicacionesModel.resolverDestinatarios({
      tipo: destinatarios_tipo,
      nivelId: nivel_id,
      miembroIds: miembro_ids,
    });

    if (destinatarios.length === 0) {
      return fail(res, { message: 'No se encontraron destinatarios con los criterios seleccionados', status: 400 });
    }

    const mensajes = destinatarios.map((d) => {
      const variables = {
        nombre: d.miembro_nombre,
        nivel: d.nivel_nombre || '',
        valor_mensualidad: formatearMoneda(d.valor_mensualidad),
        ...(variables_extra || {}),
      };
      const mensaje = reemplazarVariables(plantilla.contenido, variables);
      const url = (canal === 'WHATSAPP' || canal === 'AMBOS') && d.whatsapp
        ? construirUrlWhatsApp(d.whatsapp, mensaje)
        : null;

      return {
        miembro_id: d.miembro_id,
        miembro_nombre: d.miembro_nombre,
        whatsapp: d.whatsapp || null,
        email: d.email || null,
        mensaje,
        url,
        canal,
      };
    });

    // Envío por email si aplica
    if (canal === 'EMAIL' || canal === 'AMBOS') {
      const asunto = plantilla.nombre || 'Mensaje de la escuela';
      for (const m of mensajes) {
        if (m.email) {
          await emailUtil.enviarMensaje(
            { email: m.email, nombre: m.miembro_nombre },
            { asunto, cuerpo: m.mensaje }
          ).catch(() => {}); // silencioso para no bloquear la respuesta
        }
      }
    }

    const comunicacion = await comunicacionesModel.crear({
      plantilla_id,
      destinatarios_tipo,
      nivel_id: destinatarios_tipo === 'POR_NIVEL' ? nivel_id : null,
      mensaje_generado: plantilla.contenido,
      total_destinatarios: mensajes.length,
      enviado_por: req.usuario ? req.usuario.id : null,
      canal,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({
        modulo: MODULO, accion: 'CREATE', entidadId: comunicacion.id,
        detalle: { plantilla_id, destinatarios_tipo, nivel_id, total_destinatarios: mensajes.length },
      });
    }

    return ok(res, {
      data: { comunicacion, mensajes },
      message: 'Mensajes generados correctamente',
      status: 201,
    });
  } catch (err) {
    next(err);
  }
}

async function auditoria(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS usuario_nombre
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.modulo = ?
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [MODULO]
    );
    return ok(res, { data: rows, message: 'Auditoría de comunicaciones' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, enviar, auditoria };
