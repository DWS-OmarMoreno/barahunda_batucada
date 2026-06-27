const { ok } = require('../utils/respuesta');
const { obtenerParametros, construirPaginacion } = require('../utils/paginacion');
const { generarPlantilla, leerFilasCrudas, eliminarArchivo } = require('../utils/importador');
const importacionService = require('../services/importacion.service');
const importacionModel = require('../models/importacion.model');

const MODULO_AUDITORIA = 'IMPORTACION_EXPORTACION';
const MODULOS_IMPORTACION = ['miembros', 'niveles', 'horarios', 'pagos'];

function moduloValido(modulo) {
  return MODULOS_IMPORTACION.includes(modulo);
}

// GET /api/importacion/plantillas/:modulo — descarga un Excel vacío con
// solo la fila de encabezados esperada por ese módulo.
async function descargarPlantilla(req, res, next) {
  try {
    const { modulo } = req.params;
    if (!moduloValido(modulo)) {
      throw Object.assign(new Error('Módulo no soportado para importación'), { status: 400 });
    }

    const plantilla = importacionService.obtenerPlantilla(modulo);
    const buffer = generarPlantilla({ columnas: plantilla.columnas, nombreHoja: plantilla.titulo });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="plantilla_${modulo}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// POST /api/importacion/:modulo?confirmar=true|false — siempre valida el
// archivo subido; solo persiste en base de datos y registra el log cuando
// `confirmar=true`. Esto permite al frontend mostrar una previsualización
// ("Validar antes de importar") antes de confirmar la operación real.
async function importar(req, res, next) {
  try {
    const { modulo } = req.params;
    const confirmar = String(req.query.confirmar || '') === 'true';

    if (!moduloValido(modulo)) {
      eliminarArchivo(req.file && req.file.path);
      throw Object.assign(new Error('Módulo no soportado para importación'), { status: 400 });
    }
    if (!req.file) {
      throw Object.assign(new Error('Debes adjuntar un archivo Excel o CSV'), { status: 400 });
    }

    const plantilla = importacionService.obtenerPlantilla(modulo);

    let filasCrudas;
    try {
      filasCrudas = leerFilasCrudas(req.file.path);
    } catch {
      eliminarArchivo(req.file.path);
      throw Object.assign(new Error('No se pudo leer el archivo. Verifica que sea un Excel o CSV válido'), { status: 400 });
    }

    const encabezado = filasCrudas[0] || [];
    if (encabezado.length < plantilla.columnas.length) {
      eliminarArchivo(req.file.path);
      throw Object.assign(
        new Error(
          `La estructura del archivo no coincide con la plantilla de ${plantilla.titulo} ` +
          `(se esperaban ${plantilla.columnas.length} columnas y se encontraron ${encabezado.length})`
        ),
        { status: 400 }
      );
    }

    const { validas, errores, totalFilas } = await importacionService.validarFilas(modulo, filasCrudas);

    let registrosExitosos = validas.length;
    let erroresTotales = errores;

    if (confirmar) {
      const resultado = await importacionService.insertarFilas(modulo, validas, { usuarioId: req.usuario.id });
      registrosExitosos = resultado.insertadas;
      erroresTotales = [...errores, ...resultado.erroresInsercion].sort((a, b) => a.fila - b.fila);

      await importacionModel.registrarLog({
        modulo,
        tipo: 'IMPORTACION',
        usuarioId: req.usuario.id,
        nombreArchivo: req.file.originalname,
        registrosProcesados: totalFilas,
        registrosExitosos,
        registrosError: erroresTotales.length,
        detalleErrores: erroresTotales.length ? JSON.stringify(erroresTotales) : null,
      });

      if (req.auditoria) {
        await req.auditoria.registrarAccion({
          modulo: MODULO_AUDITORIA,
          accion: 'IMPORT',
          detalle: { modulo, registros_exitosos: registrosExitosos, registros_error: erroresTotales.length },
        });
      }
    }

    eliminarArchivo(req.file.path);

    return ok(res, {
      data: {
        confirmado: confirmar,
        total_filas: totalFilas,
        registros_exitosos: registrosExitosos,
        registros_error: erroresTotales.length,
        errores: erroresTotales,
        vista_previa: validas.slice(0, 20).map((v) => v.datos),
      },
      message: confirmar
        ? `Importación completada: ${registrosExitosos} registro(s) importado(s), ${erroresTotales.length} con error`
        : `Validación completada: ${registrosExitosos} registro(s) listos para importar, ${erroresTotales.length} con error`,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/importacion/historial — log paginado de importaciones y exportaciones.
async function historial(req, res, next) {
  try {
    const { pagina, limite, offset } = obtenerParametros(req.query);
    const { filas, total } = await importacionModel.listarHistorial({ limite, offset });
    return ok(res, {
      data: filas,
      pagination: construirPaginacion({ pagina, limite, total }),
      message: 'Historial de importaciones/exportaciones obtenido',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { descargarPlantilla, importar, historial, MODULOS_IMPORTACION };
