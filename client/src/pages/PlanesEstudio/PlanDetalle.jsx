import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  obtenerPlan,
  actualizarPlan,
  activarPlan,
  desactivarPlan,
  crearSeccion,
  actualizarSeccion,
  eliminarSeccion,
  reordenarSecciones,
  crearItemEnSeccion,
  actualizarItem,
  eliminarItem,
  reordenarItems,
  obtenerHistorial,
  calificarEntrega,
  obtenerReporte,
  exportarReporte,
  eliminarEntregaPlan,
  notificarPlan,
  notificarItem,
} from '../../services/planesEstudio.service';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FormField from '../../components/ui/FormField';
import StatusBadge from '../../components/ui/StatusBadge';
import './PlanesEstudio.css';

// ─── Constantes ────────────────────────────────────────────────────────────────

const PESTANAS = [
  { clave: 'estructura', titulo: '📋 Estructura' },
  { clave: 'historial', titulo: '📥 Historial' },
  { clave: 'reporte', titulo: '📊 Reporte' },
];

const CATS = [
  { value: '', label: 'Sin calificación' },
  { value: 'EXCELENTE', label: 'Excelente' },
  { value: 'POR_MEJORAR', label: 'Por mejorar' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }) {
  return tipo === 'EXAMEN'
    ? <StatusBadge texto="Examen" variant="danger" />
    : <StatusBadge texto="Actividad" variant="info" />;
}

function CalifBadge({ tipo }) {
  const mapa = {
    NUMERICA: ['Numérica', 'info'],
    CATEGORICA: ['Categórica', 'warning'],
    SIMPLE: ['Simple', 'secondary'],
  };
  const [texto, variant] = mapa[tipo] || [tipo, 'secondary'];
  return <StatusBadge texto={texto} variant={variant} />;
}

// ─── Modal Notificar ───────────────────────────────────────────────────────────

