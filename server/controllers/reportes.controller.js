const { ok, fail } = require('../utils/respuesta');
const { formatearMoneda } = require('../utils/formato');
const { generarExcel, generarPdf, enviarArchivo } = require('../utils/exportador');

const reportesModel = require('../models/reportes.model');
const asistenciasModel = require('../models/asistencias.model');

const MODULO = 'REPORTES';

const ETIQUETAS_ESTADO_MENSUALIDAD = { PAGADO: 'Pagado', PARCIAL: 'Parcial', PENDIENTE: 'Pendiente', EXENTO: 'Exento' };
const ETIQUETAS_ESTADO_ASISTENCIA = { A_TIEMPO: 'A tiempo', TARDE: 'Tarde', AUSENTE: 'Ausente' };
const ETIQUETAS_ESTADO_MULTA = { PENDIENTE: 'Pendiente', PAGADA: 'Pagada', CONDONADA: 'Condonada' };
const ETIQUETAS_TIPO_MULTA = { TARDANZA: 'Tardanza', OTRA: 'Otra' };

function formatearFechaCorta(fechaIso) {
  if (!fechaIso) return '—';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return String(fechaIso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

function mesAnioActual() {
  const ahora = new Date();
  return { mes: ahora.getMonth() + 1, anio: ahora.getFullYear() };
}

function parametrosMesAnio(query) {
  const actual = mesAnioActual();
  return {
    mes: query.mes ? Number(query.mes) : actual.mes,
    anio: query.anio ? Number(query.anio) : actual.anio,
  };
}

async function registrarExportacion(req, { nombreReporte, filtros, totalRegistros }) {
  if (req.auditoria) {
    await req.auditoria.registrarAccion({
      modulo: MODULO,
      accion: 'EXPORT',
      detalle: { reporte: nombreReporte, filtros, total_registros: totalRegistros },
    });
  }
}

// Envía como JSON o, si ?formato=excel|pdf, genera y envía el archivo.
async function responderReporte(req, res, { nombreReporte, titulo, subtitulo, columnas, filas, filtros }) {
  const formato = String(req.query.formato || '').toLowerCase();

  if (formato === 'excel' || formato === 'pdf') {
    const buffer = formato === 'excel'
      ? generarExcel({ columnas, filas, nombreHoja: nombreReporte })
      : await generarPdf({ titulo, subtitulo, columnas, filas });

    await registrarExportacion(req, { nombreReporte, filtros, totalRegistros: filas.length });
    return enviarArchivo(res, { formato, buffer, nombreArchivo: nombreReporte });
  }

  return ok(res, { data: filas, message: `${titulo} obtenido` });
}

// ---------- Dashboard ----------

async function dashboard(req, res, next) {
  try {
    const [datosKpis, datosPagosPorMes, datosMiembrosPorNivel, datosAsistenciaPorSemana, datosAlertas] = await Promise.all([
      reportesModel.kpis(),
      reportesModel.pagosPorMes(6),
      reportesModel.miembrosPorNivel(),
      reportesModel.asistenciaPorSemana(4),
      reportesModel.alertas(),
    ]);

    return ok(res, {
      data: {
        kpis: datosKpis,
        pagos_por_mes: datosPagosPorMes,
        miembros_por_nivel: datosMiembrosPorNivel,
        asistencia_por_semana: datosAsistenciaPorSemana,
        alertas: datosAlertas,
      },
      message: 'Indicadores del dashboard obtenidos',
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Mensualidades pagadas (mes, año, nivel) ----------

async function mensualidades(req, res, next) {
  try {
    const { mes, anio } = parametrosMesAnio(req.query);
    const nivelId = req.query.nivel_id || undefined;

    const filas = (await reportesModel.mensualidadesPorEstado({ mes, anio, nivelId })).filter((f) => f.estado === 'PAGADO');

    return responderReporte(req, res, {
      nombreReporte: 'mensualidades_pagadas',
      titulo: 'Mensualidades pagadas',
      subtitulo: `${mes}/${anio}`,
      filtros: { mes, anio, nivel_id: nivelId },
      filas,
      columnas: [
        { clave: 'nombres_completos', titulo: 'Miembro' },
        { clave: 'numero_documento', titulo: 'Documento' },
        { clave: 'nivel_nombre', titulo: 'Nivel', render: (f) => f.nivel_nombre || '—' },
        { clave: 'valor_mensualidad', titulo: 'Valor mensualidad', render: (f) => formatearMoneda(f.valor_mensualidad) },
        { clave: 'total_pagado', titulo: 'Total pagado', render: (f) => formatearMoneda(f.total_pagado) },
      ],
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Miembros con pagos pendientes (mes, año) ----------

async function pendientes(req, res, next) {
  try {
    const { mes, anio } = parametrosMesAnio(req.query);

    // Los exentos de pago no se cuentan como pendientes: no se les cobra mensualidad.
    const filas = (await reportesModel.mensualidadesPorEstado({ mes, anio }))
      .filter((f) => f.estado !== 'PAGADO' && f.estado !== 'EXENTO');

    return responderReporte(req, res, {
      nombreReporte: 'miembros_pagos_pendientes',
      titulo: 'Miembros con pagos pendientes',
      subtitulo: `${mes}/${anio}`,
      filtros: { mes, anio },
      filas,
      columnas: [
        { clave: 'nombres_completos', titulo: 'Miembro' },
        { clave: 'numero_documento', titulo: 'Documento' },
        { clave: 'nivel_nombre', titulo: 'Nivel', render: (f) => f.nivel_nombre || '—' },
        { clave: 'valor_mensualidad', titulo: 'Valor mensualidad', render: (f) => formatearMoneda(f.valor_mensualidad) },
        { clave: 'total_pagado', titulo: 'Total pagado', render: (f) => formatearMoneda(f.total_pagado) },
        { clave: 'estado', titulo: 'Estado', render: (f) => ETIQUETAS_ESTADO_MENSUALIDAD[f.estado] || f.estado },
      ],
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Miembros al día (mes, año) ----------

async function alDia(req, res, next) {
  try {
    const { mes, anio } = parametrosMesAnio(req.query);

    const filas = (await reportesModel.mensualidadesPorEstado({ mes, anio })).filter((f) => f.estado === 'PAGADO');

    return responderReporte(req, res, {
      nombreReporte: 'miembros_al_dia',
      titulo: 'Miembros al día',
      subtitulo: `${mes}/${anio}`,
      filtros: { mes, anio },
      filas,
      columnas: [
        { clave: 'nombres_completos', titulo: 'Miembro' },
        { clave: 'numero_documento', titulo: 'Documento' },
        { clave: 'nivel_nombre', titulo: 'Nivel', render: (f) => f.nivel_nombre || '—' },
        { clave: 'valor_mensualidad', titulo: 'Valor mensualidad', render: (f) => formatearMoneda(f.valor_mensualidad) },
      ],
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Historial de multas (rango fechas, estado, miembro) ----------

async function multas(req, res, next) {
  try {
    const filtros = {
      miembroId: req.query.miembro_id || undefined,
      estado: req.query.estado || undefined,
      fechaDesde: req.query.fecha_desde || undefined,
      fechaHasta: req.query.fecha_hasta || undefined,
    };

    const filas = await reportesModel.multasHistorial(filtros);

    return responderReporte(req, res, {
      nombreReporte: 'historial_multas',
      titulo: 'Historial de multas',
      filtros,
      filas,
      columnas: [
        { clave: 'miembro_nombre', titulo: 'Miembro' },
        { clave: 'numero_documento', titulo: 'Documento' },
        { clave: 'tipo', titulo: 'Tipo', render: (f) => ETIQUETAS_TIPO_MULTA[f.tipo] || f.tipo },
        { clave: 'valor', titulo: 'Valor', render: (f) => formatearMoneda(f.valor) },
        { clave: 'estado', titulo: 'Estado', render: (f) => ETIQUETAS_ESTADO_MULTA[f.estado] || f.estado },
        { clave: 'fecha_generada', titulo: 'Fecha generada', render: (f) => formatearFechaCorta(f.fecha_generada) },
        { clave: 'fecha_pago', titulo: 'Fecha de pago', render: (f) => (f.fecha_pago ? formatearFechaCorta(f.fecha_pago) : '—') },
      ],
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Asistencia por miembro (miembro, rango fechas) ----------

async function asistenciaMiembro(req, res, next) {
  try {
    const filtros = {
      miembroId: req.query.miembro_id || undefined,
      fechaDesde: req.query.fecha_desde || undefined,
      fechaHasta: req.query.fecha_hasta || undefined,
    };

    const filasReales = await asistenciasModel.listarTodas(filtros);
    // Agrega filas sintéticas "AUSENTE" para quien, estando inscrito, no
    // registró asistencia en una clase que le correspondía.
    const filas = await reportesModel.combinarConAusentes({ filas: filasReales, ...filtros });

    return responderReporte(req, res, {
      nombreReporte: 'asistencia_por_miembro',
      titulo: 'Asistencia por miembro',
      filtros,
      filas,
      columnas: [
        { clave: 'miembro_nombre', titulo: 'Miembro' },
        { clave: 'numero_documento', titulo: 'Documento' },
        { clave: 'nivel_nombre', titulo: 'Nivel' },
        { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFechaCorta(f.fecha) },
        { clave: 'hora', titulo: 'Hora' },
        { clave: 'estado', titulo: 'Estado', render: (f) => ETIQUETAS_ESTADO_ASISTENCIA[f.estado] || f.estado },
        { clave: 'minutos_retraso', titulo: 'Min. retraso' },
      ],
    });
  } catch (err) {
    next(err);
  }
}

// ---------- Asistencia por nivel (nivel, rango fechas) ----------

async function asistenciaNivel(req, res, next) {
  try {
    const filtros = {
      nivelId: req.query.nivel_id || undefined,
      fechaDesde: req.query.fecha_desde || undefined,
      fechaHasta: req.query.fecha_hasta || undefined,
    };

    const filasReales = await asistenciasModel.listarTodas(filtros);
    // Agrega filas sintéticas "AUSENTE" para quien, estando inscrito, no
    // registró asistencia en una clase que le correspondía.
    const filas = await reportesModel.combinarConAusentes({ filas: filasReales, ...filtros });

    return responderReporte(req, res, {
      nombreReporte: 'asistencia_por_nivel',
      titulo: 'Asistencia por nivel',
      filtros,
      filas,
      columnas: [
        { clave: 'nivel_nombre', titulo: 'Nivel' },
        { clave: 'miembro_nombre', titulo: 'Miembro' },
        { clave: 'numero_documento', titulo: 'Documento' },
        { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFechaCorta(f.fecha) },
        { clave: 'hora', titulo: 'Hora' },
        { clave: 'estado', titulo: 'Estado', render: (f) => ETIQUETAS_ESTADO_ASISTENCIA[f.estado] || f.estado },
      ],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { dashboard, mensualidades, pendientes, alDia, multas, asistenciaMiembro, asistenciaNivel };
