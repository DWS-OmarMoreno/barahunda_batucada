import { useState, useEffect, useCallback } from 'react';
import { obtenerMisTareas, enviarEntrega } from '../../services/portal.service';
import { obtenerMiPlan, entregarItem } from '../../services/planesEstudio.service';
import { formatearFecha } from '../../utils/formato';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import './Portal.css';

// ── Helpers ────────────────────────────────────────────────────────────────

function estadoTarea(t) {
  if (t.calificacion !== null && t.calificacion !== undefined)
    return { texto: `Nota: ${t.calificacion}/100`, variant: 'success' };
  if (t.entrega_id) return { texto: 'Entregada', variant: 'info' };
  if (t.fecha_limite && new Date(t.fecha_limite) < new Date())
    return { texto: 'Vencida', variant: 'danger' };
  return { texto: 'Pendiente', variant: 'warning' };
}

function califLabel(plan, item) {
  if (!item.entrega) return null;
  if (plan.tipo_calificacion === 'NUMERICA') {
    return item.entrega.calificacion != null ? `${item.entrega.calificacion}` : null;
  }
  if (plan.tipo_calificacion === 'CATEGORICA') {
    return item.entrega.calificacion_categorica ?? null;
  }
  return '✓';
}

// ── Plan timeline ──────────────────────────────────────────────────────────

