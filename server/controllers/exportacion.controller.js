const { generarExcel, enviarArchivo } = require('../utils/exportador');
const exportacionModel = require('../models/exportacion.model');
const importacionModel = require('../models/importacion.model');

const MODULO_AUDITORIA = 'IMPORTACION_EXPORTACION';

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatearFechaCorta(valor) {
  if (!valor) return '—';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return `${pad(fecha.getDate())}/${pad(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

function formatearBooleano(valor) {
  return valor === 1 || valor === true ? 'Sí' : 'No';
}

// Catálogo de los 9 módulos exportables (Módulo 11): título amigable,
// fuente de datos (un dump completo de registros activos) y columnas con
// el mismo estilo de `render` usado en server/controllers/reportes.controller.js.
const EXPORT_CONFIG = {
  miembros: {
    titulo: 'Miembros',
    obtenerFilas: exportacionModel.miembros,
    columnas: [
      { clave: 'nombres_completos', titulo: 'Nombres completos' },
      { clave: 'tipo_documento', titulo: 'Tipo documento' },
      { clave: 'numero_documento', titulo: 'Número documento' },
      { clave: 'whatsapp', titulo: 'WhatsApp' },
      { clave: 'email', titulo: 'Email' },
      { clave: 'fecha_nacimiento', titulo: 'Fecha nacimiento', render: (f) => formatearFechaCorta(f.fecha_nacimiento) },
      { clave: 'direccion', titulo: 'Dirección' },
      { clave: 'tipo_sangre', titulo: 'Tipo sangre' },
      { clave: 'eps', titulo: 'EPS' },
      { clave: 'padece_enfermedad', titulo: 'Padece enfermedad', render: (f) => formatearBooleano(f.padece_enfermedad) },
      { clave: 'enfermedad_cual', titulo: 'Enfermedad cuál' },
      { clave: 'sufre_alergia', titulo: 'Sufre alergia', render: (f) => formatearBooleano(f.sufre_alergia) },
      { clave: 'alergia_cual', titulo: 'Alergia cuál' },
      { clave: 'toma_medicamentos', titulo: 'Toma medicamentos', render: (f) => formatearBooleano(f.toma_medicamentos) },
      { clave: 'medicamentos_cuales', titulo: 'Medicamentos cuáles' },
      { clave: 'restricciones_fisicas', titulo: 'Restricciones físicas' },
      { clave: 'exento_pago', titulo: 'Exento de pago', render: (f) => formatearBooleano(f.exento_pago) },
      { clave: 'asistencia_obligatoria', titulo: 'Asistencia obligatoria', render: (f) => formatearBooleano(f.asistencia_obligatoria) },
    ],
  },
  niveles: {
    titulo: 'Niveles',
    obtenerFilas: exportacionModel.niveles,
    columnas: [
      { clave: 'nombre', titulo: 'Nombre' },
      { clave: 'descripcion', titulo: 'Descripción' },
    ],
  },
  horarios: {
    titulo: 'Horarios',
    obtenerFilas: exportacionModel.horarios,
    columnas: [
      { clave: 'nivel_nombre', titulo: 'Nivel' },
      { clave: 'dia_semana', titulo: 'Día semana' },
      { clave: 'hora_inicio', titulo: 'Hora inicio' },
      { clave: 'hora_fin', titulo: 'Hora fin' },
      { clave: 'tolerancia_minutos', titulo: 'Tolerancia (min)' },
    ],
  },
  instrumentos: {
    titulo: 'Instrumentos',
    obtenerFilas: exportacionModel.instrumentos,
    columnas: [{ clave: 'nombre', titulo: 'Nombre' }],
  },
  pagos: {
    titulo: 'Pagos',
    obtenerFilas: exportacionModel.pagos,
    columnas: [
      { clave: 'nombres_completos', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'valor', titulo: 'Valor' },
      { clave: 'fecha_pago', titulo: 'Fecha pago', render: (f) => formatearFechaCorta(f.fecha_pago) },
      { clave: 'mes_correspondiente', titulo: 'Mes' },
      { clave: 'anio_correspondiente', titulo: 'Año' },
      { clave: 'observaciones', titulo: 'Observaciones' },
    ],
  },
  asistencias: {
    titulo: 'Asistencias',
    obtenerFilas: exportacionModel.asistencias,
    columnas: [
      { clave: 'nombres_completos', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'nivel_nombre', titulo: 'Nivel' },
      { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFechaCorta(f.fecha) },
      { clave: 'hora', titulo: 'Hora' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'minutos_retraso', titulo: 'Min. retraso' },
    ],
  },
  multas: {
    titulo: 'Multas',
    obtenerFilas: exportacionModel.multas,
    columnas: [
      { clave: 'nombres_completos', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'tipo', titulo: 'Tipo' },
      { clave: 'valor', titulo: 'Valor' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'fecha_generada', titulo: 'Fecha generada', render: (f) => formatearFechaCorta(f.fecha_generada) },
      { clave: 'fecha_pago', titulo: 'Fecha pago', render: (f) => (f.fecha_pago ? formatearFechaCorta(f.fecha_pago) : '—') },
    ],
  },
  eventos: {
    titulo: 'Eventos',
    obtenerFilas: exportacionModel.eventos,
    columnas: [
      { clave: 'nombre', titulo: 'Nombre' },
      { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFechaCorta(f.fecha) },
      { clave: 'tipo', titulo: 'Tipo' },
      { clave: 'valor_total', titulo: 'Valor total' },
      { clave: 'quien_contrata_nombre', titulo: 'Contratante' },
      { clave: 'quien_contrata_contacto', titulo: 'Contacto contratante' },
    ],
  },
  comunicaciones: {
    titulo: 'Comunicaciones',
    obtenerFilas: exportacionModel.comunicaciones,
    columnas: [
      { clave: 'created_at', titulo: 'Fecha', render: (f) => formatearFechaCorta(f.created_at) },
      { clave: 'plantilla_nombre', titulo: 'Plantilla' },
      { clave: 'destinatarios_tipo', titulo: 'Destinatarios' },
      { clave: 'nivel_nombre', titulo: 'Nivel' },
      { clave: 'total_destinatarios', titulo: 'Total enviados' },
      { clave: 'enviado_por_nombre', titulo: 'Enviado por' },
    ],
  },
};

// GET /api/exportacion/:modulo?formato=excel|csv
async function exportar(req, res, next) {
  try {
    const { modulo } = req.params;
    const config = EXPORT_CONFIG[modulo];
    if (!config) {
      throw Object.assign(new Error('Módulo no soportado para exportación'), { status: 400 });
    }

    const formato = String(req.query.formato || 'excel').toLowerCase() === 'csv' ? 'csv' : 'excel';
    const filas = await config.obtenerFilas();
    const buffer = generarExcel({
      columnas: config.columnas,
      filas,
      nombreHoja: config.titulo,
      bookType: formato === 'csv' ? 'csv' : 'xlsx',
    });

    await importacionModel.registrarLog({
      modulo,
      tipo: 'EXPORTACION',
      usuarioId: req.usuario.id,
      nombreArchivo: `${modulo}.${formato === 'csv' ? 'csv' : 'xlsx'}`,
      registrosProcesados: filas.length,
      registrosExitosos: filas.length,
      registrosError: 0,
      detalleErrores: null,
    });

    if (req.auditoria) {
      await req.auditoria.registrarAccion({
        modulo: MODULO_AUDITORIA,
        accion: 'EXPORT',
        detalle: { modulo, total_registros: filas.length, formato },
      });
    }

    return enviarArchivo(res, { formato, buffer, nombreArchivo: modulo });
  } catch (err) {
    next(err);
  }
}

module.exports = { exportar, EXPORT_CONFIG };
