import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  obtenerPlan,
  activarPlan,
  desactivarPlan,
  crearItem,
  actualizarItem,
  eliminarItem,
  reordenarItems,
  obtenerHistorial,
  calificarEntrega,
  obtenerReporte,
  exportarReporte,
} from '../../services/planesEstudio.service';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import FormField from '../../components/ui/FormField';
import StatusBadge from '../../components/ui/StatusBadge';
import './PlanesEstudio.css';

const PESTANAS = [
  { clave: 'estructura', titulo: 'Estructura' },
  { clave: 'historial', titulo: 'Historial de entregas' },
  { clave: 'reporte', titulo: 'Reporte de calificaciones' },
];

const ITEM_FORM_VACIO = {
  titulo: '',
  tipo: 'ACTIVIDAD',
  ponderado: '',
  fecha_limite: '',
};

// ── helpers ────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }) {
  return tipo === 'EXAMEN'
    ? <StatusBadge texto="Examen" variant="danger" />
    : <StatusBadge texto="Actividad" variant="info" />;
}

function CalifBadge({ tipo }) {
  const map = { NUMERICA: 'info', CATEGORICA: 'warning', SIMPLE: 'secondary' };
  const label = { NUMERICA: 'Numérica', CATEGORICA: 'Categórica', SIMPLE: 'Simple' };
  return <StatusBadge texto={label[tipo] ?? tipo} variant={map[tipo] ?? 'secondary'} />;
}

// ── Estructura (tab 1) ─────────────────────────────────────────────────────

