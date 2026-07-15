import { useState, useEffect, useCallback } from 'react';
import { bdResumen, bdListar, bdEliminarUno, bdEliminarTodos } from '../../services/configuracion.service';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// ─── Etiquetas e iconos ────────────────────────────────────────────────────────

const META_TABLAS = [
  { nombre: 'miembros',            etiqueta: 'Miembros',               icono: '👥' },
  { nombre: 'miembro_niveles',     etiqueta: 'Inscripciones',          icono: '📋' },
  { nombre: 'niveles',             etiqueta: 'Niveles',                icono: '🎵' },
  { nombre: 'instrumentos',        etiqueta: 'Instrumentos',           icono: '🎸' },
  { nombre: 'horarios',            etiqueta: 'Horarios',               icono: '🕐' },
  { nombre: 'asistencias',         etiqueta: 'Asistencias',            icono: '✅' },
  { nombre: 'pagos',               etiqueta: 'Pagos',                  icono: '💰' },
  { nombre: 'mensualidades',       etiqueta: 'Mensualidades',          icono: '💳' },
  { nombre: 'multas',              etiqueta: 'Multas',                 icono: '⚠️' },
  { nombre: 'eventos',             etiqueta: 'Eventos',                icono: '🎪' },
  { nombre: 'evento_miembros',     etiqueta: 'Participantes eventos',  icono: '🎟' },
  { nombre: 'tareas',              etiqueta: 'Tareas',                 icono: '📚' },
  { nombre: 'guias',               etiqueta: 'Guías',                  icono: '📖' },
  { nombre: 'entregas',            etiqueta: 'Entregas',               icono: '📤' },
  { nombre: 'planes_estudio',      etiqueta: 'Planes de estudio',      icono: '🗂' },
  { nombre: 'plan_secciones',      etiqueta: 'Secciones de planes',    icono: '📂' },
  { nombre: 'plan_items',          etiqueta: 'Ítems de planes',        icono: '📌' },
  { nombre: 'comunicaciones',      etiqueta: 'Comunicaciones',         icono: '📨' },
  { nombre: 'plantillas_whatsapp', etiqueta: 'Plantillas WhatsApp',    icono: '💬' },
  { nombre: 'plantillas_correo',   etiqueta: 'Plantillas correo',      icono: '✉️' },
  { nombre: 'contactos_emergencia',etiqueta: 'Contactos emergencia',   icono: '🚨' },
  { nombre: 'auditoria',           etiqueta: 'Auditoría',              icono: '📝' },
  { nombre: 'importaciones',       etiqueta: 'Importaciones',          icono: '📥' },
  { nombre: 'puntos_registro',     etiqueta: 'Puntos de registro',     icono: '📡' },
  { nombre: 'usuarios',            etiqueta: 'Usuarios',               icono: '👤' },
];

const META_MAP = Object.fromEntries(META_TABLAS.map((t) => [t.nombre, t]));

// ─── Helper: renderiza el valor de una celda ──────────────────────────────────

function renderCelda(val) {
  if (val === null || val === undefined) return <span className="bd__celda-null">—</span>;
  if (typeof val === 'boolean' || val === 0 || val === 1) {
    if (val === true || val === 1) return <span className="bd__celda-bool bd__celda-bool--si">Sí</span>;
    if (val === false || val === 0) return <span className="bd__celda-bool bd__celda-bool--no">No</span>;
  }
  const str = String(val);
  if (str.length > 60) return <span title={str}>{str.slice(0, 58)}…</span>;
  return str;
}

// ─── Modal con registros de una tabla ────────────────────────────────────────

