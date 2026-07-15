import { useState, useEffect, useCallback } from 'react';
import { obtenerMisTareas, enviarEntrega, editarEntrega } from '../../services/portal.service';
import { obtenerMiPlan, entregarItem } from '../../services/planesEstudio.service';
import { formatearFecha } from '../../utils/formato';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import './Portal.css';

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
    return item.entrega.calificacion != null ? String(item.entrega.calificacion) : null;
  }
  if (plan.tipo_calificacion === 'CATEGORICA') {
    const val = item.entrega.calificacion_categorica;
    if (!val) return null;
    return val === 'EXCELENTE' ? 'Excelente ⭐' : 'Por mejorar ⚠';
  }
  return '✓';
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="mistarea__progress-track">
      <div
        className={`mistarea__progress-fill ${pct === 100 ? 'mistarea__progress-fill--done' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Item del plan (visual stepper) ───────────────────────────────────────────

function itemEditable(item) {
  if (!item.entrega) return false;
  if (!item.fecha_limite) return true; // sin límite → siempre editable
  const limite = new Date(item.fecha_limite);
  limite.setHours(23, 59, 59, 999);
  return new Date() <= limite;
}

function PlanItem({ plan, item, onEntregar, onEditar }) {
  const desbloqueado = item.desbloqueado !== false;
  const entregado = !!item.entrega;
  const notaCalif = califLabel(plan, item);
  const esExamen = item.tipo === 'EXAMEN';

  let estadoIcon = '🔵'; // pendiente desbloqueado
  let estadoCls = 'mistarea__item--pendiente';
  if (!desbloqueado) { estadoIcon = '🔒'; estadoCls = 'mistarea__item--bloqueado'; }
  else if (entregado) { estadoIcon = '✅'; estadoCls = 'mistarea__item--entregado'; }
  else if (esExamen) { estadoIcon = '📝'; estadoCls = 'mistarea__item--examen'; }

  return (
    <div className={`mistarea__item ${estadoCls}`}>
      <div className="mistarea__item-icon">{estadoIcon}</div>
      <div className="mistarea__item-body">
        <div className="mistarea__item-hdr">
          <span className="mistarea__item-titulo">{item.titulo}</span>
          {esExamen && <StatusBadge texto="Examen" variant="danger" />}
          {item.fecha_limite && (
            <span className="mistarea__item-fecha">📅 {item.fecha_limite.slice(0, 10)}</span>
          )}
        </div>

        {entregado && (
          <div className="mistarea__item-entregado">
            <span className="mistarea__item-entregado-label">
              Entregado el {item.entrega.fecha_entrega?.slice(0, 10) ?? '—'}
            </span>
            {notaCalif && (
              <span className={`mistarea__item-nota ${notaCalif === 'Por mejorar ⚠' ? 'mistarea__item-nota--warn' : ''}`}>
                {notaCalif}
              </span>
            )}
            {item.entrega.retroalimentacion && (
              <p className="mistarea__item-retro">💬 {item.entrega.retroalimentacion}</p>
            )}
            {itemEditable(item) && (
              <Button variant="secondary" onClick={() => onEditar(item)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                ✏️ Editar entrega
              </Button>
            )}
          </div>
        )}

        {!desbloqueado && (
          <p className="mistarea__item-bloqueado-hint">
            Completa las actividades anteriores de esta sección para desbloquearlo.
          </p>
        )}

        {desbloqueado && !entregado && (
          <Button onClick={() => onEntregar(item)}>
            {esExamen ? 'Presentar examen' : 'Entregar'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Sección del plan ──────────────────────────────────────────────────────────

function PlanSeccion({ plan, seccion, onEntregar, onEditar }) {
  const [abierta, setAbierta] = useState(true);
  const items = [...(seccion.items ?? [])].sort((a, b) => a.orden - b.orden);
  const totalSec = seccion.total_items ?? items.length;
  const entregadosSec = seccion.items_entregados ?? items.filter((i) => i.entrega).length;

  return (
    <div className="mistarea__seccion">
      <button className="mistarea__seccion-hdr" onClick={() => setAbierta((p) => !p)}>
        <span className="mistarea__seccion-icono">📂</span>
        <span className="mistarea__seccion-nombre">{seccion.nombre}</span>
        <span className="mistarea__seccion-prog">{entregadosSec}/{totalSec}</span>
        <div className="mistarea__seccion-bar">
          <ProgressBar value={entregadosSec} max={totalSec} />
        </div>
        <span className="mistarea__seccion-chev">{abierta ? '▲' : '▼'}</span>
      </button>

      {abierta && (
        <div className="mistarea__seccion-items">
          {items.length === 0 && (
            <p className="mistarea__vacio-sub">Esta sección no tiene ítems aún.</p>
          )}
          {items.map((item) => (
            <PlanItem key={item.id} plan={plan} item={item} onEntregar={onEntregar} onEditar={onEditar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Plan completo ─────────────────────────────────────────────────────────────

function PlanCard({ plan, onEntregar, onEditar }) {
  const secciones = [...(plan.secciones ?? [])].sort((a, b) => a.orden - b.orden);
  const total = plan.total_items ?? 0;
  const entregados = plan.items_entregados ?? 0;
  const pct = total > 0 ? Math.round((entregados / total) * 100) : 0;

  return (
    <div className="mistarea__plan-card">
      <div className="mistarea__plan-hdr">
        <div>
          <span className="mistarea__plan-nivel">{plan.nivel_nombre}</span>
          <h3 className="mistarea__plan-titulo">{plan.nombre}</h3>
        </div>
        <div className="mistarea__plan-prog-num">{entregados}/{total} <span>ítems</span></div>
      </div>
      <div className="mistarea__plan-barra">
        <ProgressBar value={entregados} max={total} />
        <span className="mistarea__plan-pct">{pct}%</span>
      </div>

      {secciones.length === 0 && (
        <p className="mistarea__vacio-sub">Este plan aún no tiene secciones.</p>
      )}
      {secciones.map((sec) => (
        <PlanSeccion key={sec.id} plan={plan} seccion={sec} onEntregar={onEntregar} onEditar={onEditar} />
      ))}
    </div>
  );
}

// ─── Modal de entrega ──────────────────────────────────────────────────────────

function ModalEntrega({ item, planId, onClose, onExito }) {
  const [form, setForm] = useState({ url_evidencia: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    // Bug #1 fix: requerir al menos url o comentario
    if (!form.url_evidencia.trim() && !form.observaciones.trim()) {
      return setError('Debes ingresar un enlace de evidencia o un comentario.');
    }
    setEnviando(true);
    setError('');
    try {
      await entregarItem({
        plan_item_id: item.id,
        url_evidencia: form.url_evidencia || null,
        observaciones: form.observaciones || null,
      });
      onExito();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo enviar la entrega. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={`Entregar: ${item?.titulo}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} loading={enviando}>Enviar entrega</Button>
        </>
      }
    >
      <form onSubmit={enviar} className="mistarea__form">
        <FormField
          label="Enlace de evidencia (URL)"
          type="url"
          name="url_evidencia"
          value={form.url_evidencia}
          onChange={(e) => setForm((p) => ({ ...p, url_evidencia: e.target.value }))}
          helpText="Ej: link a Drive, YouTube, Notion, etc."
        />
        <FormField
          label="Comentarios"
          type="textarea"
          name="observaciones"
          value={form.observaciones}
          onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
          rows={3}
          helpText="Describe lo que hiciste o agrega notas para el profe."
        />
        <p className="mistarea__form-hint">* Debes proporcionar al menos un enlace o un comentario.</p>
        {error && <p className="mistarea__error">{error}</p>}
      </form>
    </Modal>
  );
}