function TabEstructura({ plan, onRefresh }) {
  const items = plan.items ?? [];
  const esNumerica = plan.tipo_calificacion === 'NUMERICA';

  const [modalItem, setModalItem] = useState(false);
  const [editandoItem, setEditandoItem] = useState(null);
  const [formItem, setFormItem] = useState(ITEM_FORM_VACIO);
  const [guardandoItem, setGuardandoItem] = useState(false);
  const [errorItem, setErrorItem] = useState('');
  const [confirmEliminar, setConfirmEliminar] = useState(null);

  const sumaPonderados = items.reduce((s, i) => s + (Number(i.ponderado) || 0), 0);

  function setI(campo) {
    return (e) => setFormItem((p) => ({ ...p, [campo]: e.target.value }));
  }

  function abrirCrearItem() {
    setEditandoItem(null);
    setFormItem(ITEM_FORM_VACIO);
    setErrorItem('');
    setModalItem(true);
  }

  function abrirEditarItem(item) {
    setEditandoItem(item);
    setFormItem({
      titulo: item.titulo,
      tipo: item.tipo,
      ponderado: item.ponderado ?? '',
      fecha_limite: item.fecha_limite ? item.fecha_limite.slice(0, 10) : '',
    });
    setErrorItem('');
    setModalItem(true);
  }

  async function guardarItem(e) {
    e.preventDefault();
    if (!formItem.titulo.trim()) return setErrorItem('El título es obligatorio.');
    if (esNumerica && formItem.tipo === 'ACTIVIDAD' && formItem.ponderado === '') {
      return setErrorItem('El ponderado es obligatorio para ítems numéricos.');
    }
    setGuardandoItem(true);
    setErrorItem('');
    try {
      const payload = {
        titulo: formItem.titulo.trim(),
        tipo: formItem.tipo,
        ponderado: esNumerica && formItem.ponderado !== '' ? Number(formItem.ponderado) : null,
        fecha_limite: formItem.fecha_limite || null,
      };
      if (editandoItem) {
        await actualizarItem(plan.id, editandoItem.id, payload);
      } else {
        await crearItem(plan.id, payload);
      }
      setModalItem(false);
      onRefresh();
    } catch (err) {
      setErrorItem(err.response?.data?.message || 'No se pudo guardar el ítem.');
    } finally {
      setGuardandoItem(false);
    }
  }

  async function moverItem(item, direccion) {
    const sorted = [...items].sort((a, b) => a.orden - b.orden);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const swapIdx = idx + direccion;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const ordenes = sorted.map((i, j) => {
      if (j === idx) return { id: i.id, orden: sorted[swapIdx].orden };
      if (j === swapIdx) return { id: i.id, orden: sorted[idx].orden };
      return { id: i.id, orden: i.orden };
    });
    try {
      await reordenarItems(plan.id, ordenes);
      onRefresh();
    } catch { /* silent */ }
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return;
    try {
      await eliminarItem(plan.id, confirmEliminar.id);
      setConfirmEliminar(null);
      onRefresh();
    } catch {
      setConfirmEliminar(null);
    }
  }

  const sorted = [...items].sort((a, b) => a.orden - b.orden);

  return (
    <div className="planes-det__estructura">
      <div className="planes-det__estructura-header">
        <div>
          {esNumerica && (
            <p className={`planes-det__ponderado-total ${Math.abs(sumaPonderados - 100) > 0.01 ? 'planes-det__ponderado-total--warn' : ''}`}>
              Suma de ponderados: <strong>{sumaPonderados.toFixed(1)}%</strong>
              {Math.abs(sumaPonderados - 100) > 0.01 && ' — debe sumar 100%'}
            </p>
          )}
        </div>
        <Button onClick={abrirCrearItem}>+ Nuevo ítem</Button>
      </div>

      {sorted.length === 0 ? (
        <p className="planes-det__vacio">Este plan aún no tiene ítems. Agrega actividades o exámenes.</p>
      ) : (
        <table className="planes-det__tabla">
          <thead>
            <tr>
              <th style={{ width: 40 }}>Orden</th>
              <th>Título</th>
              <th>Tipo</th>
              {esNumerica && <th>Ponderado</th>}
              <th>Fecha límite</th>
              <th style={{ width: 100 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, idx) => (
              <tr key={item.id}>
                <td className="planes-det__orden">
                  <button
                    className="planes-det__flecha"
                    onClick={() => moverItem(item, -1)}
                    disabled={idx === 0}
                    title="Subir"
                  >▲</button>
                  <button
                    className="planes-det__flecha"
                    onClick={() => moverItem(item, 1)}
                    disabled={idx === sorted.length - 1}
                    title="Bajar"
                  >▼</button>
                </td>
                <td>{item.titulo}</td>
                <td><TipoBadge tipo={item.tipo} /></td>
                {esNumerica && <td>{item.ponderado != null ? `${item.ponderado}%` : '—'}</td>}
                <td>{item.fecha_limite ? item.fecha_limite.slice(0, 10) : '—'}</td>
                <td className="planes-det__item-acciones">
                  <button className="planes-det__btn-link" onClick={() => abrirEditarItem(item)}>Editar</button>
                  <button className="planes-det__btn-link planes-det__btn-link--danger" onClick={() => setConfirmEliminar(item)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal ítem */}
      <Modal
        abierto={modalItem}
        titulo={editandoItem ? 'Editar ítem' : 'Nuevo ítem'}
        onClose={() => setModalItem(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalItem(false)}>Cancelar</Button>
            <Button onClick={guardarItem} loading={guardandoItem}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardarItem} className="planes-det__form">
          <FormField
            label="Título"
            name="titulo"
            value={formItem.titulo}
            onChange={setI('titulo')}
            required
          />
          <FormField
            label="Tipo"
            type="select"
            name="tipo"
            value={formItem.tipo}
            onChange={setI('tipo')}
            options={[
              { value: 'ACTIVIDAD', label: 'Actividad' },
              { value: 'EXAMEN', label: 'Examen' },
            ]}
            helpText={formItem.tipo === 'EXAMEN' ? 'Se desbloqueará cuando todas las actividades anteriores estén entregadas.' : ''}
          />
          {esNumerica && (
            <FormField
              label="Ponderado (%)"
              type="number"
              name="ponderado"
              value={formItem.ponderado}
              onChange={setI('ponderado')}
              min="0"
              max="100"
              step="0.01"
            />
          )}
          <FormField
            label="Fecha límite"
            type="date"
            name="fecha_limite"
            value={formItem.fecha_limite}
            onChange={setI('fecha_limite')}
          />
          {errorItem && <p className="planes-det__error">{errorItem}</p>}
        </form>
      </Modal>

      {/* Confirm eliminar */}
      <ConfirmDialog
        abierto={!!confirmEliminar}
        titulo="Eliminar ítem"
        mensaje={`¿Eliminar "${confirmEliminar?.titulo}"? Esta acción no se puede deshacer.`}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setConfirmEliminar(null)}
        textoConfirmar="Eliminar"
      />
    </div>
  );
}

// ── Historial (tab 2) ──────────────────────────────────────────────────────

const CATS = [
  { value: '', label: 'Sin calificación' },
  { value: 'EXCELENTE', label: 'Excelente' },
  { value: 'POR_MEJORAR', label: 'Por mejorar' },
];

function TabHistorial({ plan }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [calificando, setCalificando] = useState({}); // entregaId → true/false
  const [valores, setValores] = useState({}); // entregaId → { calificacion|cat, retro }
  const [expandidos, setExpandidos] = useState({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await obtenerHistorial(plan.id);
      const data = resp.data ?? resp;
      setHistorial(data);
      // Inicializar valores de formulario desde entregas existentes
      const init = {};
      for (const grupo of data) {
        for (const e of grupo.entregas ?? []) {
          init[e.id] = {
            calificacion: e.calificacion ?? '',
            calificacion_categorica: e.calificacion_categorica ?? '',
            retroalimentacion: e.retroalimentacion ?? '',
          };
        }
      }
      setValores(init);
    } catch {
      setHistorial([]);
    } finally {
      setCargando(false);
    }
  }, [plan.id]);

  useEffect(() => { cargar(); }, [cargar]);

  function toggleExpand(itemId) {
    setExpandidos((p) => ({ ...p, [itemId]: !p[itemId] }));
  }

  function setVal(entregaId, campo, valor) {
    setValores((p) => ({ ...p, [entregaId]: { ...p[entregaId], [campo]: valor } }));
  }

  async function guardarCalif(entregaId) {
    setCalificando((p) => ({ ...p, [entregaId]: true }));
    try {
      const v = valores[entregaId] || {};
      const payload = { retroalimentacion: v.retroalimentacion || null };
      if (plan.tipo_calificacion === 'NUMERICA') {
        payload.calificacion = v.calificacion !== '' ? Number(v.calificacion) : null;
      } else if (plan.tipo_calificacion === 'CATEGORICA') {
        payload.calificacion_categorica = v.calificacion_categorica || null;
      }
      await calificarEntrega(plan.id, entregaId, payload);
      await cargar();
    } catch { /* silent */ } finally {
      setCalificando((p) => ({ ...p, [entregaId]: false }));
    }
  }

  if (cargando) return <p className="planes-det__cargando">Cargando historial...</p>;
  if (historial.length === 0) return <p className="planes-det__vacio">No hay entregas registradas aún.</p>;

  return (
    <div className="planes-det__historial">
      {historial.map((grupo) => (
        <div key={grupo.item_id} className="planes-det__grupo">
          <button
            className="planes-det__grupo-header"
            onClick={() => toggleExpand(grupo.item_id)}
          >
            <TipoBadge tipo={grupo.item_tipo} />
            <span className="planes-det__grupo-titulo">{grupo.item_titulo}</span>
            <span className="planes-det__grupo-count">{grupo.entregas?.length ?? 0} entregas</span>
            <span className="planes-det__grupo-chevron">{expandidos[grupo.item_id] ? '▲' : '▼'}</span>
          </button>

          {expandidos[grupo.item_id] && (
            <div className="planes-det__entregas">
              {!grupo.entregas?.length && (
                <p className="planes-det__vacio-sub">Sin entregas para este ítem.</p>
              )}
              {grupo.entregas?.map((e) => (
                <div key={e.id} className="planes-det__entrega">
                  <div className="planes-det__entrega-info">
                    <strong>{e.miembro_nombre}</strong>
                    <span className="planes-det__entrega-fecha">{e.fecha_entrega ? e.fecha_entrega.slice(0, 10) : '—'}</span>
                    {e.url_evidencia && (
                      <a href={e.url_evidencia} target="_blank" rel="noopener noreferrer" className="planes-det__btn-link">
                        Ver evidencia
                      </a>
                    )}
                  </div>

                  {e.observaciones && (
                    <p className="planes-det__entrega-obs">{e.observaciones}</p>
                  )}

                  <div className="planes-det__calif-form">
                    {plan.tipo_calificacion === 'NUMERICA' && (
                      <input
                        type="number"
                        className="planes-det__calif-input"
                        min="0"
                        max="10"
                        step="0.1"
                        placeholder="Nota"
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
                    {plan.tipo_calificacion === 'SIMPLE' && (
                      <span className="planes-det__calif-simple">✓ Entregado</span>
                    )}
                    <input
                      type="text"
                      className="planes-det__calif-retro"
                      placeholder="Retroalimentación (opcional)"
                      value={valores[e.id]?.retroalimentacion ?? ''}
                      onChange={(ev) => setVal(e.id, 'retroalimentacion', ev.target.value)}
                    />
                    {plan.tipo_calificacion !== 'SIMPLE' && (
                      <Button
                        size="sm"
                        loading={calificando[e.id]}
                        onClick={() => guardarCalif(e.id)}
                      >
                        Guardar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Reporte (tab 3) ────────────────────────────────────────────────────────

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

  async function exportar(formato) {
    setExportando(true);
    try { await exportarReporte(plan.id, formato); }
    catch { /* silent */ }
    finally { setExportando(false); }
  }

  if (cargando) return <p className="planes-det__cargando">Cargando reporte...</p>;
  if (!reporte) return <p className="planes-det__vacio">No se pudo cargar el reporte.</p>;

  const { miembros = [], items = [], resumen } = reporte;

  return (
    <div className="planes-det__reporte">
      <div className="planes-det__reporte-actions">
        <Button variant="secondary" size="sm" loading={exportando} onClick={() => exportar('excel')}>
          Exportar Excel
        </Button>
        <Button variant="secondary" size="sm" loading={exportando} onClick={() => exportar('pdf')}>
          Exportar PDF
        </Button>
      </div>

      {resumen && plan.tipo_calificacion === 'NUMERICA' && (
        <p className="planes-det__reporte-resumen">
          Nota mínima de aprobación: <strong>{plan.nota_minima_aprobacion ?? '—'}</strong>
        </p>
      )}

      <div className="planes-det__tabla-scroll">
        <table className="planes-det__tabla planes-det__tabla--reporte">
          <thead>
            <tr>
              <th>Estudiante</th>
              {items.map((it) => (
                <th key={it.id} title={it.titulo}>
                  {it.titulo.length > 18 ? `${it.titulo.slice(0, 16)}…` : it.titulo}
                </th>
              ))}
              <th>Nota final</th>
              {plan.tipo_calificacion === 'NUMERICA' && <th>¿Aprobó?</th>}
            </tr>
          </thead>
          <tbody>
            {miembros.length === 0 ? (
              <tr><td colSpan={items.length + 3} className="planes-det__vacio">Sin datos</td></tr>
            ) : (
              miembros.map((m) => (
                <tr key={m.miembro_id}>
                  <td>{m.nombres_completos}</td>
                  {items.map((it) => {
                    const entrega = m.calificaciones?.find((c) => c.item_id === it.id);
                    return (
                      <td key={it.id}>
                        {entrega
                          ? (plan.tipo_calificacion === 'NUMERICA'
                              ? (entrega.calificacion ?? '—')
                              : plan.tipo_calificacion === 'CATEGORICA'
                              ? (entrega.calificacion_categorica ?? 'Sin calificar')
                              : '✓')
                          : '—'}
                      </td>
                    );
                  })}
                  <td><strong>{m.nota_final ?? '—'}</strong></td>
                  {plan.tipo_calificacion === 'NUMERICA' && (
                    <td>
                      {m.nota_final != null ? (
                        <StatusBadge
                          texto={m.nota_final >= (plan.nota_minima_aprobacion ?? 0) ? 'Aprobó' : 'No aprobó'}
                          variant={m.nota_final >= (plan.nota_minima_aprobacion ?? 0) ? 'success' : 'danger'}
                        />
                      ) : '—'}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── PlanDetalle ────────────────────────────────────────────────────────────

export default function PlanDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState('estructura');
  const [confirmAccion, setConfirmAccion] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const resp = await obtenerPlan(id);
      setPlan(resp.data ?? resp);
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
      if (confirmAccion === 'activar') {
        await activarPlan(id);
      } else {
        await desactivarPlan(id);
      }
      setConfirmAccion(null);
      cargar();
    } catch {
      setConfirmAccion(null);
    }
  }

  if (cargando) return <div className="planes-det"><p>Cargando...</p></div>;
  if (!plan) return <div className="planes-det"><p>Plan no encontrado.</p></div>;

  return (
    <div className="planes-det">
      {/* encabezado */}
      <div className="planes-det__top">
        <button className="planes-det__volver" onClick={() => navigate('/planes-estudio')}>
          ← Planes de estudio
        </button>
      </div>

      <div className="planes-det__header">
        <div className="planes-det__header-info">
          <h1>{plan.nombre}</h1>
          <div className="planes-det__header-meta">
            <span>{plan.nivel_nombre}</span>
            <CalifBadge tipo={plan.tipo_calificacion} />
            <StatusBadge
              texto={plan.activo ? 'Activo' : 'Inactivo'}
              variant={plan.activo ? 'success' : 'secondary'}
            />
          </div>
          {plan.descripcion && <p className="planes-det__descripcion">{plan.descripcion}</p>}
        </div>
        <div className="planes-det__header-acciones">
          {plan.activo ? (
            <Button variant="secondary" onClick={() => setConfirmAccion('desactivar')}>
              Desactivar
            </Button>
          ) : (
            <Button onClick={() => setConfirmAccion('activar')}>
              Activar
            </Button>
          )}
        </div>
      </div>

      <Tabs pestanas={PESTANAS} activa={tabActiva} onChange={setTabActiva} />

      <div className="planes-det__contenido">
        {tabActiva === 'estructura' && <TabEstructura plan={plan} onRefresh={cargar} />}
        {tabActiva === 'historial' && <TabHistorial plan={plan} />}
        {tabActiva === 'reporte' && <TabReporte plan={plan} />}
      </div>

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
    </div>
  );
}