function ModalTabla({ tabla, onClose, onCambio }) {
  const meta = META_MAP[tabla] || { etiqueta: tabla, icono: '🗄' };

  const [registros, setRegistros] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [eliminando, setEliminando] = useState(null);     // id que se está eliminando
  const [confirmId, setConfirmId] = useState(null);       // id del confirm individual
  const [confirmTodos, setConfirmTodos] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async (page = 1) => {
    setCargando(true);
    setError('');
    try {
      const resp = await bdListar(tabla, { page, limit: 50 });
      const rows = resp.data ?? resp;
      const pag = resp.pagination ?? { total: rows.length, page: 1, pages: 1 };
      setRegistros(rows);
      setPagination(pag);
      if (rows.length > 0) {
        setColumnas(Object.keys(rows[0]));
      }
    } catch {
      setError('No se pudo cargar la tabla.');
    } finally {
      setCargando(false);
    }
  }, [tabla]);

  useEffect(() => { cargar(1); }, [cargar]);

  async function eliminarUno(id) {
    setEliminando(id);
    try {
      await bdEliminarUno(tabla, id);
      setConfirmId(null);
      cargar(pagination.page);
      onCambio?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo eliminar.');
    } finally {
      setEliminando(null);
    }
  }

  async function eliminarTodos() {
    setEliminando('todos');
    try {
      await bdEliminarTodos(tabla);
      setConfirmTodos(false);
      cargar(1);
      onCambio?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo vaciar la tabla.');
    } finally {
      setEliminando(null);
    }
  }

  const esTablaUsuarios = tabla === 'usuarios';

  return (
    <>
      <Modal
        abierto
        titulo={`${meta.icono} ${meta.etiqueta}`}
        onClose={onClose}
        ancho="xl"
        footer={
          <div className="bd__modal-footer">
            <span className="bd__modal-total">{pagination.total} registro{pagination.total !== 1 ? 's' : ''}</span>
            <div className="bd__modal-footer-btns">
              {!esTablaUsuarios && (
                <Button
                  variant="danger"
                  onClick={() => setConfirmTodos(true)}
                  disabled={registros.length === 0 || !!eliminando}
                >
                  🗑 Vaciar tabla
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            </div>
          </div>
        }
      >
        <div className="bd__modal-contenido">
          {error && <p className="bd__error">{error}</p>}

          {cargando ? (
            <p className="bd__cargando">Cargando registros...</p>
          ) : registros.length === 0 ? (
            <p className="bd__vacio">Esta tabla está vacía.</p>
          ) : (
            <div className="bd__tabla-scroll">
              <table className="bd__tabla">
                <thead>
                  <tr>
                    {columnas.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                    <th className="bd__th-accion">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((row) => (
                    <tr key={row.id}>
                      {columnas.map((col) => (
                        <td key={col}>{renderCelda(row[col])}</td>
                      ))}
                      <td className="bd__td-accion">
                        <button
                          className="bd__btn-eliminar"
                          onClick={() => setConfirmId(row.id)}
                          disabled={!!eliminando}
                          title="Eliminar registro"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {pagination.pages > 1 && (
            <div className="bd__pagination">
              <button
                className="bd__pag-btn"
                disabled={pagination.page <= 1}
                onClick={() => cargar(pagination.page - 1)}
              >← Anterior</button>
              <span className="bd__pag-info">
                Página {pagination.page} / {pagination.pages}
              </span>
              <button
                className="bd__pag-btn"
                disabled={pagination.page >= pagination.pages}
                onClick={() => cargar(pagination.page + 1)}
              >Siguiente →</button>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm eliminar uno */}
      <ConfirmDialog
        abierto={confirmId !== null}
        titulo="Eliminar registro"
        mensaje={`¿Eliminar el registro con ID ${confirmId} de la tabla "${meta.etiqueta}"? Esta acción no se puede deshacer.`}
        onConfirmar={() => eliminarUno(confirmId)}
        onCancelar={() => setConfirmId(null)}
        textoConfirmar="Eliminar"
        cargando={eliminando === confirmId}
      />

      {/* Confirm vaciar todos */}
      <ConfirmDialog
        abierto={confirmTodos}
        titulo={`Vaciar tabla "${meta.etiqueta}"`}
        mensaje={`Esto eliminará TODOS los ${pagination.total} registros de la tabla "${meta.etiqueta}". Esta acción es irreversible.`}
        onConfirmar={eliminarTodos}
        onCancelar={() => setConfirmTodos(false)}
        textoConfirmar="Vaciar tabla"
        cargando={eliminando === 'todos'}
      />
    </>
  );
}

// ─── Fila de tabla en el resumen ──────────────────────────────────────────────

function FilaResumen({ item, onVerTabla }) {
  const meta = META_MAP[item.tabla] || { icono: '🗄' };
  return (
    <div className="bd__fila">
      <span className="bd__fila-icono">{meta.icono}</span>
      <span className="bd__fila-nombre">{item.etiqueta}</span>
      <span className={`bd__fila-count ${item.total > 0 ? 'bd__fila-count--has' : ''}`}>
        {item.total.toLocaleString()} registro{item.total !== 1 ? 's' : ''}
      </span>
      <button
        className="bd__fila-ver"
        onClick={() => onVerTabla(item.tabla)}
        title={`Ver registros de ${item.etiqueta}`}
      >
        Ver →
      </button>
    </div>
  );
}

// ─── SeccionBD (componente principal) ────────────────────────────────────────

export default function SeccionBD() {
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [tablaActiva, setTablaActiva] = useState(null);
  const [cargado, setCargado] = useState(false);

  const cargarResumen = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await bdResumen();
      setResumen(resp.data ?? resp);
      setCargado(true);
    } catch {
      setResumen([]);
    } finally {
      setCargando(false);
    }
  }, []);

  function toggleAbierto() {
    if (!abierto && !cargado) cargarResumen();
    setAbierto((p) => !p);
  }

  const totalRegistros = resumen.reduce((s, t) => s + t.total, 0);

  return (
    <section className="configuracion__seccion bd__seccion">
      {/* Header collapse */}
      <button className="bd__collapse-hdr" onClick={toggleAbierto}>
        <div className="bd__collapse-titulo">
          <span className="bd__collapse-icono">🗄</span>
          <div>
            <h2 className="bd__collapse-h2">Gestión de base de datos</h2>
            <p className="bd__collapse-sub">
              {cargado
                ? `${resumen.length} tablas · ${totalRegistros.toLocaleString()} registros totales`
                : 'Solo visible para super administrador'}
            </p>
          </div>
        </div>
        <span className="bd__collapse-chev">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="bd__contenido">
          <div className="bd__advertencia">
            ⚠️ <strong>Zona restringida.</strong> Las eliminaciones son permanentes e irreversibles.
            Úsalo solo para limpiar datos de prueba o resolver inconsistencias.
          </div>

          <div className="bd__acciones-top">
            <Button variant="secondary" onClick={cargarResumen} loading={cargando}>
              🔄 Actualizar conteos
            </Button>
          </div>

          {cargando && !cargado && (
            <p className="bd__cargando">Cargando resumen...</p>
          )}

          {cargado && (
            <div className="bd__lista">
              {resumen.map((item) => (
                <FilaResumen
                  key={item.tabla}
                  item={item}
                  onVerTabla={setTablaActiva}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de tabla */}
      {tablaActiva && (
        <ModalTabla
          tabla={tablaActiva}
          onClose={() => setTablaActiva(null)}
          onCambio={cargarResumen}
        />
      )}
    </section>
  );
}
