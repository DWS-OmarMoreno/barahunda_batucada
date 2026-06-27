import { useState, useEffect, useCallback } from 'react';
import {
  descargarPlantilla,
  importarArchivo,
  obtenerHistorialImportaciones,
  exportarModulo,
  MODULOS_IMPORTACION,
  MODULOS_EXPORTACION,
} from '../../services/importacion.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import UploadField from '../../components/ui/UploadField';
import { formatearFechaHora } from '../../utils/formato';
import './ImportacionExportacion.css';

const ETIQUETAS_TIPO = { IMPORTACION: 'Importación', EXPORTACION: 'Exportación' };

export default function ImportacionExportacion() {
  const [tab, setTab] = useState('importar');

  return (
    <div className="importacion-exportacion">
      <div className="importacion-exportacion__header">
        <div>
          <h1>Importar / Exportar</h1>
          <p className="importacion-exportacion__descripcion">
            Carga masiva de datos desde Excel/CSV y exportación de la información del sistema.
          </p>
        </div>
      </div>

      <div className="importacion-exportacion__tabs">
        <button type="button" className={`importacion-exportacion__tab ${tab === 'importar' ? 'importacion-exportacion__tab--activo' : ''}`} onClick={() => setTab('importar')}>Importar</button>
        <button type="button" className={`importacion-exportacion__tab ${tab === 'exportar' ? 'importacion-exportacion__tab--activo' : ''}`} onClick={() => setTab('exportar')}>Exportar</button>
        <button type="button" className={`importacion-exportacion__tab ${tab === 'historial' ? 'importacion-exportacion__tab--activo' : ''}`} onClick={() => setTab('historial')}>Historial</button>
      </div>

      {tab === 'importar' && <TabImportar />}
      {tab === 'exportar' && <TabExportar />}
      {tab === 'historial' && <TabHistorial />}
    </div>
  );
}

// =========================================================================
// Tab: Importar
// =========================================================================

