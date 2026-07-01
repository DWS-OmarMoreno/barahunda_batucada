const { pool } = require('../config/db');
const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const { reemplazarVariables, construirUrlWhatsApp } = require('../utils/whatsapp');
const { NOMBRES_MES, formatearMoneda } = require('../utils/formato');

const miembrosModel = require('../models/miembros.model');
const miembroNivelesModel = require('../models/miembroNiveles.model');
const contactosModel = require('../models/contactos.model');
const pagosModel = require('../models/pagos.model');
const mensualidadModel = require('../models/mensualidad.model');
const configuracionModel = require('../models/configuracion.model');
const usuarioModel = require('../models/usuario.model');

const MODULO = 'MIEMBROS';

// ---------- CRUD principal ----------

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 20, limitMaximo: 100 });
    const { busqueda, activo, nivel_id } = req.query;

    const { filas, total } = await miembrosModel.listar({
      busqueda: busqueda || '',
      activo,
      nivelId: nivel_id || null,
      limite,
      offset,
    });

    return ok(res, {
      data: filas,
      message: 'Miembros obtenidos',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const [niveles, contactos, mensualidad, dosMesesPendientes] = await Promise.all([
      miembroNivelesModel.listarPorMiembro(miembro.id),
      contactosModel.listarPorMiembro(miembro.id),
      mensualidadModel.obtenerPorMiembro(miembro.id),
      mensualidadModel.tieneDosMesesPendientes(miembro.id),
    ]);

    // La asistencia es obligatoria si se marcó manualmente o si lleva 2+
    // meses sin pagar sin estar exento (ver mensualidad.model.tieneDosMesesPendientes).
    const asistenciaObligatoriaEfectiva = !!miembro.asistencia_obligatoria || dosMesesPendientes;

    return ok(res, {
      data: {
        ...miembro,
        niveles,
        contactos,
        mensualidad,
        dos_meses_pendientes: dosMesesPendientes,
        asistencia_obligatoria_efectiva: asistenciaObligatoriaEfectiva,
      },
      message: 'Miembro obtenido',
    });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const { nombres_completos, tipo_documento, numero_documento, whatsapp } = req.body || {};
    if (!nombres_completos || !tipo_documento || !numero_documento || !whatsapp) {
      return fail(res, {
        message: 'nombres_completos, tipo_documento, numero_documento y whatsapp son obligatorios',
        status: 400,
      });
    }

    const existente = await miembrosModel.obtenerPorDocumento(numero_documento);
    if (existente) {
      return fail(res, { message: 'Ya existe un miembro con ese número de documento', status: 409 });
    }

    // Obtener dominio configurado para auto-generar correo institucional
    const config = await configuracionModel.obtener();
    const dominio = config?.dominio || null;
    const miembro = await miembrosModel.crear(req.body, dominio);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: miembro.id, detalle: miembro });
    }

    return ok(res, { data: miembro, message: 'Miembro creado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const { numero_documento } = req.body || {};
    if (numero_documento) {
      const existente = await miembrosModel.obtenerPorDocumento(numero_documento);
      if (existente && existente.id !== Number(req.params.id)) {
        return fail(res, { message: 'Ya existe otro miembro con ese número de documento', status: 409 });
      }
    }

    const { anterior, nuevo } = await miembrosModel.actualizar(req.params.id, req.body || {});

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Miembro actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function inactivar(req, res, next) {
  try {
    const actual = await miembrosModel.obtenerPorId(req.params.id);
    if (!actual) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const nuevoEstado = req.body?.activo !== undefined ? !!req.body.activo : !actual.activo;
    const { anterior, nuevo } = await miembrosModel.cambiarActivo(req.params.id, nuevoEstado);

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: nuevo.activo ? 'Miembro activado' : 'Miembro inactivado' });
  } catch (err) {
    next(err);
  }
}

// ---------- Sub-recurso: niveles asignados (miembro_niveles) ----------

async function listarNiveles(req, res, next) {
  try {
    const filas = await miembroNivelesModel.listarPorMiembro(req.params.id);
    return ok(res, { data: filas, message: 'Niveles del miembro obtenidos' });
  } catch (err) {
    next(err);
  }
}

