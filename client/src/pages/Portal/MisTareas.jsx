import { useState, useEffect, useCallback } from 'react';
import { editarEntrega } from '../../services/portal.service';
import { obtenerMiPlan, entregarItem } from '../../services/planesEstudio.service';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import './Portal.css';

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── MisTareas (principal) ─────────────────────────────────────────────────────

export default function MisTareas() {
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Modal plan item (nueva entrega)
  const [itemSeleccionado, setItemSeleccionado] = useState(null); // { item, planId }
  // Modal editar entrega plan item
  const [itemEditando, setItemEditando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const planesResp = await obtenerMiPlan();
      const planesData = planesResp?.data ?? planesResp;
      setPlanes(Array.isArray(planesData) ? planesData : []);
    } catch {
      setPlanes([]);
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
        <p className="mistarea__cargando">Cargando plan de estudios...</p>
      </div>
    );
  }

  return (
    <div className="mistarea">
      <h1 className="mistarea__titulo-pag">Plan de estudios</h1>

      {planes.length === 0 && (
        <div className="mistarea__vacio-total">
          <span className="mistarea__vacio-icon">📋</span>
          <p>No tienes un plan de estudios activo por ahora.</p>
        </div>
      )}

      {/* Planes de estudio con secciones */}
      {planes.length > 0 && (
        <section className="mistarea__planes">
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
    </div>
  );
}