function PlanTimeline({ plan, onEntregar }) {
  const items = [...(plan.items ?? [])].sort((a, b) => a.orden - b.orden);

  return (
    <div className="portal__plan-bloque">
      <div className="portal__plan-nivel">{plan.nivel_nombre}</div>
      <h3 className="portal__plan-nombre">{plan.nombre}</h3>
      {plan.descripcion && <p className="portal__plan-desc">{plan.descripcion}</p>}

      {items.length === 0 ? (
        <p className="portal__vacio-inline">Este plan aún no tiene ítems.</p>
      ) : (
        <ol className="portal__plan-lista">
          {items.map((item) => {
            const entregado = !!item.entrega;
            const bloqueado = !item.desbloqueado;
            const esExamen = item.tipo === 'EXAMEN';
            const nota = califLabel(plan, item);

            let estadoClase = 'portal__plan-item--pendiente';
            if (entregado) estadoClase = 'portal__plan-item--entregado';
            else if (bloqueado) estadoClase = 'portal__plan-item--bloqueado';

            return (
              <li key={item.id} className={`portal__plan-item ${estadoClase}`}>
                {/* Burbuja de orden / estado */}
                <div className={`portal__plan-burbuja ${esExamen ? 'portal__plan-burbuja--examen' : ''} ${entregado ? 'portal__plan-burbuja--ok' : ''} ${bloqueado ? 'portal__plan-burbuja--lock' : ''}`}>
                  {entregado ? '✓' : bloqueado ? '🔒' : item.orden}
                </div>

                {/* Línea conectora (visual, solo CSS) */}
                <div className="portal__plan-conector" />

                {/* Contenido */}
                <div className="portal__plan-item-body">
                  <div className="portal__plan-item-top">
                    <div>
                      <span className="portal__plan-item-tipo">
                        {esExamen ? 'EXAMEN' : 'ACTIVIDAD'}
                      </span>
                      <strong className="portal__plan-item-titulo">{item.titulo}</strong>
                    </div>
                    <div className="portal__plan-item-right">
                      {nota && (
                        <span className="portal__plan-item-nota">{nota}</span>
                      )}
                      {entregado && !nota && (
                        <StatusBadge texto="Entregado" variant="success" />
                      )}
                      {!entregado && !bloqueado && (
                        <Button size="sm" onClick={() => onEntregar(plan, item)}>
                          Entregar
                        </Button>
                      )}
                      {bloqueado && (
                        <span className="portal__plan-item-lock-label">Completa las actividades anteriores</span>
                      )}
                    </div>
                  </div>

                  <div className="portal__plan-item-meta">
                    {item.fecha_limite && (
                      <span className="portal__plan-item-fecha">
                        Límite: {item.fecha_limite.slice(0, 10)}
                      </span>
                    )}
                    {item.entrega?.retroalimentacion && (
                      <span className="portal__plan-item-retro">
                        {item.entrega.retroalimentacion}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export default function MisTareas() {
  // Plan de estudios
  const [planes, setPlanes] = useState([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(true);

  // Tareas standalone
  const [tareas, setTareas] = useState([]);
  const [cargandoTareas, setCargandoTareas] = useState(true);
  const [mostrarEntregadas, setMostrarEntregadas] = useState(false);
  const [mostrarVencidas, setMostrarVencidas] = useState(false);

  // Modal de entrega (plan item)
  const [modalItem, setModalItem] = useState(null); // { plan, item }
  const [formItem, setFormItem] = useState({ url_evidencia: '', observaciones: '' });
  const [enviandoItem, setEnviandoItem] = useState(false);
  const [errorItem, setErrorItem] = useState('');
  const [exitoItem, setExitoItem] = useState('');

  // Modal de entrega (tarea standalone)
  const [modalTarea, setModalTarea] = useState(null);
  const [formTarea, setFormTarea] = useState({ url_evidencia: '', observaciones: '' });
  const [enviandoTarea, setEnviandoTarea] = useState(false);
  const [errorTarea, setErrorTarea] = useState('');
  const [exitoTarea, setExitoTarea] = useState('');

  const cargarPlanes = useCallback(() => {
    setCargandoPlanes(true);
    obtenerMiPlan()
      .then((r) => setPlanes(r.data ?? r))
      .catch(() => setPlanes([]))
      .finally(() => setCargandoPlanes(false));
  }, []);

  const cargarTareas = useCallback(() => {
    setCargandoTareas(true);
    obtenerMisTareas()
      .then((r) => setTareas(r.data ?? r))
      .catch(() => setTareas([]))
      .finally(() => setCargandoTareas(false));
  }, []);

  useEffect(() => {
    cargarPlanes();
    cargarTareas();
  }, [cargarPlanes, cargarTareas]);

  // ── Entrega de ítem de plan ───────────────────────────

  function abrirEntregaItem(plan, item) {
    setModalItem({ plan, item });
    setFormItem({ url_evidencia: item.entrega?.url_evidencia || '', observaciones: item.entrega?.observaciones || '' });
    setErrorItem('');
    setExitoItem('');
  }

  async function guardarEntregaItem(e) {
    e.preventDefault();
    setEnviandoItem(true);
    setErrorItem('');
    try {
      await entregarItem({
        plan_item_id: modalItem.item.id,
        url_evidencia: formItem.url_evidencia || null,
        observaciones: formItem.observaciones || null,
      });
      setExitoItem('Entrega registrada correctamente.');
      cargarPlanes();
      setTimeout(() => setModalItem(null), 1500);
    } catch (err) {
      setErrorItem(err.response?.data?.message || 'No se pudo registrar la entrega.');
    } finally {
      setEnviandoItem(false);
    }
  }

  // ── Entrega de tarea standalone ───────────────────────

  function abrirEntregaTarea(tarea) {
    setModalTarea(tarea);
    setFormTarea({ url_evidencia: tarea.url_evidencia || '', observaciones: tarea.entrega_observaciones || '' });
    setErrorTarea('');
    setExitoTarea('');
  }

  async function guardarEntregaTarea(e) {
    e.preventDefault();
    setEnviandoTarea(true);
    setErrorTarea('');
    try {
      await enviarEntrega({
        tarea_id: modalTarea.id,
        url_evidencia: formTarea.url_evidencia,
        observaciones: formTarea.observaciones,
      });
      setExitoTarea('Entrega registrada correctamente.');
      cargarTareas();
      setTimeout(() => setModalTarea(null), 1500);
    } catch (err) {
      setErrorTarea(err.response?.data?.message || 'No se pudo registrar la entrega');
    } finally {
      setEnviandoTarea(false);
    }
  }

  // ── Filtrado tareas ───────────────────────────────────

  const tareasFiltradas = tareas.filter((t) => {
    const est = estadoTarea(t);
    if (!mostrarEntregadas && (est.variant === 'success' || est.texto === 'Entregada')) return false;
    if (!mostrarVencidas && est.texto === 'Vencida') return false;
    return true;
  });

  const tienePlanActivo = planes.length > 0;

  return (
    <div className="portal__seccion">
      <h1>Plan de estudios y tareas</h1>

      {/* ── Planes activos ── */}
      {cargandoPlanes ? (
        <p className="portal__cargando">Cargando plan de estudios...</p>
      ) : !tienePlanActivo ? (
        <div style={{ marginBottom: 24 }}>
          <p className="portal__vacio-inline">No tienes un plan de estudios activo en este momento.</p>
        </div>
      ) : (
        <div className="portal__planes">
          {planes.map((plan) => (
            <PlanTimeline
              key={plan.id}
              plan={plan}
              onEntregar={abrirEntregaItem}
            />
          ))}
        </div>
      )}

      {/* ── Tareas adicionales ── */}
      <div className="portal__tareas-seccion">
        <h2 className="portal__tareas-subtitulo">Tareas adicionales</h2>
        <div className="portal__filtros portal__filtros--toggles">
          <button
            type="button"
            className={`portal__toggle ${mostrarEntregadas ? 'portal__toggle--activo' : ''}`}
            onClick={() => setMostrarEntregadas((v) => !v)}
          >
            {mostrarEntregadas ? '✓ ' : ''}Mostrar entregadas
          </button>
          <button
            type="button"
            className={`portal__toggle ${mostrarVencidas ? 'portal__toggle--activo' : ''}`}
            onClick={() => setMostrarVencidas((v) => !v)}
          >
            {mostrarVencidas ? '✓ ' : ''}Mostrar vencidas
          </button>
        </div>

        {cargandoTareas ? (
          <p className="portal__cargando">Cargando tareas...</p>
        ) : tareasFiltradas.length === 0 ? (
          <p className="portal__vacio-inline">
            {tareas.length === 0
              ? 'No hay tareas adicionales asignadas.'
              : 'No hay tareas pendientes. Activa los filtros para ver entregadas o vencidas.'}
          </p>
        ) : (
          <div className="portal__tareas-lista">
            {tareasFiltradas.map((t) => {
              const estado = estadoTarea(t);
              return (
                <div key={t.id} className="portal__tarea-card">
                  <div className="portal__tarea-header">
                    <div>
                      <h3 className="portal__tarea-titulo">{t.titulo}</h3>
                      <span className="portal__tarea-nivel">{t.nivel_nombre}</span>
                    </div>
                    <StatusBadge texto={estado.texto} variant={estado.variant} />
                  </div>
                  {t.descripcion && <p className="portal__tarea-desc">{t.descripcion}</p>}
                  <div className="portal__tarea-footer">
                    <span className="portal__tarea-fecha">
                      {t.fecha_limite ? `Límite: ${formatearFecha(t.fecha_limite)}` : 'Sin fecha límite'}
                    </span>
                    {t.retroalimentacion && (
                      <p className="portal__tarea-feedback">
                        <strong>Comentario:</strong> {t.retroalimentacion}
                      </p>
                    )}
                    <Button variant="secondary" onClick={() => abrirEntregaTarea(t)}>
                      {t.entrega_id ? 'Actualizar entrega' : 'Entregar'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal entrega de ítem de plan */}
      <Modal
        abierto={!!modalItem}
        titulo={`Entregar: ${modalItem?.item?.titulo}`}
        onClose={() => setModalItem(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalItem(null)}>Cancelar</Button>
            <Button onClick={guardarEntregaItem} loading={enviandoItem}>Enviar entrega</Button>
          </>
        }
      >
        {modalItem && (
          <form onSubmit={guardarEntregaItem} className="portal__form">
            <FormField
              label="Enlace de evidencia (Google Drive, YouTube, etc.)"
              name="url_evidencia"
              type="url"
              placeholder="https://drive.google.com/..."
              value={formItem.url_evidencia}
              onChange={(e) => setFormItem((p) => ({ ...p, url_evidencia: e.target.value }))}
              helpText="Comparte el enlace de tu trabajo. Asegúrate de que sea accesible."
            />
            <FormField
              label="Observaciones (opcional)"
              name="observaciones"
              type="textarea"
              value={formItem.observaciones}
              onChange={(e) => setFormItem((p) => ({ ...p, observaciones: e.target.value }))}
            />
            {errorItem && <p className="portal__error">{errorItem}</p>}
            {exitoItem && <p className="portal__exito">{exitoItem}</p>}
          </form>
        )}
      </Modal>

      {/* Modal entrega de tarea standalone */}
      <Modal
        abierto={!!modalTarea}
        titulo={`Entregar: ${modalTarea?.titulo}`}
        onClose={() => setModalTarea(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalTarea(null)}>Cancelar</Button>
            <Button onClick={guardarEntregaTarea} loading={enviandoTarea}>Enviar entrega</Button>
          </>
        }
      >
        {modalTarea && (
          <form onSubmit={guardarEntregaTarea} className="portal__form">
            <FormField
              label="Enlace de evidencia"
              name="url_evidencia"
              type="url"
              placeholder="https://drive.google.com/..."
              value={formTarea.url_evidencia}
              onChange={(e) => setFormTarea((p) => ({ ...p, url_evidencia: e.target.value }))}
            />
            <FormField
              label="Observaciones (opcional)"
              name="observaciones"
              type="textarea"
              value={formTarea.observaciones}
              onChange={(e) => setFormTarea((p) => ({ ...p, observaciones: e.target.value }))}
            />
            {errorTarea && <p className="portal__error">{errorTarea}</p>}
            {exitoTarea && <p className="portal__exito">{exitoTarea}</p>}
          </form>
        )}
      </Modal>
    </div>
  );
}