async function agregarNivel(req, res, next) {
  try {
    const { nivel_id, instrumento_id } = req.body || {};
    if (!nivel_id || !instrumento_id) {
      return fail(res, { message: 'nivel_id e instrumento_id son obligatorios', status: 400 });
    }

    const registro = await miembroNivelesModel.agregar(req.params.id, req.body);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: Number(req.params.id), detalle: registro });
    }

    return ok(res, { data: registro, message: 'Nivel asignado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizarNivel(req, res, next) {
  try {
    const { anterior, nuevo } = await miembroNivelesModel.actualizar(req.params.nivelRegistroId, req.body || {});

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: Number(req.params.id), anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Progreso actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function quitarNivel(req, res, next) {
  try {
    const { anterior, nuevo } = await miembroNivelesModel.quitar(req.params.nivelRegistroId);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'DELETE', entidadId: Number(req.params.id), detalle: anterior });
    }

    return ok(res, { data: nuevo, message: 'Nivel retirado correctamente' });
  } catch (err) {
    next(err);
  }
}

// ---------- Sub-recurso: contactos de emergencia ----------

async function listarContactos(req, res, next) {
  try {
    const filas = await contactosModel.listarPorMiembro(req.params.id);
    return ok(res, { data: filas, message: 'Contactos de emergencia obtenidos' });
  } catch (err) {
    next(err);
  }
}

async function agregarContacto(req, res, next) {
  try {
    const { nombre, telefono } = req.body || {};
    if (!nombre || !telefono) {
      return fail(res, { message: 'nombre y telefono son obligatorios', status: 400 });
    }

    const contacto = await contactosModel.agregar(req.params.id, req.body);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: Number(req.params.id), detalle: contacto });
    }

    return ok(res, { data: contacto, message: 'Contacto agregado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

async function actualizarContacto(req, res, next) {
  try {
    const { anterior, nuevo } = await contactosModel.actualizar(req.params.contactoId, req.body || {});

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: Number(req.params.id), anterior, nuevo });
    }

    return ok(res, { data: nuevo, message: 'Contacto actualizado correctamente' });
  } catch (err) {
    next(err);
  }
}

async function eliminarContacto(req, res, next) {
  try {
    const anterior = await contactosModel.eliminar(req.params.contactoId);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'DELETE', entidadId: Number(req.params.id), detalle: anterior });
    }

    return ok(res, { data: null, message: 'Contacto eliminado correctamente' });
  } catch (err) {
    next(err);
  }
}

// ---------- Sub-recurso: pagos ----------

async function listarPagos(req, res, next) {
  try {
    const filas = await pagosModel.listarPorMiembro(req.params.id);
    return ok(res, { data: filas, message: 'Pagos del miembro obtenidos' });
  } catch (err) {
    next(err);
  }
}

async function registrarPago(req, res, next) {
  try {
    const { valor, fecha_pago, mes_correspondiente, anio_correspondiente, observaciones } = req.body || {};
    if (!valor || !fecha_pago || !mes_correspondiente || !anio_correspondiente) {
      return fail(res, {
        message: 'valor, fecha_pago, mes_correspondiente y anio_correspondiente son obligatorios',
        status: 400,
      });
    }

    const soporte_url = req.file ? `/uploads/soportes/${req.file.filename}` : null;

    const pago = await pagosModel.crear({
      miembro_id: req.params.id,
      valor,
      fecha_pago,
      mes_correspondiente,
      anio_correspondiente,
      soporte_url,
      observaciones,
      registrado_por: req.usuario?.id || null,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: Number(req.params.id), detalle: pago });
    }

    return ok(res, { data: pago, message: 'Pago registrado correctamente', status: 201 });
  } catch (err) {
    next(err);
  }
}

// ---------- Auditoría ----------

async function auditoria(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, u.nombre AS usuario_nombre
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.modulo = ? AND a.entidad_id = ?
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [MODULO, req.params.id]
    );
    return ok(res, { data: rows, message: 'Auditoría del miembro' });
  } catch (err) {
    next(err);
  }
}

// ---------- WhatsApp: recordatorio de mensualidad ----------

