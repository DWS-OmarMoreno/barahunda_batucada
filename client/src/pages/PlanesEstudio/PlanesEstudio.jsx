import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarPlanes, crearPlan, activarPlan, desactivarPlan } from '../../services/planesEstudio.service';
import { listarNiveles } from '../../services/niveles.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import ActionsMenu from '../../components/ui/ActionsMenu';
import './PlanesEstudio.css';

const TIPOS_CALIFICACION = [
  { value: '', label: 'Seleccionar tipo...' },
  { value: 'NUMERICA', label: 'Numérica (promedio ponderado)' },
  { value: 'CATEGORICA', label: 'Categórica (Excelente / Por mejorar)' },
  { value: 'SIMPLE', label: 'Simple (por entrega)' },
];

const FORM_VACIO = {
  nombre: '',
  nivel_id: '',
  descripcion: '',
  tipo_calificacion: '',
  nota_minima_aprobacion: '',
  fecha_inicio: '',
  fecha_fin: '',
};

function tipoBadge(tipo) {
  const map = {
    NUMERICA: { texto: 'Numérica', variant: 'info' },
    CATEGORICA: { texto: 'Categórica', variant: 'warning' },
    SIMPLE: { texto: 'Simple', variant: 'secondary' },
  };
  const b = map[tipo] || { texto: tipo, variant: 'secondary' };
  return <StatusBadge texto={b.texto} variant={b.variant} />;
}

