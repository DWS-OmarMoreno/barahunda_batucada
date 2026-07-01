const { ok, fail } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const { pool } = require('../config/db');
const asistenciasModel = require('../models/asistencias.model');
const miembrosModel = require('../models/miembros.model');
const miembroNivelesModel = require('../models/miembroNiveles.model');
const horariosModel = require('../models/horarios.model');
const multasModel = require('../models/multas.model');
const configuracionModel = require('../models/configuracion.model');
const reportesModel = require('../models/reportes.model');
const asistenciaToken = require('../utils/asistenciaToken');
const puntoRegistroModel = require('../models/puntoRegistro.model');

const MODULO = 'ASISTENCIAS';
const DIAS_SEMANA_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

// Fecha/hora en la zona horaria configurada en la BD (configuracion.zona_horaria).
// Usa Intl.DateTimeFormat para evitar depender de la TZ del servidor (el VPS
// corre en UTC) y respetar la zona del usuario en su lugar.
const DIA_EN_ES = {
  Monday: 'LUNES', Tuesday: 'MARTES', Wednesday: 'MIERCOLES',
  Thursday: 'JUEVES', Friday: 'VIERNES', Saturday: 'SABADO', Sunday: 'DOMINGO',
};

async function fechaHoraLocal() {
  const configuracion = await configuracionModel.obtener();
  const tz = configuracion?.zona_horaria || 'America/Bogota';
  const ahora = new Date();

  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(ahora)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value])
  );

  return {
    fecha: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}:${partes.second}`,
    diaSemana: DIA_EN_ES[partes.weekday] || partes.weekday.toUpperCase(),
  };
}

// Diferencia en minutos entre dos horas 'HH:MM:SS' (puede ser negativa).
function minutosDesde(horaInicio, horaActual) {
  const [hi, mi] = horaInicio.split(':').map(Number);
  const [ha, ma] = horaActual.split(':').map(Number);
  return (ha * 60 + ma) - (hi * 60 + mi);
}

function obtenerFiltros(query) {
  return {
    miembroId: query.miembro_id || undefined,
    nivelId: query.nivel_id || undefined,
    fechaDesde: query.fecha_desde || undefined,
    fechaHasta: query.fecha_hasta || undefined,
    estado: query.estado || undefined,
  };
}

async function listar(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query, { limitPorDefecto: 20 });
    const { filas, total } = await asistenciasModel.listar({ ...obtenerFiltros(req.query), limite, offset });
    return ok(res, {
      data: filas,
      message: 'Asistencias obtenidas',
      pagination: construirPaginacion({ pagina, limite, total }),
    });
  } catch (err) {
    next(err);
  }
}

async function contadores(req, res, next) {
  try {
    const datos = await asistenciasModel.contarPorEstado(obtenerFiltros(req.query));
    return ok(res, { data: datos, message: 'Contadores de asistencia' });
  } catch (err) {
    next(err);
  }
}

async function reporte(req, res, next) {
  try {
    const filas = await asistenciasModel.listarTodas(obtenerFiltros(req.query));
    return ok(res, { data: filas, message: 'Reporte de asistencias' });
  } catch (err) {
    next(err);
  }
}

// Listado administrativo que, además de las asistencias reales, incluye
// filas sintéticas "AUSENTE" para los miembros inscritos que no registraron
// asistencia en una clase que les correspondía (ver utils/calcularAusentes).
// Sin paginar (igual que /reporte): el front lo renderiza como tabla simple.
async function conAusentes(req, res, next) {
  try {
    const filtros = obtenerFiltros(req.query);
    const filasReales = await asistenciasModel.listarTodas(filtros);
    const combinadas = await reportesModel.combinarConAusentes({ filas: filasReales, ...filtros });
    // Los sintéticos siempre se generan sin filtrar por estado; si el query
    // pedía un estado puntual, se aplica aquí para que el resultado final
    // respete el filtro igual que lo haría una fila real.
    const filas = filtros.estado ? combinadas.filter((f) => f.estado === filtros.estado) : combinadas;
    return ok(res, { data: filas, message: 'Asistencias (incluye ausentes) obtenidas' });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const asistencia = await asistenciasModel.obtenerPorId(req.params.id);
    if (!asistencia) return fail(res, { message: 'Asistencia no encontrada', status: 404 });
    return ok(res, { data: asistencia, message: 'Asistencia obtenida' });
  } catch (err) {
    next(err);
  }
}

// Lógica común una vez resuelto QUIÉN (miembro), EN QUÉ NIVEL/HORARIO y
// CUÁNDO se está registrando: valida que no haya ya una asistencia hoy para
// ese horario, calcula A_TIEMPO/TARDE, crea la asistencia y, si aplica, la
// multa por tardanza. La usan tanto el QR rotativo por horario
// (registrarPublica) como el enlace fijo del punto de registro
// (registrarPuntoFijo) — solo cambia cómo cada uno llega hasta acá.
async function finalizarRegistro({ miembro, nivelMiembro, horario, fecha, hora, req }) {
  const yaRegistrada = await asistenciasModel.buscarHoyPorMiembroYHorario(miembro.id, horario.id, fecha);
  if (yaRegistrada) {
    return {
      data: {
        ya_registrada: true,
        miembro: miembro.nombres_completos,
        nivel: nivelMiembro.nivel_nombre,
        hora: yaRegistrada.hora,
        estado: yaRegistrada.estado,
      },
      message: `Ya registraste tu asistencia hoy a las ${String(yaRegistrada.hora).slice(0, 5)}`,
    };
  }

  const minutosRetraso = Math.max(0, minutosDesde(horario.hora_inicio, hora));
  const tolerancia = horario.tolerancia_minutos ?? 10;
  const estado = minutosRetraso <= tolerancia ? 'A_TIEMPO' : 'TARDE';

  const asistencia = await asistenciasModel.crear({
    miembro_id: miembro.id,
    nivel_id: nivelMiembro.nivel_id,
    horario_id: horario.id,
    fecha,
    hora,
    estado,
    minutos_retraso: estado === 'TARDE' ? minutosRetraso : 0,
  });

  if (req.auditoria) {
    await req.auditoria.registrarAccion({ modulo: MODULO, accion: 'CREATE', entidadId: asistencia.id, detalle: asistencia });
  }

  let multaGenerada = null;
  if (estado === 'TARDE') {
    const configuracion = await configuracionModel.obtener();
    const valorMulta = configuracion?.multa_valor_por_tardanza ?? 5000;
    multaGenerada = await multasModel.crear({
      miembro_id: miembro.id,
      asistencia_id: asistencia.id,
      tipo: 'TARDANZA',
      valor: valorMulta,
      fecha_generada: fecha,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({ modulo: 'MULTAS', accion: 'CREATE', entidadId: multaGenerada.id, detalle: multaGenerada });
    }
  }

  return {
    data: {
      miembro: miembro.nombres_completos,
      nivel: nivelMiembro.nivel_nombre,
      hora,
      estado,
      minutos_retraso: asistencia.minutos_retraso,
      multa_generada: !!multaGenerada,
      valor_multa: multaGenerada ? Number(multaGenerada.valor) : null,
    },
    message: estado === 'A_TIEMPO'
      ? '¡Asistencia registrada a tiempo!'
      : 'Asistencia registrada con tardanza. Se generó una multa.',
  };
}

// Endpoint público (sin autenticación) consumido por el portal /asistencia.
// Requiere horario_id + token: ambos vienen codificados en el QR que el
// administrador proyecta/imprime desde Horarios, y el token rota cada pocos
// minutos (ver utils/asistenciaToken.js), así que un enlace copiado o
// reenviado fuera de ese lapso deja de ser válido — solo quien está
// presencialmente frente al QR vigente puede registrar la asistencia.
async function registrarPublica(req, res, next) {
  try {
    const numeroDocumento = String(req.body?.numero_documento || '').trim();
    const horarioId = req.body?.horario_id;
    const token = req.body?.token;

    if (!numeroDocumento) {
      return fail(res, { message: 'Ingresa tu número de documento', status: 400 });
    }
    if (!horarioId || !token) {
      return fail(res, {
        message: 'Este enlace no es válido. Escanea el código QR del salón para registrar tu asistencia.',
        status: 400,
      });
    }
    if (!asistenciaToken.validarToken(horarioId, token)) {
      return fail(res, {
        message: 'El código QR escaneado ya expiró. Escanea el código QR vigente para registrar tu asistencia.',
        status: 400,
      });
    }

    const horario = await horariosModel.obtenerPorId(horarioId);
    if (!horario || !horario.activo) {
      return fail(res, { message: 'El horario no existe o no está activo', status: 404 });
    }

    const miembro = await miembrosModel.obtenerPorDocumento(numeroDocumento);
    if (!miembro) {
      return fail(res, { message: 'No se encontró ningún miembro con ese número de documento', status: 404 });
    }
    if (!miembro.activo) {
      return fail(res, { message: 'Este miembro no se encuentra activo en la escuela', status: 400 });
    }

    const nivelesMiembro = await miembroNivelesModel.listarActivosPorMiembro(miembro.id);
    const nivelMiembro = nivelesMiembro.find((n) => n.nivel_id === horario.nivel_id);
    if (!nivelMiembro) {
      return fail(res, { message: 'No estás inscrito en el nivel de este horario', status: 400 });
    }

    const { fecha, hora, diaSemana } = await fechaHoraLocal();
    if (horario.dia_semana !== diaSemana) {
      return fail(res, { message: 'Este horario no corresponde a la clase de hoy', status: 400 });
    }
    if (hora < horario.hora_inicio) {
      return fail(res, { message: 'Esta clase aún no ha iniciado', status: 400 });
    }
    if (hora > horario.hora_fin) {
      return fail(res, { message: 'Esta clase ya finalizó', status: 400 });
    }

    return ok(res, await finalizarRegistro({ miembro, nivelMiembro, horario, fecha, hora, req }));
  } catch (err) {
    next(err);
  }
}

// Endpoint público (sin autenticación) para el ÚNICO punto físico de
// registro de la sede (p. ej. una tablet en la entrada). A diferencia de
// /publica, no recibe horario_id: el horario vigente se resuelve solo,
// cruzando los niveles en los que está inscrito el miembro contra los
// horarios de hoy que estén en curso justo en este momento. El token de
// este enlace NO rota ni expira (ver models/puntoRegistro.model.js) — la
// seguridad depende de que el enlace nunca se le entregue a un miembro,
// solo al dispositivo fijo del punto de registro.
async function registrarPuntoFijo(req, res, next) {
  try {
    const numeroDocumento = String(req.body?.numero_documento || '').trim();
    const token = req.body?.token;

    if (!numeroDocumento) {
      return fail(res, { message: 'Ingresa tu número de documento', status: 400 });
    }
    if (!token) {
      return fail(res, { message: 'Este enlace no es válido.', status: 400 });
    }

    const punto = await puntoRegistroModel.buscarPorTokenActivo(token);
    if (!punto) {
      return fail(res, { message: 'Este enlace no es válido o fue desactivado.', status: 400 });
    }

    const miembro = await miembrosModel.obtenerPorDocumento(numeroDocumento);
    if (!miembro) {
      return fail(res, { message: 'No se encontró ningún miembro con ese número de documento', status: 404 });
    }
    if (!miembro.activo) {
      return fail(res, { message: 'Este miembro no se encuentra activo en la escuela', status: 400 });
    }

    const nivelesMiembro = await miembroNivelesModel.listarActivosPorMiembro(miembro.id);
    if (nivelesMiembro.length === 0) {
      return fail(res, { message: 'Este miembro no está inscrito en ningún nivel', status: 400 });
    }

    const { fecha, hora, diaSemana } = await fechaHoraLocal();

    // De todos los niveles del miembro, busca los horarios de hoy que estén
    // en curso justo ahora; si hay más de uno (p. ej. inscrito en niveles
    // con horarios simultáneos), se toma el que inició más recientemente.
    let candidato = null;
    for (const nivelMiembro of nivelesMiembro) {
      // eslint-disable-next-line no-await-in-loop
      const horariosDelDia = await horariosModel.buscarActivoPorNivelYDia(nivelMiembro.nivel_id, diaSemana);
      for (const horario of horariosDelDia) {
        if (hora < horario.hora_inicio || hora > horario.hora_fin) continue;
        const minutos = minutosDesde(horario.hora_inicio, hora);
        if (!candidato || minutos < candidato.minutos) {
          candidato = { nivelMiembro, horario, minutos };
        }
      }
    }

    if (!candidato) {
      return fail(res, { message: 'No tienes ninguna clase en curso en este momento.', status: 400 });
    }

    const resultado = await finalizarRegistro({
      miembro,
      nivelMiembro: candidato.nivelMiembro,
      horario: candidato.horario,
      fecha,
      hora,
      req,
    });
    return ok(res, resultado);
  } catch (err) {
    next(err);
  }
}

// Anula una asistencia (no se borra) e indica el motivo. Cualquier multa
// pendiente que dependía de ella (p. ej. la multa por tardanza generada al
// registrarla) queda sin fundamento y se condona automáticamente con el
// mismo motivo, en vez de quedar pendiente de pago para algo que ya no cuenta.
async function anular(req, res, next) {
  try {
    const motivo = String(req.body?.motivo || '').trim();
    if (!motivo) {
      return fail(res, { message: 'Debes indicar el motivo de la anulación', status: 400 });
    }

    const { anterior, nuevo } = await asistenciasModel.anular(req.params.id, motivo, req.usuario?.id);

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
    }

    const multasPendientes = await multasModel.listarPendientesPorAsistencia(nuevo.id);
    for (const multa of multasPendientes) {
      // eslint-disable-next-line no-await-in-loop
      const { anterior: multaAnterior, nuevo: multaNueva } = await multasModel.condonar(
        multa.id,
        `Condonada automáticamente: se anuló la asistencia que la generó (${motivo})`
      );
      if (req.auditoria) {
        // eslint-disable-next-line no-await-in-loop
        await req.auditoria.registrarCambios({ modulo: 'MULTAS', entidadId: multaNueva.id, anterior: multaAnterior, nuevo: multaNueva });
      }
    }

    return ok(res, {
      data: nuevo,
      message: multasPendientes.length > 0
        ? 'Asistencia anulada. Se condonaron las multas pendientes asociadas.'
        : 'Asistencia anulada correctamente',
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/asistencias/:id — edición manual por admin (estado y/o hora)
async function editar(req, res, next) {
  try {
    const { estado, hora, motivo } = req.body || {};
    const estadosValidos = ['A_TIEMPO', 'TARDE', 'AUSENTE'];
    if (estado && !estadosValidos.includes(estado)) {
      return fail(res, { message: 'Estado no válido. Opciones: A_TIEMPO, TARDE, AUSENTE', status: 400 });
    }
    if (!estado && !hora) {
      return fail(res, { message: 'Debes indicar al menos el estado o la hora a modificar', status: 400 });
    }

    const { anterior, nuevo } = await asistenciasModel.editar(
      req.params.id,
      { estado, hora, motivo },
      req.usuario?.id
    );

    if (req.auditoria) {
      await req.auditoria.registrarCambios({ modulo: MODULO, entidadId: nuevo.id, anterior, nuevo });
      // Registro adicional que indica que fue modificación manual
      await req.auditoria.registrarAccion({
        modulo: MODULO,
        accion: 'UPDATE',
        entidadId: nuevo.id,
        detalle: { tipo: 'MODIFICACION_MANUAL', motivo, estado_anterior: anterior.estado, estado_nuevo: nuevo.estado },
      });
    }

    return ok(res, { data: nuevo, message: 'Asistencia modificada manualmente' });
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
       WHERE a.modulo = 'ASISTENCIAS' AND a.entidad_id = ?
       ORDER BY a.fecha_hora DESC
       LIMIT 200`,
      [req.params.id]
    );
    return ok(res, { data: rows, message: 'Auditoría de la asistencia' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, contadores, reporte, conAusentes, registrarPublica, registrarPuntoFijo, anular, editar, auditoria };