function ModalNotificar({ tipo, planId, itemId, itemTitulo, onClose }) {
  const [canal, setCanal] = useState('WHATSAPP');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  async function enviar() {
    setCargando(true);
    setError('');
    try {
      const r = tipo === 'plan'
        ? await notificarPlan(planId, { canal })
        : await notificarItem(planId, itemId, { canal });
      setResultado(r.data ?? r);
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al notificar');
    } finally {
      setCargando(false);
    }
  }

  const titulo = tipo === 'plan' ? 'Notificar plan' : `Notificar: ${itemTitulo}`;
  const destinatariosConEmail = (resultado ?? []).filter((d) => d.email).length;

  return (
    <Modal
      abierto
      titulo={`🔔 ${titulo}`}
      onClose={onClose}
      footer={
        resultado
          ? <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          : (
            <>
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button loading={cargando} onClick={enviar}>Notificar</Button>
            </>
          )
      }
    >
      {!resultado ? (
        <div className="planes-det__form">
          <FormField
            label="Canal de envío"
            type="select"
            name="canal"
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            options={[
              { value: 'WHATSAPP', label: '💬 WhatsApp (generar links)' },
              { value: 'EMAIL', label: '📧 Email (envío automático)' },
              { value: 'AMBOS', label: '💬📧 WhatsApp + Email' },
            ]}
          />
          {error && <p className="planes-det__error">{error}</p>}
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: 10 }}>
            <strong>{resultado.length}</strong> destinatario(s) procesados.
          </p>
          {(canal === 'EMAIL' || canal === 'AMBOS') && (
            <p style={{ color: 'var(--color-success)', marginBottom: 10 }}>
              ✅ Emails enviados a {destinatariosConEmail} miembro(s) con correo registrado.
            </p>
          )}
          {(canal === 'WHATSAPP' || canal === 'AMBOS') && (
            <div className="planes-det__notif-lista">
              {resultado.filter((d) => d.url_whatsapp).map((d) => (
                <a
                  key={d.miembro_id}
                  href={d.url_whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="planes-det__notif-link"
                >
                  💬 {d.nombre}
                </a>
              ))}
              {resultado.every((d) => !d.url_whatsapp) && (
                <p style={{ color: 'var(--color-secondary)', fontSize: 13 }}>
                  Ningún destinatario tiene número de WhatsApp registrado.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Tab Estructura ────────────────────────────────────────────────────────────

function TabEstructura({ plan, onRefresh, onNotificarItem }) {
  const secciones = plan.secciones ?? [];
  const esNumerica = plan.tipo_calificacion === 'NUMERICA';

  const todosItems = secciones.flatMap((s) => s.items ?? []);
  const sumaPonderados = todosItems.reduce((s, i) => s + (Number(i.ponderado) || 0), 0);

  // Edición inline de nombre de sección
  const [editandoSeccion, setEditandoSeccion] = useState(null); // { id, nombre }
  const [guardandoSeccion, setGuardandoSeccion] = useState(false);
  const inputSeccionRef = useRef(null);

  // Modal ítem
  const [modalItem, setModalItem] = useState(null); // { seccionId, item? }
  const [formItem, setFormItem] = useState({ titulo: '', tipo: 'ACTIVIDAD', ponderado: '', fecha_limite: '' });
  const [guardandoItem, setGuardandoItem] = useState(false);
  const [errorItem, setErrorItem] = useState('');

  // Confirm eliminar
  const [confirmEliminar, setConfirmEliminar] = useState(null); // { tipo, id, nombre }

  // ── Secciones ──

  async function crearNuevaSeccion() {
    try {
      await crearSeccion(plan.id, { nombre: 'Nueva sección' });
      onRefresh();
    } catch { /* silent */ }
  }

  function iniciarEditarSeccion(sec) {
    setEditandoSeccion({ id: sec.id, nombre: sec.nombre });
    setTimeout(() => inputSeccionRef.current?.focus(), 50);
  }

  async function guardarNombreSeccion() {
    if (!editandoSeccion) return;
    setGuardandoSeccion(true);
    try {
      await actualizarSeccion(plan.id, editandoSeccion.id, { nombre: editandoSeccion.nombre });
      onRefresh();
    } catch { /* silent */ }
    finally {
      setGuardandoSeccion(false);
      setEditandoSeccion(null);
    }
  }

  async function moverSeccion(sec, dir) {
    const sorted = [...secciones].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((s) => s.id === sec.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const ordenes = sorted.map((s, j) => {
      if (j === idx) return { id: s.id, orden: sorted[swapIdx].orden };
      if (j === swapIdx) return { id: s.id, orden: sorted[idx].orden };
      return { id: s.id, orden: s.orden };
    });
    try { await reordenarSecciones(plan.id, ordenes); onRefresh(); } catch { /* silent */ }
  }

  async function confirmarEliminarAccion() {
    if (!confirmEliminar) return;
    try {
      if (confirmEliminar.tipo === 'seccion') {
        await eliminarSeccion(plan.id, confirmEliminar.id);
      } else {
        await eliminarItem(plan.id, confirmEliminar.id);
      }
      setConfirmEliminar(null);
      onRefresh();
    } catch { setConfirmEliminar(null); }
  }

  // ── Ítems ──

  function abrirCrearItem(seccionId) {
    setModalItem({ seccionId, item: null });
    setFormItem({ titulo: '', descripcion: '', url_recurso: '', tipo: 'ACTIVIDAD', ponderado: '', fecha_limite: '' });
    setErrorItem('');
  }

  function abrirEditarItem(seccionId, item) {
    setModalItem({ seccionId, item });
    setFormItem({
      titulo: item.titulo,
      descripcion: item.descripcion || '',
      url_recurso: item.url_recurso || '',
      tipo: item.tipo,
      ponderado: item.ponderado ?? '',
      fecha_limite: item.fecha_limite ? item.fecha_limite.slice(0, 10) : '',
    });
    setErrorItem('');
  }

  async function guardarItem(e) {
    e.preventDefault();
    if (!formItem.titulo.trim()) return setErrorItem('El título es obligatorio.');
    if (esNumerica && !modalItem.item && formItem.ponderado === '')
      return setErrorItem('El ponderado es obligatorio para planes numéricos.');
    setGuardandoItem(true);
    setErrorItem('');
    try {
      const payload = {
        titulo: formItem.titulo.trim(),
        descripcion: formItem.descripcion.trim() || null,
        url_recurso: formItem.url_recurso.trim() || null,
        tipo: formItem.tipo,
        ponderado: esNumerica && formItem.ponderado !== '' ? Number(formItem.ponderado) : null,
        fecha_limite: formItem.fecha_limite || null,
      };
      if (modalItem.item) {
        await actualizarItem(plan.id, modalItem.item.id, payload);
      } else {
        await crearItemEnSeccion(plan.id, modalItem.seccionId, payload);
      }
      setModalItem(null);
      onRefresh();
    } catch (err) {
      setErrorItem(err?.response?.data?.message || 'No se pudo guardar el ítem.');
    } finally {
      setGuardandoItem(false);
    }
  }

  async function moverItem(seccion, item, dir) {
    const sorted = [...(seccion.items ?? [])].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const ordenes = sorted.map((i, j) => {
      if (j === idx) return { id: i.id, orden: sorted[swapIdx].orden };
      if (j === swapIdx) return { id: i.id, orden: sorted[idx].orden };
      return { id: i.id, orden: i.orden };
    });
    try { await reordenarItems(plan.id, ordenes); onRefresh(); } catch { /* silent */ }
  }

  const secsSorted = [...secciones].sort((a, b) => a.orden - b.orden);

  return (
    <div className="planes-det__estructura">
      {/* Cabecera */}
      <div className="planes-det__est-header">
        <div>
          {esNumerica && (
            <p className={`planes-det__pond-total ${Math.abs(sumaPonderados - 100) > 0.01 ? 'planes-det__pond-total--warn' : 'planes-det__pond-total--ok'}`}>
              Suma ponderados: <strong>{sumaPonderados.toFixed(1)}%</strong>
              {Math.abs(sumaPonderados - 100) > 0.01 && ' ⚠ debe sumar 100%'}
            </p>
          )}
        </div>
        <Button onClick={crearNuevaSeccion}>+ Nueva sección</Button>
      </div>

      {secsSorted.length === 0 && (
        <div className="planes-det__empty-state">
          <span className="planes-det__empty-icon">📂</span>
          <p>Aún no hay secciones. Crea la primera para organizar el plan.</p>
        </div>
      )}

      {secsSorted.map((sec, secIdx) => {
        const itemsSorted = [...(sec.items ?? [])].sort((a, b) => a.orden - b.orden);
        return (
          <div key={sec.id} className="planes-det__seccion-card">
            {/* Header sección */}
            <div className="planes-det__seccion-hdr">
              <div className="planes-det__seccion-reorder">
                <button
                  className="planes-det__flecha"
                  onClick={() => moverSeccion(sec, -1)}
                  disabled={secIdx === 0}
                  title="Subir"
                >▲</button>
                <button
                  className="planes-det__flecha"
                  onClick={() => moverSeccion(sec, 1)}
                  disabled={secIdx === secsSorted.length - 1}
                  title="Bajar"
                >▼</button>
              </div>
              <span className="planes-det__seccion-icono">📂</span>
              {editandoSeccion?.id === sec.id ? (
                <input
                  ref={inputSeccionRef}
                  className="planes-det__seccion-input"
                  value={editandoSeccion.nombre}
                  onChange={(e) => setEditandoSeccion((p) => ({ ...p, nombre: e.target.value }))}
                  onBlur={guardarNombreSeccion}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') guardarNombreSeccion();
                    if (e.key === 'Escape') setEditandoSeccion(null);
                  }}
                  disabled={guardandoSeccion}
                />
              ) : (
                <span
                  className="planes-det__seccion-nombre"
                  onClick={() => iniciarEditarSeccion(sec)}
                  title="Clic para renombrar"
                >
                  {sec.nombre}
                </span>
              )}
              <span className="planes-det__seccion-count">
                {itemsSorted.length} ítem{itemsSorted.length !== 1 ? 's' : ''}
              </span>
              <div className="planes-det__seccion-acciones">
                <button
                  className="planes-det__btn-ghost"
                  onClick={() => iniciarEditarSeccion(sec)}
                  title="Renombrar"
                >✏️</button>
                <button
                  className="planes-det__btn-ghost planes-det__btn-ghost--danger"
                  onClick={() => setConfirmEliminar({ tipo: 'seccion', id: sec.id, nombre: sec.nombre })}
                  title="Eliminar sección"
                >🗑</button>
              </div>
            </div>

            {/* Ítems de la sección */}
            <div className="planes-det__items-lista">
              {itemsSorted.map((item, itemIdx) => (
                <div
                  key={item.id}
                  className={`planes-det__item-row ${item.tipo === 'EXAMEN' ? 'planes-det__item-row--examen' : ''}`}
                >
                  <div className="planes-det__item-reorder">
                    <button
                      className="planes-det__flecha"
                      onClick={() => moverItem(sec, item, -1)}
                      disabled={itemIdx === 0}
                    >▲</button>
                    <button
                      className="planes-det__flecha"
                      onClick={() => moverItem(sec, item, 1)}
                      disabled={itemIdx === itemsSorted.length - 1}
                    >▼</button>
                  </div>
                  <TipoBadge tipo={item.tipo} />
                  <span className="planes-det__item-titulo">{item.titulo}</span>
                  {esNumerica && item.ponderado != null && (
                    <span className="planes-det__item-pond">{item.ponderado}%</span>
                  )}
                  {item.fecha_limite && (
                    <span className="planes-det__item-fecha">
                      📅 {item.fecha_limite.slice(0, 10)}
                    </span>
                  )}
                  {item.tipo === 'EXAMEN' && (
                    <span className="planes-det__item-lock-hint">🔒 se desbloquea al completar sección</span>
                  )}
                  <div className="planes-det__item-btns">
                    <button
                      className="planes-det__btn-link"
                      onClick={() => abrirEditarItem(sec.id, item)}
                    >Editar</button>
                    <button
                      className="planes-det__btn-link"
                      onClick={() => onNotificarItem && onNotificarItem(item)}
                      title="Notificar miembros sobre este ítem"
                    >🔔</button>
                    <button
                      className="planes-det__btn-link planes-det__btn-link--danger"
                      onClick={() => setConfirmEliminar({ tipo: 'item', id: item.id, nombre: item.titulo })}
                    >Eliminar</button>
                  </div>
                </div>
              ))}
              <button className="planes-det__add-item-btn" onClick={() => abrirCrearItem(sec.id)}>
                + Agregar ítem
              </button>
            </div>
          </div>
        );
      })}

      {/* Modal ítem */}
      <Modal
        abierto={!!modalItem}
        titulo={modalItem?.item ? 'Editar ítem' : 'Nuevo ítem'}
        onClose={() => setModalItem(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalItem(null)}>Cancelar</Button>
            <Button onClick={guardarItem} loading={guardandoItem}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardarItem} className="planes-det__form">
          <FormField
            label="Título"
            name="titulo"
            value={formItem.titulo}
            onChange={(e) => setFormItem((p) => ({ ...p, titulo: e.target.value }))}
            required
          />
          <FormField
            label="Descripción (visible para el miembro)"
            type="textarea"
            name="descripcion"
            value={formItem.descripcion}
            onChange={(e) => setFormItem((p) => ({ ...p, descripcion: e.target.value }))}
            helpText="Explica qué debe hacer el estudiante en esta actividad."
          />
          <FormField
            label="Enlace a recursos (opcional)"
            name="url_recurso"
            value={formItem.url_recurso}
            onChange={(e) => setFormItem((p) => ({ ...p, url_recurso: e.target.value }))}
            placeholder="https://drive.google.com/..."
            helpText="Link a Drive, YouTube, Notion u otro recurso para el estudiante."
          />
          <FormField
            label="Tipo"
            type="select"
            name="tipo"
            value={formItem.tipo}
            onChange={(e) => setFormItem((p) => ({ ...p, tipo: e.target.value }))}
            options={[
              { value: 'ACTIVIDAD', label: 'Actividad' },
              { value: 'EXAMEN', label: 'Examen (se desbloquea al completar actividades previas)' },
            ]}
          />
          {esNumerica && (
            <FormField
              label="Ponderado (%)"
              type="number"
              name="ponderado"
              value={formItem.ponderado}
              onChange={(e) => setFormItem((p) => ({ ...p, ponderado: e.target.value }))}
              min="0"
              max="100"
              step="0.01"
            />
          )}
          <FormField
            label="Fecha límite (opcional)"
            type="date"
            name="fecha_limite"
            value={formItem.fecha_limite}
            onChange={(e) => setFormItem((p) => ({ ...p, fecha_limite: e.target.value }))}
          />
          {errorItem && <p className="planes-det__error">{errorItem}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmEliminar}
        titulo={confirmEliminar?.tipo === 'seccion' ? 'Eliminar sección' : 'Eliminar ítem'}
        mensaje={
          confirmEliminar?.tipo === 'seccion'
            ? `¿Eliminar la sección "${confirmEliminar?.nombre}" y todos sus ítems?`
            : `¿Eliminar el ítem "${confirmEliminar?.nombre}"?`
        }
        onConfirmar={confirmarEliminarAccion}
        onCancelar={() => setConfirmEliminar(null)}
        textoConfirmar="Eliminar"
      />
    </div>
  );
}

// ─── Tab Historial ─────────────────────────────────────────────────────────────

function TabHistorial({ plan }) {
  const [historialSecciones, setHistorialSecciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [expandidos, setExpandidos] = useState({});
  const [valores, setValores] = useState({});
  const [calificando, setCalificando] = useState({});
  const [exito, setExito] = useState({});
  const [confirmEliminarEntrega, setConfirmEliminarEntrega] = useState(null); // entrega id

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await obtenerHistorial(plan.id);
      const raw = resp.data ?? resp;
      // raw = { plan, secciones } ó array directo
      const secciones = Array.isArray(raw) ? raw : (raw.secciones ?? []);
      setHistorialSecciones(secciones);
      // Pre-poblar valores con calificaciones ya existentes
      const init = {};
      for (const sec of secciones) {
        for (const item of sec.items ?? []) {
          for (const e of item.entregas ?? []) {
            init[e.id] = {
              calificacion: e.calificacion ?? '',
              calificacion_categorica: e.calificacion_categorica ?? '',
              retroalimentacion: e.retroalimentacion ?? '',
            };
          }
        }
      }
      setValores(init);
    } catch {
      setHistorialSecciones([]);
    } finally {
      setCargando(false);
    }
  }, [plan.id]);

  useEffect(() => { cargar(); }, [cargar]);

  function toggle(key) {
    setExpandidos((p) => ({ ...p, [key]: !p[key] }));
  }

  function setVal(eid, campo, v) {
    setValores((p) => ({ ...p, [eid]: { ...p[eid], [campo]: v } }));
  }

  async function confirmarEliminarEntrega() {
    if (!confirmEliminarEntrega) return;
    try {
      await eliminarEntregaPlan(plan.id, confirmEliminarEntrega);
      setConfirmEliminarEntrega(null);
      cargar();
    } catch { setConfirmEliminarEntrega(null); }
  }

  async function guardarCalif(eid) {
    setCalificando((p) => ({ ...p, [eid]: true }));
    try {
      const v = valores[eid] || {};
      const payload = { retroalimentacion: v.retroalimentacion || null };
      if (plan.tipo_calificacion === 'NUMERICA') {
        payload.calificacion = v.calificacion !== '' ? Number(v.calificacion) : null;
      } else if (plan.tipo_calificacion === 'CATEGORICA') {
        payload.calificacion_categorica = v.calificacion_categorica || null;
      }
      await calificarEntrega(plan.id, eid, payload);
      setExito((p) => ({ ...p, [eid]: true }));
      setTimeout(() => setExito((p) => ({ ...p, [eid]: false })), 2500);
      cargar();
    } catch { /* silent */ }
    finally { setCalificando((p) => ({ ...p, [eid]: false })); }
  }

  if (cargando) return <p className="planes-det__cargando">Cargando historial...</p>;
  if (historialSecciones.length === 0) {
    return <p className="planes-det__vacio">Aún no hay entregas registradas.</p>;
  }

  const totalEntregas = historialSecciones.reduce(
    (s, sec) => s + (sec.items ?? []).reduce((ss, i) => ss + (i.entregas?.length ?? 0), 0),
    0
  );

  return (
    <div className="planes-det__historial">
      <p className="planes-det__hist-total">
        <strong>{totalEntregas}</strong> entrega{totalEntregas !== 1 ? 's' : ''} en total
      </p>

      <ConfirmDialog
        abierto={!!confirmEliminarEntrega}
        titulo="Eliminar entrega"
        mensaje="¿Eliminar esta entrega? Esta acción no se puede deshacer."
        onConfirmar={confirmarEliminarEntrega}
        onCancelar={() => setConfirmEliminarEntrega(null)}
        textoConfirmar="Eliminar"
      />

      {historialSecciones.map((sec) => (
        <div key={sec.id} className="planes-det__hist-seccion">
          <h3 className="planes-det__hist-seccion-titulo">📂 {sec.nombre}</h3>

          {(sec.items ?? []).map((item) => {
            const key = `item-${item.id}`;
            const cnt = item.entregas?.length ?? 0;
            return (
              <div key={item.id} className="planes-det__hist-item">
                <button
                  className="planes-det__hist-item-hdr"
                  onClick={() => toggle(key)}
                >
                  <TipoBadge tipo={item.tipo} />
                  <span className="planes-det__hist-item-titulo">{item.titulo}</span>
                  <span className={`planes-det__hist-cnt ${cnt > 0 ? 'planes-det__hist-cnt--has' : ''}`}>
                    {cnt} entrega{cnt !== 1 ? 's' : ''}
                  </span>
                  <span className="planes-det__chev">{expandidos[key] ? '▲' : '▼'}</span>
                </button>

                {expandidos[key] && (
                  <div className="planes-det__hist-entregas">
                    {cnt === 0 && <p className="planes-det__vacio-sub">Sin entregas aún.</p>}
                    {item.entregas?.map((e) => (
                      <div key={e.id} className="planes-det__entrega-card">
                        <div className="planes-det__entrega-card-top">
                          <div>
                            <strong className="planes-det__entrega-nombre">{e.miembro_nombre}</strong>
                            <span className="planes-det__entrega-fecha">
                              {e.fecha_entrega ? e.fecha_entrega.slice(0, 10) : '—'}
                            </span>
                          </div>
                          <div className="planes-det__entrega-estado">
                            <button
                              className="planes-det__btn-ghost planes-det__btn-ghost--danger"
                              title="Eliminar entrega"
                              onClick={() => setConfirmEliminarEntrega(e.id)}
                              style={{ fontSize: 13 }}
                            >🗑</button>
                            {e.calificacion != null && (
                              <span className="planes-det__entrega-nota">{e.calificacion}</span>
                            )}
                            {e.calificacion_categorica && (
                              <StatusBadge
                                texto={e.calificacion_categorica === 'EXCELENTE' ? 'Excelente' : 'Por mejorar'}
                                variant={e.calificacion_categorica === 'EXCELENTE' ? 'success' : 'warning'}
                              />
                            )}
                            {plan.tipo_calificacion === 'SIMPLE' && (
                              <StatusBadge texto="Entregado" variant="success" />
                            )}
                          </div>
                        </div>

                        {e.observaciones && (
                          <p className="planes-det__entrega-obs">"{e.observaciones}"</p>
                        )}
                        {e.url_evidencia && (
                          <a
                            href={e.url_evidencia}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="planes-det__entrega-link"
                          >
                            🔗 Ver evidencia
                          </a>
                        )}

                        <div className="planes-det__calif-row">
                          {plan.tipo_calificacion === 'NUMERICA' && (
                            <input
                              type="number"
                              className="planes-det__calif-input"
                              min="0"
                              max="10"
                              step="0.1"
                              placeholder="Nota (0–10)"
                              value={valores[e.id]?.calificacion ?? ''}
                              onChange={(ev) => setVal(e.id, 'calificacion', ev.target.value)}
                            />
                          )}
                          {plan.tipo_calificacion === 'CATEGORICA' && (
                            <select
                              className="planes-det__calif-select"
                              value={valores[e.id]?.calificacion_categorica ?? ''}
                              onChange={(ev) => setVal(e.id, 'calificacion_categorica', ev.target.value)}
                            >
                              {CATS.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            className="planes-det__calif-retro"
                            placeholder="Retroalimentación (opcional)"
                            value={valores[e.id]?.retroalimentacion ?? ''}
                            onChange={(ev) => setVal(e.id, 'retroalimentacion', ev.target.value)}
                          />
                          <Button loading={calificando[e.id]} onClick={() => guardarCalif(e.id)}>
                            {exito[e.id] ? '✓ Guardado' : (plan.tipo_calificacion === 'SIMPLE' ? 'Guardar retro' : 'Guardar')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Tab Reporte ───────────────────────────────────────────────────────────────

function TabReporte({ plan }) {
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    setCargando(true);
    obtenerReporte(plan.id)
      .then((r) => setReporte(r.data ?? r))
      .catch(() => setReporte(null))
      .finally(() => setCargando(false));
  }, [plan.id]);

  async function exportar(fmt) {
    setExportando(true);
    try { await exportarReporte(plan.id, fmt); } catch { /* silent */ }
    finally { setExportando(false); }
  }

  if (cargando) return <p className="planes-det__cargando">Cargando reporte...</p>;
  if (!reporte) return <p className="planes-det__vacio">No se pudo cargar el reporte.</p>;

  const { items = [], miembros = [] } = reporte;

  const totalMiembros = miembros.length;
  const aprobados = plan.tipo_calificacion === 'NUMERICA'
    ? miembros.filter((m) => m.aprobado).length
    : null;
  const promedio = plan.tipo_calificacion === 'NUMERICA' && miembros.length > 0
    ? (miembros.reduce((s, m) => s + (m.nota_final ?? 0), 0) / miembros.length).toFixed(2)
    : null;

  return (
    <div className="planes-det__reporte">
      {/* Tarjetas de resumen */}
      <div className="planes-det__reporte-stats">
        <div className="planes-det__stat-card">
          <span className="planes-det__stat-num">{totalMiembros}</span>
          <span className="planes-det__stat-lbl">Estudiantes</span>
        </div>
        {aprobados !== null && (
          <div className="planes-det__stat-card planes-det__stat-card--success">
            <span className="planes-det__stat-num">{aprobados}</span>
            <span className="planes-det__stat-lbl">Aprobados</span>
          </div>
        )}
        {promedio !== null && (
          <div className="planes-det__stat-card planes-det__stat-card--info">
            <span className="planes-det__stat-num">{promedio}</span>
            <span className="planes-det__stat-lbl">Promedio</span>
          </div>
        )}
        {plan.tipo_calificacion === 'NUMERICA' && plan.nota_minima_aprobacion && (
          <div className="planes-det__stat-card">
            <span className="planes-det__stat-num">{plan.nota_minima_aprobacion}</span>
            <span className="planes-det__stat-lbl">Nota mínima</span>
          </div>
        )}
      </div>

      <div className="planes-det__reporte-actions">
        <Button variant="secondary" loading={exportando} onClick={() => exportar('excel')}>
          ↓ Excel
        </Button>
        <Button variant="secondary" loading={exportando} onClick={() => exportar('pdf')}>
          ↓ PDF
        </Button>
      </div>

      {miembros.length === 0 ? (
        <p className="planes-det__vacio">No hay estudiantes inscritos en este nivel.</p>
      ) : (
        <div className="planes-det__tabla-scroll">
          <table className="planes-det__tabla planes-det__tabla--reporte">
            <thead>
              <tr>
                <th>Estudiante</th>
                {items.map((it) => (
                  <th key={it.id} title={it.titulo}>
                    <span className="planes-det__th-item">
                      {it.tipo === 'EXAMEN' ? '★ ' : '● '}
                      {it.titulo.length > 14 ? `${it.titulo.slice(0, 12)}…` : it.titulo}
                      {plan.tipo_calificacion === 'NUMERICA' && it.ponderado != null && (
                        <span className="planes-det__th-pond"> ({it.ponderado}%)</span>
                      )}
                    </span>
                  </th>
                ))}
                {plan.tipo_calificacion === 'NUMERICA' && <th>Nota final</th>}
                {plan.tipo_calificacion === 'NUMERICA' && <th>Estado</th>}
                {plan.tipo_calificacion === 'SIMPLE' && <th>% Entregado</th>}
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => (
                <tr key={m.id}>
                  <td className="planes-det__td-nombre">{m.nombres_completos}</td>
                  {items.map((it) => {
                    // calificaciones es OBJETO { [item_id]: valor }, no array
                    const val = m.calificaciones?.[it.id];
                    let celda = '—';
                    let cls = 'planes-det__td-vacio';
                    if (val != null) {
                      if (plan.tipo_calificacion === 'NUMERICA') {
                        celda = String(val);
                        cls = Number(val) >= (plan.nota_minima_aprobacion ?? 0)
                          ? 'planes-det__td-ok'
                          : 'planes-det__td-mal';
                      } else if (plan.tipo_calificacion === 'CATEGORICA') {
                        celda = val === 'EXCELENTE' ? '⭐ Excelente' : '⚠ Por mejorar';
                        cls = val === 'EXCELENTE' ? 'planes-det__td-ok' : 'planes-det__td-warn';
                      } else {
                        celda = '✓';
                        cls = 'planes-det__td-ok';
                      }
                    }
                    return <td key={it.id} className={cls}>{celda}</td>;
                  })}
                  {plan.tipo_calificacion === 'NUMERICA' && (
                    <td className="planes-det__td-nota">
                      <strong>{m.nota_final ?? '—'}</strong>
                    </td>
                  )}
                  {plan.tipo_calificacion === 'NUMERICA' && (
                    <td>
                      {m.nota_final != null ? (
                        <StatusBadge
                          texto={m.aprobado ? 'Aprobó' : 'No aprobó'}
                          variant={m.aprobado ? 'success' : 'danger'}
                        />
                      ) : '—'}
                    </td>
                  )}
                  {plan.tipo_calificacion === 'SIMPLE' && (
                    <td>{m.porcentaje_entrega ?? 0}%</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PlanDetalle (principal) ───────────────────────────────────────────────────

export default function PlanDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState('estructura');

  const [editandoPlan, setEditandoPlan] = useState(false);
  const [formPlan, setFormPlan] = useState({
    nombre: '', descripcion: '', nota_minima_aprobacion: '', fecha_inicio: '', fecha_fin: '',
  });
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  const [confirmAccion, setConfirmAccion] = useState(null); // 'activar' | 'desactivar'
  const [modalNotificar, setModalNotificar] = useState(null); // { tipo: 'plan'|'item', itemId?, itemTitulo? }

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await obtenerPlan(id);
      const data = resp.data ?? resp;
      setPlan(data);
      setFormPlan({
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        nota_minima_aprobacion: data.nota_minima_aprobacion ?? '',
        fecha_inicio: data.fecha_inicio ? data.fecha_inicio.slice(0, 10) : '',
        fecha_fin: data.fecha_fin ? data.fecha_fin.slice(0, 10) : '',
      });
    } catch {
      setPlan(null);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function ejecutarAccion() {
    if (!confirmAccion) return;
    try {
      if (confirmAccion === 'activar') await activarPlan(id);
      else await desactivarPlan(id);
      setConfirmAccion(null);
      cargar();
    } catch { setConfirmAccion(null); }
  }

  async function guardarPlan(e) {
    e.preventDefault();
    setGuardandoPlan(true);
    try {
      await actualizarPlan(id, {
        nombre: formPlan.nombre,
        descripcion: formPlan.descripcion,
        nota_minima_aprobacion: formPlan.nota_minima_aprobacion || null,
        fecha_inicio: formPlan.fecha_inicio || null,
        fecha_fin: formPlan.fecha_fin || null,
      });
      setEditandoPlan(false);
      cargar();
    } catch { /* silent */ }
    finally { setGuardandoPlan(false); }
  }

  if (cargando) {
    return <div className="planes-det"><p className="planes-det__cargando">Cargando plan...</p></div>;
  }

  if (!plan) {
    return (
      <div className="planes-det">
        <button className="planes-det__volver" onClick={() => navigate('/planes-estudio')}>← Volver</button>
        <p className="planes-det__vacio">Plan no encontrado.</p>
      </div>
    );
  }

  const secciones = plan.secciones ?? [];
  const totalItems = secciones.flatMap((s) => s.items ?? []).length;

  return (
    <div className="planes-det">
      <button className="planes-det__volver" onClick={() => navigate('/planes-estudio')}>
        ← Planes de estudio
      </button>

      {/* ── Cabecera del plan ── */}
      <div className="planes-det__header">
        <div className="planes-det__header-left">
          <div className="planes-det__header-meta">
            <span className="planes-det__nivel-chip">{plan.nivel_nombre}</span>
            <CalifBadge tipo={plan.tipo_calificacion} />
            <StatusBadge
              texto={plan.activo ? 'Activo' : 'Inactivo'}
              variant={plan.activo ? 'success' : 'secondary'}
            />
          </div>
          <h1 className="planes-det__titulo">{plan.nombre}</h1>
          {plan.descripcion && <p className="planes-det__descripcion">{plan.descripcion}</p>}
          <div className="planes-det__chips-row">
            <span className="planes-det__chip">📂 {secciones.length} secciones</span>
            <span className="planes-det__chip">📋 {totalItems} ítems</span>
            {plan.fecha_inicio && (
              <span className="planes-det__chip">
                📅 {plan.fecha_inicio.slice(0, 10)} → {plan.fecha_fin?.slice(0, 10) ?? '?'}
              </span>
            )}
            {plan.tipo_calificacion === 'NUMERICA' && plan.nota_minima_aprobacion && (
              <span className="planes-det__chip">✅ Nota mín: {plan.nota_minima_aprobacion}</span>
            )}
          </div>
        </div>
        <div className="planes-det__header-right">
          <Button variant="secondary" onClick={() => setModalNotificar({ tipo: 'plan' })}>🔔 Notificar</Button>
          <Button variant="secondary" onClick={() => setEditandoPlan(true)}>Editar plan</Button>
          {plan.activo
            ? <Button variant="secondary" onClick={() => setConfirmAccion('desactivar')}>Desactivar</Button>
            : <Button onClick={() => setConfirmAccion('activar')}>Activar</Button>
          }
        </div>
      </div>

      <Tabs pestanas={PESTANAS} activa={tabActiva} onChange={setTabActiva} />

      <div className="planes-det__contenido">
        {tabActiva === 'estructura' && (
          <TabEstructura
            plan={plan}
            onRefresh={cargar}
            onNotificarItem={(item) => setModalNotificar({ tipo: 'item', itemId: item.id, itemTitulo: item.titulo })}
          />
        )}
        {tabActiva === 'historial' && <TabHistorial plan={plan} />}
        {tabActiva === 'reporte' && <TabReporte plan={plan} />}
      </div>

      {/* Modal editar plan */}
      <Modal
        abierto={editandoPlan}
        titulo="Editar plan de estudios"
        onClose={() => setEditandoPlan(false)}
        ancho="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditandoPlan(false)}>Cancelar</Button>
            <Button onClick={guardarPlan} loading={guardandoPlan}>Guardar cambios</Button>
          </>
        }
      >
        <form onSubmit={guardarPlan} className="planes-det__form">
          <FormField
            label="Nombre del plan"
            name="nombre"
            value={formPlan.nombre}
            onChange={(e) => setFormPlan((p) => ({ ...p, nombre: e.target.value }))}
            required
          />
          <FormField
            label="Descripción"
            type="textarea"
            name="descripcion"
            value={formPlan.descripcion}
            onChange={(e) => setFormPlan((p) => ({ ...p, descripcion: e.target.value }))}
            rows={2}
          />
          {plan.tipo_calificacion === 'NUMERICA' && (
            <FormField
              label="Nota mínima de aprobación"
              type="number"
              name="nota_minima_aprobacion"
              value={formPlan.nota_minima_aprobacion}
              onChange={(e) => setFormPlan((p) => ({ ...p, nota_minima_aprobacion: e.target.value }))}
              min="0"
              max="10"
              step="0.1"
            />
          )}
          <div className="planes-estudio__form-fechas">
            <FormField
              label="Fecha inicio"
              type="date"
              name="fecha_inicio"
              value={formPlan.fecha_inicio}
              onChange={(e) => setFormPlan((p) => ({ ...p, fecha_inicio: e.target.value }))}
            />
            <FormField
              label="Fecha fin"
              type="date"
              name="fecha_fin"
              value={formPlan.fecha_fin}
              onChange={(e) => setFormPlan((p) => ({ ...p, fecha_fin: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Confirmar activar/desactivar */}
      <ConfirmDialog
        abierto={!!confirmAccion}
        titulo={confirmAccion === 'activar' ? 'Activar plan' : 'Desactivar plan'}
        mensaje={
          confirmAccion === 'activar'
            ? `¿Activar "${plan.nombre}"? Se desactivará cualquier otro plan activo del mismo nivel.`
            : `¿Desactivar "${plan.nombre}"? Los estudiantes dejarán de verlo.`
        }
        onConfirmar={ejecutarAccion}
        onCancelar={() => setConfirmAccion(null)}
        textoConfirmar={confirmAccion === 'activar' ? 'Activar' : 'Desactivar'}
      />

      {/* Modal notificar (plan o ítem) */}
      {modalNotificar && (
        <ModalNotificar
          tipo={modalNotificar.tipo}
          planId={plan.id}
          itemId={modalNotificar.itemId}
          itemTitulo={modalNotificar.itemTitulo}
          onClose={() => setModalNotificar(null)}
        />
      )}
    </div>
  );
}