async function whatsappRecordatorio(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const nivelesActivos = await miembroNivelesModel.listarActivosPorMiembro(miembro.id);
    const nivelNombre = nivelesActivos[0]?.nivel_nombre || 'general';

    const mensualidad = await mensualidadModel.obtenerPorMiembro(miembro.id);
    const valorMensualidad = mensualidad?.valor_mensualidad || 0;

    const ahora = new Date();
    const mesActual = ahora.getMonth() + 1;
    const anioActual = ahora.getFullYear();
    const pagadoEsteMes = await pagosModel.totalPagadoMes(miembro.id, mesActual, anioActual);
    const tienePendiente = pagadoEsteMes < valorMensualidad;

    const [plantillas] = await pool.query(
      "SELECT contenido FROM plantillas_whatsapp WHERE nombre = 'Recordatorio de mensualidad' AND activo = 1 LIMIT 1"
    );
    const plantilla = plantillas[0]?.contenido ||
      'Hola {nombre}, te recordamos el pago de la mensualidad de {nivel} correspondiente a {mes_pendiente} por {valor_mensualidad}.';

    const mensaje = reemplazarVariables(plantilla, {
      nombre: miembro.nombres_completos,
      nivel: nivelNombre,
      valor_mensualidad: formatearMoneda(valorMensualidad),
      mes_pendiente: NOMBRES_MES[mesActual - 1],
    });

    const url = construirUrlWhatsApp(miembro.whatsapp, mensaje);

    return ok(res, { data: { url, mensaje, tienePendiente }, message: 'Enlace de WhatsApp generado' });
  } catch (err) {
    next(err);
  }
}

// POST /api/miembros/:id/generar-correo — genera correo institucional si no tiene
async function generarCorreo(req, res, next) {
  try {
    const config = await configuracionModel.obtener();
    const dominio = config?.dominio;
    if (!dominio) {
      return fail(res, { message: 'Configura el dominio en Configuración antes de generar correos institucionales', status: 400 });
    }
    const miembro = await miembrosModel.asignarCorreoInstitucional(req.params.id, dominio);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'UPDATE', entidadId: miembro.id, detalle: { correo_institucional: miembro.correo_institucional } });
    }

    return ok(res, { data: miembro, message: 'Correo institucional generado correctamente' });
  } catch (err) {
    next(err);
  }
}

// POST /api/miembros/:id/conceder-acceso
// Crea o reactiva la cuenta de portal del miembro. La contraseña temporal es su número de documento.
async function concederAcceso(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    const emailAcceso = miembro.correo_institucional || miembro.email;
    if (!emailAcceso) {
      return fail(res, { message: 'El miembro no tiene correo institucional ni personal. Genera un correo primero.', status: 400 });
    }
    if (!miembro.numero_documento) {
      return fail(res, { message: 'El miembro no tiene número de documento registrado.', status: 400 });
    }

    const usuario = await usuarioModel.concederAcceso({
      miembroId: miembro.id,
      nombre: miembro.nombres_completos,
      email: emailAcceso,
      password: miembro.numero_documento,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'UPDATE', entidadId: miembro.id, detalle: { acceso_portal: 'concedido', email: emailAcceso } });
    }

    return ok(res, {
      data: { usuario_id: usuario.id, email: emailAcceso, password_temporal: miembro.numero_documento },
      message: 'Acceso al portal concedido. La contraseña temporal es el número de documento del miembro.',
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/miembros/:id/remover-acceso
async function removerAcceso(req, res, next) {
  try {
    const miembro = await miembrosModel.obtenerPorId(req.params.id);
    if (!miembro) return fail(res, { message: 'Miembro no encontrado', status: 404 });

    await usuarioModel.removerAcceso(miembro.id);

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'UPDATE', entidadId: miembro.id, detalle: { acceso_portal: 'removido' } });
    }

    return ok(res, { message: 'Acceso al portal removido correctamente.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  inactivar,
  listarNiveles,
  agregarNivel,
  actualizarNivel,
  quitarNivel,
  listarContactos,
  agregarContacto,
  actualizarContacto,
  eliminarContacto,
  listarPagos,
  registrarPago,
  auditoria,
  whatsappRecordatorio,
  generarCorreo,
  concederAcceso,
  removerAcceso,
};