function TabImportar() {
  const [modulo, setModulo] = useState('miembros');
  const [archivo, setArchivo] = useState(null);
  const [validando, setValidando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  function cambiarModulo(valor) {
    setModulo(valor);
    setArchivo(null);
    setResultado(null);
    setError('');
  }

  async function descargar() {
    try {
      await descargarPlantilla(modulo);
    } catch {
      setError('No se pudo descargar la plantilla');
    }
  }

  async function validar() {
    if (!archivo) {
      setError('Selecciona un archivo Excel o CSV');
      return;
    }
    setError('');
    setValidando(true);
    setResultado(null);
    try {
      const respuesta = await importarArchivo(modulo, archivo, false);
      setResultado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo validar el archivo');
    } finally {
      setValidando(false);
    }
  }

  async function confirmar() {
    if (!archivo) return;
    setError('');
    setConfirmando(true);
    try {
      const respuesta = await importarArchivo(modulo, archivo, true);
      setResultado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo completar la importación');
    } finally {
      setConfirmando(false);
    }
  }

  const etiquetaModulo = MODULOS_IMPORTACION.find((m) => m.valor === modulo)?.etiqueta || modulo;

  return (
    <div className="importacion-exportacion__panel">
      <div className="importacion-exportacion__grid">
        <div className="importacion-exportacion__form">
          <FormField
            label="Módulo a importar"
            type="select"
            name="modulo"
            value={modulo}
            onChange={(e) => cambiarModulo(e.target.value)}
            options={MODULOS_IMPORTACION.map((m) => ({ value: m.valor, label: m.etiqueta }))}
          />

          <Button variant="secondary" onClick={descargar}>Descargar plantilla de {etiquetaModulo}</Button>

          <UploadField
            label="Archivo (Excel o CSV)"
            accept=".xlsx,.xls,.csv"
            onFileSelected={(file) => { setArchivo(file); setResultado(null); setError(''); }}
            helpText={archivo ? `Archivo seleccionado: ${archivo.name}` : 'Usa la plantilla descargada para evitar errores de formato.'}
          />

          {error && <p className="importacion-exportacion__error">{error}</p>}

          <div className="importacion-exportacion__acciones">
            <Button onClick={validar} loading={validando} disabled={!archivo}>Validar archivo</Button>
            {resultado && !resultado.confirmado && resultado.registros_exitosos > 0 && (
              <Button variant="secondary" onClick={confirmar} loading={confirmando}>
                Confirmar e importar {resultado.registros_exitosos} registro(s)
              </Button>
            )}
          </div>
        </div>

        <div className="importacion-exportacion__resultado">
          {resultado ? (
            <ResultadoImportacion resultado={resultado} />
          ) : (
            <p className="importacion-exportacion__resultado-vacio">
              Selecciona un módulo, descarga la plantilla, completa los datos y sube el archivo para validarlo antes de importar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultadoImportacion({ resultado }) {
  const columnasPreview = resultado.vista_previa.length > 0 ? Object.keys(resultado.vista_previa[0]) : [];

  return (
    <>
      <div className="importacion-exportacion__resultado-header">
        <StatusBadge
          texto={resultado.confirmado ? 'Importación confirmada' : 'Validación (sin guardar)'}
          variant={resultado.confirmado ? 'success' : 'info'}
        />
      </div>

      <div className="importacion-exportacion__resumen">
        <span>Filas en el archivo: <strong>{resultado.total_filas}</strong></span>
        <span>{resultado.confirmado ? 'Importados' : 'Listos para importar'}: <strong>{resultado.registros_exitosos}</strong></span>
        <span>Con error: <strong>{resultado.registros_error}</strong></span>
      </div>

      {resultado.errores.length > 0 && (
        <div className="importacion-exportacion__errores">
          <span className="importacion-exportacion__etiqueta">Errores por fila</span>
          <ul className="importacion-exportacion__lista-errores">
            {resultado.errores.map((e) => (
              <li key={e.fila}><strong>Fila {e.fila}:</strong> {e.mensajes.join('; ')}</li>
            ))}
          </ul>
        </div>
      )}

      {columnasPreview.length > 0 && (
        <div className="importacion-exportacion__preview">
          <span className="importacion-exportacion__etiqueta">
            Vista previa ({resultado.vista_previa.length} de {resultado.registros_exitosos})
          </span>
          <div className="importacion-exportacion__preview-tabla-wrap">
            <table className="importacion-exportacion__preview-tabla">
              <thead>
                <tr>
                  {columnasPreview.map((clave) => <th key={clave}>{clave}</th>)}
                </tr>
              </thead>
              <tbody>
                {resultado.vista_previa.map((fila, i) => (
                  <tr key={i}>
                    {columnasPreview.map((clave) => (
                      <td key={clave}>{String(fila[clave] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// =========================================================================
// Tab: Exportar
// =========================================================================

function TabExportar() {
  const [modulo, setModulo] = useState('miembros');
  const [formato, setFormato] = useState('excel');
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function exportar() {
    setError('');
    setMensaje('');
    setExportando(true);
    try {
      await exportarModulo(modulo, formato);
      setMensaje('Archivo descargado correctamente.');
    } catch {
      setError('No se pudo generar la exportación');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="importacion-exportacion__panel">
      <div className="importacion-exportacion__form importacion-exportacion__form--exportar">
        <FormField
          label="Módulo a exportar"
          type="select"
          name="modulo_exportar"
          value={modulo}
          onChange={(e) => { setModulo(e.target.value); setMensaje(''); setError(''); }}
          options={MODULOS_EXPORTACION.map((m) => ({ value: m.valor, label: m.etiqueta }))}
        />
        <FormField
          label="Formato"
          type="select"
          name="formato"
          value={formato}
          onChange={(e) => setFormato(e.target.value)}
          options={[{ value: 'excel', label: 'Excel (.xlsx)' }, { value: 'csv', label: 'CSV' }]}
        />

        {error && <p className="importacion-exportacion__error">{error}</p>}
        {mensaje && <p className="importacion-exportacion__mensaje-exito">{mensaje}</p>}

        <Button onClick={exportar} loading={exportando}>Exportar</Button>
      </div>
    </div>
  );
}

// =========================================================================
// Tab: Historial
// =========================================================================

function TabHistorial() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ totalPages: 1, total: 0 });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await obtenerHistorialImportaciones({ page: pagina, limit: 15 });
      setRegistros(respuesta.data);
      setPaginacion(respuesta.pagination || { totalPages: 1, total: respuesta.data.length });
    } catch {
      setRegistros([]);
    } finally {
      setCargando(false);
    }
  }, [pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="importacion-exportacion__panel">
      <DataTable
        cargando={cargando}
        datos={registros}
        paginacion={{ pagina, totalPaginas: paginacion.totalPages, total: paginacion.total, onCambiarPagina: setPagina }}
        columnas={[
          { clave: 'created_at', titulo: 'Fecha', render: (f) => formatearFechaHora(f.created_at) },
          {
            clave: 'tipo',
            titulo: 'Tipo',
            render: (f) => (
              <StatusBadge
                texto={ETIQUETAS_TIPO[f.tipo] || f.tipo}
                variant={f.tipo === 'IMPORTACION' ? 'info' : 'secondary'}
              />
            ),
          },
          { clave: 'modulo', titulo: 'Módulo' },
          { clave: 'nombre_archivo', titulo: 'Archivo', render: (f) => f.nombre_archivo || '—' },
          { clave: 'registros_procesados', titulo: 'Procesados' },
          { clave: 'registros_exitosos', titulo: 'Exitosos' },
          { clave: 'registros_error', titulo: 'Con error' },
          { clave: 'usuario_nombre', titulo: 'Usuario', render: (f) => f.usuario_nombre || '—' },
        ]}
        vacioTexto="Aún no se han realizado importaciones ni exportaciones."
      />
    </div>
  );
}