// ─── Modal editar entrega (plan item) ─────────────────────────────────────────

function ModalEditarEntrega({ item, onClose, onExito }) {
  const [form, setForm] = useState({
    url_evidencia: item?.entrega?.url_evidencia || '',
    observaciones: item?.entrega?.observaciones || '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function guardar(e) {
    e.preventDefault();
    if (!form.url_evidencia.trim() && !form.observaciones.trim()) {
      return setError('Debes ingresar al menos un enlace o un comentario.');
    }
    setGuardando(true);
    setError('');
    try {
      await editarEntrega(item.entrega.id, {
        url_evidencia: form.url_evidencia || null,
        observaciones: form.observaciones || null,
      });
      onExito();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo actualizar la entrega.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={`Editar entrega: ${item?.titulo}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={guardando}>Guardar cambios</Button>
        </>
      }
    >
      <form onSubmit={guardar} className="mistarea__form">
        <FormField
          label="Enlace de evidencia (URL)"
          type="url"
          name="url_evidencia"
          value={form.url_evidencia}
          onChange={(e) => setForm((p) => ({ ...p, url_evidencia: e.target.value }))}
          helpText="Ej: link a Drive, YouTube, Notion, etc."
        />
        <FormField
          label="Comentarios"
          type="textarea"
          name="observaciones"
          value={form.observaciones}
          onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
          rows={3}
        />
        <p className="mistarea__form-hint">* Debes proporcionar al menos un enlace o un comentario.</p>
        {error && <p className="mistarea__error">{error}</p>}
      </form>
    </Modal>
  );
}

// ─── Tareas standalone ─────────────────────────────────────────────────────────

function TareasStandalone({ tareas, onEnviar }) {
  const pendientes = tareas.filter((t) => !t.entrega_id);
  const entregadas = tareas.filter((t) => t.entrega_id);

  return (
    <div className="mistarea__standalone">
      <h2 className="mistarea__section-titulo">📌 Tareas del nivel</h2>

      {tareas.length === 0 && (
        <p className="mistarea__vacio">No tienes tareas asignadas.</p>
      )}

      {pendientes.length > 0 && (
        <div className="mistarea__tareas-lista">
          {pendientes.map((t) => {
            const est = estadoTarea(t);
            return (
              <div key={t.id} className="mistarea__tarea-card">
                <div className="mistarea__tarea-hdr">
                  <span className="mistarea__tarea-titulo">{t.titulo}</span>
                  <StatusBadge texto={est.texto} variant={est.variant} />
                </div>
                {t.descripcion && <p className="mistarea__tarea-desc">{t.descripcion}</p>}
                {t.fecha_limite && (
                  <p className="mistarea__tarea-fecha">📅 Límite: {formatearFecha(t.fecha_limite)}</p>
                )}
                {!t.entrega_id && (
                  <Button onClick={() => onEnviar(t)}>Entregar</Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {entregadas.length > 0 && (
        <>
          <h3 className="mistarea__subseccion-titulo">Entregadas</h3>
          <div className="mistarea__tareas-lista">
            {entregadas.map((t) => {
              const est = estadoTarea(t);
              return (
                <div key={t.id} className="mistarea__tarea-card mistarea__tarea-card--entregada">
                  <div className="mistarea__tarea-hdr">
                    <span className="mistarea__tarea-titulo">{t.titulo}</span>
                    <StatusBadge texto={est.texto} variant={est.variant} />
                  </div>
                  {t.fecha_entrega && (
                    <p className="mistarea__tarea-fecha">✅ Entregada: {formatearFecha(t.fecha_entrega)}</p>
                  )}
                  {t.retroalimentacion && (
                    <p className="mistarea__tarea-retro">💬 {t.retroalimentacion}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Modal entrega tarea standalone ───────────────────────────────────────────

function ModalEntregaTarea({ tarea, onClose, onExito }) {
  const [form, setForm] = useState({ url_evidencia: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    if (!form.url_evidencia.trim() && !form.observaciones.trim()) {
      return setError('Debes ingresar un enlace o un comentario.');
    }
    setEnviando(true);
    setError('');
    try {
      await enviarEntrega({
        tarea_id: tarea.id,
        url_evidencia: form.url_evidencia || null,
        observaciones: form.observaciones || null,
      });
      onExito();
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo enviar. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto
      titulo={`Entregar: ${tarea?.titulo}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} loading={enviando}>Enviar</Button>
        </>
      }
    >
      <form onSubmit={enviar} className="mistarea__form">
        <FormField
          label="Enlace de evidencia (URL)"
          type="url"
          name="url_evidencia"
          value={form.url_evidencia}
          onChange={(e) => setForm((p) => ({ ...p, url_evidencia: e.target.value }))}
        />
        <FormField
          label="Comentarios"
          type="textarea"
          name="observaciones"
          value={form.observaciones}
          onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
          rows={3}
        />
        <p className="mistarea__form-hint">* Debes proporcionar al menos un enlace o un comentario.</p>
        {error && <p className="mistarea__error">{error}</p>}
      </form>
    </Modal>
  );
}

// ─── MisTareas (principal) ─────────────────────────────────────────────────────

export default function MisTareas() {
  const [planes, setPlanes] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Modal plan item (nueva entrega)
  const [itemSeleccionado, setItemSeleccionado] = useState(null); // { item, planId }
  // Modal editar entrega plan item
  const [itemEditando, setItemEditando] = useState(null);
  // Modal tarea standalone
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [planesResp, tareasResp] = await Promise.all([
        obtenerMiPlan(),
        obtenerMisTareas(),
      ]);
      const planesData = planesResp?.data ?? planesResp;
      const tareasData = tareasResp?.data ?? tareasResp;
      setPlanes(Array.isArray(planesData) ? planesData : []);
      setTareas(Array.isArray(tareasData) ? tareasData : []);
    } catch {
      setPlanes([]);
      setTareas([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirEntregaItem(item, planId) {
    setItemSeleccionado({ item, planId });
  }

  function cerrarEntregaItem() {
    setItemSeleccionado(null);
  }

  function onExitoItem() {
    setItemSeleccionado(null);
    cargar();
  }

  if (cargando) {
    return (
      <div className="mistarea">
        <p className="mistarea__cargando">Cargando tareas...</p>
      </div>
    );
  }

  const sinContenido = planes.length === 0 && tareas.length === 0;

  return (
    <div className="mistarea">
      <h1 className="mistarea__titulo-pag">Mis tareas</h1>

      {sinContenido && (
        <div className="mistarea__vacio-total">
          <span className="mistarea__vacio-icon">📋</span>
          <p>No tienes planes de estudio ni tareas asignadas por ahora.</p>
        </div>
      )}

      {/* Planes de estudio con secciones */}
      {planes.length > 0 && (
        <section className="mistarea__planes">
          <h2 className="mistarea__section-titulo">📚 Plan de estudios</h2>
          {planes.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEntregar={(item) => abrirEntregaItem(item, plan.id)}
              onEditar={(item) => setItemEditando(item)}
            />
          ))}
        </section>
      )}

      {/* Tareas standalone */}
      {tareas.length > 0 && (
        <TareasStandalone
          tareas={tareas}
          onEnviar={setTareaSeleccionada}
        />
      )}

      {/* Modal entrega plan item */}
      {itemSeleccionado && (
        <ModalEntrega
          item={itemSeleccionado.item}
          planId={itemSeleccionado.planId}
          onClose={cerrarEntregaItem}
          onExito={onExitoItem}
        />
      )}

      {/* Modal editar entrega plan item */}
      {itemEditando && (
        <ModalEditarEntrega
          item={itemEditando}
          onClose={() => setItemEditando(null)}
          onExito={() => { setItemEditando(null); cargar(); }}
        />
      )}

      {/* Modal entrega tarea standalone */}
      {tareaSeleccionada && (
        <ModalEntregaTarea
          tarea={tareaSeleccionada}
          onClose={() => setTareaSeleccionada(null)}
          onExito={() => { setTareaSeleccionada(null); cargar(); }}
        />
      )}
    </div>
  );
}