export default function PlanesEstudio() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [filtroNivel, setFiltroNivel] = useState('');
  const [cargando, setCargando] = useState(true);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [confirmAccion, setConfirmAccion] = useState(null); // { plan, accion: 'activar'|'desactivar' }

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await listarPlanes(filtroNivel ? { nivel_id: filtroNivel } : {});
      setPlanes(datos.data ?? datos);
    } catch {
      setPlanes([]);
    } finally {
      setCargando(false);
    }
  }, [filtroNivel]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    listarNiveles({ limit: 200 })
      .then((r) => setNiveles(r.data ?? r))
      .catch(() => setNiveles([]));
  }, []);

  function set(campo) {
    return (e) => setForm((p) => ({ ...p, [campo]: e.target.value }));
  }

  function abrirCrear() {
    setForm(FORM_VACIO);
    setError('');
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!form.nivel_id) return setError('Selecciona un nivel.');
    if (!form.tipo_calificacion) return setError('Selecciona el tipo de calificación.');
    setGuardando(true);
    setError('');
    try {
      await crearPlan({
        nombre: form.nombre.trim(),
        nivel_id: Number(form.nivel_id),
        descripcion: form.descripcion.trim() || null,
        tipo_calificacion: form.tipo_calificacion,
        nota_minima_aprobacion:
          form.tipo_calificacion === 'NUMERICA' && form.nota_minima_aprobacion !== ''
            ? Number(form.nota_minima_aprobacion)
            : null,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      });
      setModalAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el plan.');
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutarAccion() {
    if (!confirmAccion) return;
    try {
      if (confirmAccion.accion === 'activar') {
        await activarPlan(confirmAccion.plan.id);
      } else {
        await desactivarPlan(confirmAccion.plan.id);
      }
      setConfirmAccion(null);
      cargar();
    } catch {
      setConfirmAccion(null);
    }
  }

  const nivelesOpts = [
    { value: '', label: 'Todos los niveles' },
    ...niveles.map((n) => ({ value: String(n.id), label: n.nombre })),
  ];

  const nivelesFormOpts = [
    { value: '', label: 'Seleccionar nivel...' },
    ...niveles.map((n) => ({ value: String(n.id), label: n.nombre })),
  ];

  return (
    <div className="planes-estudio">
      <div className="planes-estudio__header">
        <div>
          <h1>Planes de estudio</h1>
          <p className="planes-estudio__desc">Planes curriculares por nivel, con actividades y exámenes.</p>
        </div>
        <Button onClick={abrirCrear}>+ Nuevo plan</Button>
      </div>

      <div className="planes-estudio__filtros">
        <select
          className="planes-estudio__filtro-nivel"
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
        >
          {nivelesOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        cargando={cargando}
        datos={planes}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre' },
          { clave: 'nivel_nombre', titulo: 'Nivel' },
          {
            clave: 'tipo_calificacion',
            titulo: 'Tipo',
            render: (f) => tipoBadge(f.tipo_calificacion),
          },
          {
            clave: 'total_items',
            titulo: 'Ítems',
            render: (f) => f.total_items ?? 0,
          },
          {
            clave: 'fecha_inicio',
            titulo: 'Período',
            render: (f) =>
              f.fecha_inicio || f.fecha_fin
                ? `${f.fecha_inicio ? f.fecha_inicio.slice(0, 10) : '?'} → ${f.fecha_fin ? f.fecha_fin.slice(0, 10) : '?'}`
                : '—',
          },
          {
            clave: 'activo',
            titulo: 'Estado',
            render: (f) => (
              <StatusBadge
                texto={f.activo ? 'Activo' : 'Inactivo'}
                variant={f.activo ? 'success' : 'secondary'}
              />
            ),
          },
        ]}
        acciones={(fila) => (
          <ActionsMenu
            acciones={[
              { etiqueta: 'Ver / Editar', onClick: () => navigate(`/planes-estudio/${fila.id}`) },
              fila.activo
                ? {
                    etiqueta: 'Desactivar',
                    onClick: () => setConfirmAccion({ plan: fila, accion: 'desactivar' }),
                    variant: 'danger',
                  }
                : {
                    etiqueta: 'Activar',
                    onClick: () => setConfirmAccion({ plan: fila, accion: 'activar' }),
                  },
            ]}
          />
        )}
        vacioTexto="No hay planes de estudio registrados."
      />

      {/* Modal crear plan */}
      <Modal
        abierto={modalAbierto}
        titulo="Nuevo plan de estudio"
        onClose={() => setModalAbierto(false)}
        ancho="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Crear plan</Button>
          </>
        }
      >
        <form onSubmit={guardar} className="planes-estudio__form">
          <FormField
            label="Nombre del plan"
            name="nombre"
            value={form.nombre}
            onChange={set('nombre')}
            required
          />
          <FormField
            label="Nivel"
            type="select"
            name="nivel_id"
            value={form.nivel_id}
            onChange={set('nivel_id')}
            options={nivelesFormOpts}
            required
          />
          <FormField
            label="Descripción"
            type="textarea"
            name="descripcion"
            value={form.descripcion}
            onChange={set('descripcion')}
            rows={2}
          />
          <FormField
            label="Tipo de calificación"
            type="select"
            name="tipo_calificacion"
            value={form.tipo_calificacion}
            onChange={set('tipo_calificacion')}
            options={TIPOS_CALIFICACION}
            required
            helpText="No se puede cambiar después de crear el plan."
          />
          {form.tipo_calificacion === 'NUMERICA' && (
            <FormField
              label="Nota mínima de aprobación"
              type="number"
              name="nota_minima_aprobacion"
              value={form.nota_minima_aprobacion}
              onChange={set('nota_minima_aprobacion')}
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
              value={form.fecha_inicio}
              onChange={set('fecha_inicio')}
            />
            <FormField
              label="Fecha fin"
              type="date"
              name="fecha_fin"
              value={form.fecha_fin}
              onChange={set('fecha_fin')}
            />
          </div>
          {error && <p className="planes-estudio__error">{error}</p>}
        </form>
      </Modal>

      {/* Confirm activar / desactivar */}
      <ConfirmDialog
        abierto={!!confirmAccion}
        titulo={confirmAccion?.accion === 'activar' ? 'Activar plan' : 'Desactivar plan'}
        mensaje={
          confirmAccion?.accion === 'activar'
            ? `¿Activar "${confirmAccion?.plan?.nombre}"? Se desactivará cualquier otro plan activo del mismo nivel.`
            : `¿Desactivar "${confirmAccion?.plan?.nombre}"? Los estudiantes dejarán de verlo.`
        }
        onConfirmar={ejecutarAccion}
        onCancelar={() => setConfirmAccion(null)}
        textoConfirmar={confirmAccion?.accion === 'activar' ? 'Activar' : 'Desactivar'}
      />
    </div>
  );
}
