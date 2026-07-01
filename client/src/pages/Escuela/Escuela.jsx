import { useState, useEffect, useCallback } from 'react';
import {
  listarTareas, crearTarea, actualizarTarea, toggleTarea,
  listarGuias, crearGuia, actualizarGuia, toggleGuia,
  listarEntregas, calificarEntrega,
} from '../../services/escuela.service';
import { enviarTareaAsignada, enviarTareaCalificada } from '../../services/correo.service';
import { listarNiveles } from '../../services/niveles.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import Tabs from '../../components/ui/Tabs';
import { formatearFecha } from '../../utils/formato';
import './Escuela.css';

const PESTANAS = [
  { clave: 'tareas', titulo: 'Tareas' },
  { clave: 'guias', titulo: 'Guías' },
  { clave: 'entregas', titulo: 'Entregas' },
];

const TIPOS_GUIA = [
  { value: 'TEXTO', label: 'Texto / HTML' },
  { value: 'VIDEO', label: 'Video (URL)' },
  { value: 'DOCUMENTO', label: 'Documento (URL)' },
];

const TAREA_VACIA = { titulo: '', descripcion: '', nivel_id: '', fecha_limite: '' };
const GUIA_VACIA = { titulo: '', descripcion: '', nivel_id: '', tipo: 'TEXTO', contenido: '', url_video: '' };

export default function Escuela() {
  const [pestana, setPestana] = useState('tareas');
  const [niveles, setNiveles] = useState([]);

  // Tareas
  const [tareas, setTareas] = useState([]);
  const [cargandoTareas, setCargandoTareas] = useState(true);
  const [modalTarea, setModalTarea] = useState(false);
  const [editandoTarea, setEditandoTarea] = useState(null);
  const [formTarea, setFormTarea] = useState(TAREA_VACIA);
  const [guardandoTarea, setGuardandoTarea] = useState(false);
  const [errorTarea, setErrorTarea] = useState('');
  const [notificando, setNotificando] = useState(null);

  // Guías
  const [guias, setGuias] = useState([]);
  const [cargandoGuias, setCargandoGuias] = useState(true);
  const [modalGuia, setModalGuia] = useState(false);
  const [editandoGuia, setEditandoGuia] = useState(null);
  const [formGuia, setFormGuia] = useState(GUIA_VACIA);
  const [guardandoGuia, setGuardandoGuia] = useState(false);
  const [errorGuia, setErrorGuia] = useState('');

  // Entregas
  const [entregas, setEntregas] = useState([]);
  const [cargandoEntregas, setCargandoEntregas] = useState(true);
  const [modalCalificar, setModalCalificar] = useState(null);
  const [formCalif, setFormCalif] = useState({ calificacion: '', retroalimentacion: '' });
  const [guardandoCalif, setGuardandoCalif] = useState(false);
  const [errorCalif, setErrorCalif] = useState('');
  const [filtroCalificado, setFiltroCalificado] = useState('');

  useEffect(() => {
    listarNiveles({ limit: 100, activo: '1' }).then((r) => setNiveles(r.data)).catch(() => setNiveles([]));
  }, []);

  const cargarTareas = useCallback(async () => {
    setCargandoTareas(true);
    try { const r = await listarTareas({ limit: 100 }); setTareas(r.data); }
    catch { setTareas([]); }
    finally { setCargandoTareas(false); }
  }, []);

  const cargarGuias = useCallback(async () => {
    setCargandoGuias(true);
    try { const r = await listarGuias({ limit: 100 }); setGuias(r.data); }
    catch { setGuias([]); }
    finally { setCargandoGuias(false); }
  }, []);

  const cargarEntregas = useCallback(async () => {
    setCargandoEntregas(true);
    try { const r = await listarEntregas({ calificado: filtroCalificado, limit: 100 }); setEntregas(r.data); }
    catch { setEntregas([]); }
    finally { setCargandoEntregas(false); }
  }, [filtroCalificado]);

  useEffect(() => { cargarTareas(); }, [cargarTareas]);
  useEffect(() => { cargarGuias(); }, [cargarGuias]);
  useEffect(() => { if (pestana === 'entregas') cargarEntregas(); }, [pestana, cargarEntregas]);

  // ── TAREAS ─────────────────────────────────────────────────────────────────

  function abrirCrearTarea() {
    setEditandoTarea(null);
    setFormTarea(TAREA_VACIA);
    setErrorTarea('');
    setModalTarea(true);
  }

  function abrirEditarTarea(t) {
    setEditandoTarea(t);
    setFormTarea({ titulo: t.titulo, descripcion: t.descripcion || '', nivel_id: t.nivel_id, fecha_limite: t.fecha_limite ? String(t.fecha_limite).slice(0, 10) : '' });
    setErrorTarea('');
    setModalTarea(true);
  }

  async function guardarTarea(e) {
    e.preventDefault();
    setGuardandoTarea(true);
    setErrorTarea('');
    try {
      if (editandoTarea) await actualizarTarea(editandoTarea.id, formTarea);
      else await crearTarea(formTarea);
      setModalTarea(false);
      cargarTareas();
    } catch (err) {
      setErrorTarea(err.response?.data?.message || 'No se pudo guardar');
    } finally { setGuardandoTarea(false); }
  }

  async function handleNotificarTarea(tarea) {
    setNotificando(tarea.id);
    try {
      const r = await enviarTareaAsignada(tarea.id);
      alert(r.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al enviar notificaciones');
    } finally { setNotificando(null); }
  }

  // ── GUÍAS ──────────────────────────────────────────────────────────────────

  function abrirCrearGuia() {
    setEditandoGuia(null);
    setFormGuia(GUIA_VACIA);
    setErrorGuia('');
    setModalGuia(true);
  }

  function abrirEditarGuia(g) {
    setEditandoGuia(g);
    setFormGuia({ titulo: g.titulo, descripcion: g.descripcion || '', nivel_id: g.nivel_id, tipo: g.tipo, contenido: g.contenido || '', url_video: g.url_video || '' });
    setErrorGuia('');
    setModalGuia(true);
  }

  async function guardarGuia(e) {
    e.preventDefault();
    setGuardandoGuia(true);
    setErrorGuia('');
    try {
      if (editandoGuia) await actualizarGuia(editandoGuia.id, formGuia);
      else await crearGuia(formGuia);
      setModalGuia(false);
      cargarGuias();
    } catch (err) {
      setErrorGuia(err.response?.data?.message || 'No se pudo guardar');
    } finally { setGuardandoGuia(false); }
  }

  // ── ENTREGAS ───────────────────────────────────────────────────────────────

  function abrirCalificar(e) {
    setModalCalificar(e);
    setFormCalif({ calificacion: e.calificacion ?? '', retroalimentacion: e.retroalimentacion || '' });
    setErrorCalif('');
  }

  async function guardarCalificacion(ev) {
    ev.preventDefault();
    setGuardandoCalif(true);
    setErrorCalif('');
    try {
      await calificarEntrega(modalCalificar.id, formCalif);
      setModalCalificar(null);
      cargarEntregas();
    } catch (err) {
      setErrorCalif(err.response?.data?.message || 'No se pudo calificar');
    } finally { setGuardandoCalif(false); }
  }

  async function handleNotificarCalif(entrega) {
    try {
      const r = await enviarTareaCalificada(entrega.id);
      alert(r.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al enviar notificación');
    }
  }

  return (
    <div className="escuela">
      <div className="escuela__header">
        <div>
          <h1>Módulo Escuela</h1>
          <p className="escuela__desc">Gestiona tareas, guías de aprendizaje y calificaciones de los miembros.</p>
        </div>
        {pestana === 'tareas' && <Button onClick={abrirCrearTarea}>+ Nueva tarea</Button>}
        {pestana === 'guias' && <Button onClick={abrirCrearGuia}>+ Nueva guía</Button>}
      </div>

      <Tabs pestanas={PESTANAS} activa={pestana} onChange={setPestana} />

      {/* ── TAREAS ── */}
      {pestana === 'tareas' && (
        <DataTable
          cargando={cargandoTareas}
          datos={tareas}
          columnas={[
            { clave: 'titulo', titulo: 'Título' },
            { clave: 'nivel_nombre', titulo: 'Nivel' },
            { clave: 'fecha_limite', titulo: 'Límite', render: (f) => f.fecha_limite ? formatearFecha(f.fecha_limite) : '—' },
            { clave: 'activo', titulo: 'Estado', render: (f) => <StatusBadge texto={f.activo ? 'Activa' : 'Inactiva'} variant={f.activo ? 'success' : 'secondary'} /> },
          ]}
          acciones={(fila) => (
            <>
              <Button variant="secondary" onClick={() => abrirEditarTarea(fila)}>Editar</Button>
              <Button variant="ghost" onClick={() => handleNotificarTarea(fila)} loading={notificando === fila.id}>Notificar</Button>
              <Button variant="danger" onClick={() => toggleTarea(fila.id).then(cargarTareas)}>
                {fila.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </>
          )}
          vacioTexto="No hay tareas creadas."
        />
      )}

      {/* ── GUÍAS ── */}
      {pestana === 'guias' && (
        <DataTable
          cargando={cargandoGuias}
          datos={guias}
          columnas={[
            { clave: 'titulo', titulo: 'Título' },
            { clave: 'nivel_nombre', titulo: 'Nivel' },
            { clave: 'tipo', titulo: 'Tipo', render: (f) => ({ VIDEO: 'Video', DOCUMENTO: 'Documento', TEXTO: 'Texto' }[f.tipo] || f.tipo) },
            { clave: 'activo', titulo: 'Estado', render: (f) => <StatusBadge texto={f.activo ? 'Activa' : 'Inactiva'} variant={f.activo ? 'success' : 'secondary'} /> },
          ]}
          acciones={(fila) => (
            <>
              <Button variant="secondary" onClick={() => abrirEditarGuia(fila)}>Editar</Button>
              <Button variant="danger" onClick={() => toggleGuia(fila.id).then(cargarGuias)}>
                {fila.activo ? 'Desactivar' : 'Activar'}
              </Button>
            </>
          )}
          vacioTexto="No hay guías creadas."
        />
      )}

      {/* ── ENTREGAS ── */}
      {pestana === 'entregas' && (
        <>
          <div className="escuela__filtro-entrega">
            <select className="escuela__select" value={filtroCalificado} onChange={(e) => setFiltroCalificado(e.target.value)}>
              <option value="">Todas las entregas</option>
              <option value="false">Sin calificar</option>
              <option value="true">Calificadas</option>
            </select>
          </div>
          <DataTable
            cargando={cargandoEntregas}
            datos={entregas}
            columnas={[
              { clave: 'miembro_nombre', titulo: 'Miembro' },
              { clave: 'tarea_titulo', titulo: 'Tarea' },
              { clave: 'fecha_entrega', titulo: 'Entregada', render: (f) => formatearFecha(f.fecha_entrega) },
              { clave: 'calificacion', titulo: 'Nota', render: (f) => f.calificacion !== null ? `${f.calificacion}/100` : <StatusBadge texto="Sin calificar" variant="warning" /> },
              { clave: 'url_evidencia', titulo: 'Evidencia', render: (f) => f.url_evidencia ? <a href={f.url_evidencia} target="_blank" rel="noopener noreferrer">Ver enlace</a> : '—' },
            ]}
            acciones={(fila) => (
              <>
                <Button variant="secondary" onClick={() => abrirCalificar(fila)}>Calificar</Button>
                {fila.calificacion !== null && (
                  <Button variant="ghost" onClick={() => handleNotificarCalif(fila)}>Notificar</Button>
                )}
              </>
            )}
            vacioTexto="No hay entregas registradas."
          />
        </>
      )}

      {/* Modal tarea */}
      <Modal
        abierto={modalTarea}
        titulo={editandoTarea ? 'Editar tarea' : 'Nueva tarea'}
        onClose={() => setModalTarea(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalTarea(false)}>Cancelar</Button>
            <Button onClick={guardarTarea} loading={guardandoTarea}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardarTarea} className="escuela__form">
          <FormField label="Título" name="titulo" value={formTarea.titulo} onChange={(e) => setFormTarea((p) => ({ ...p, titulo: e.target.value }))} required />
          <FormField label="Descripción" name="descripcion" type="textarea" value={formTarea.descripcion} onChange={(e) => setFormTarea((p) => ({ ...p, descripcion: e.target.value }))} />
          <FormField label="Nivel" type="select" name="nivel_id" value={formTarea.nivel_id}
            onChange={(e) => setFormTarea((p) => ({ ...p, nivel_id: e.target.value }))}
            options={[{ value: '', label: 'Selecciona un nivel' }, ...niveles.map((n) => ({ value: n.id, label: n.nombre }))]}
            required />
          <FormField label="Fecha límite (opcional)" type="date" name="fecha_limite" value={formTarea.fecha_limite} onChange={(e) => setFormTarea((p) => ({ ...p, fecha_limite: e.target.value }))} />
          {errorTarea && <p className="escuela__error">{errorTarea}</p>}
        </form>
      </Modal>

      {/* Modal guía */}
      <Modal
        abierto={modalGuia}
        titulo={editandoGuia ? 'Editar guía' : 'Nueva guía'}
        onClose={() => setModalGuia(false)}
        ancho="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalGuia(false)}>Cancelar</Button>
            <Button onClick={guardarGuia} loading={guardandoGuia}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardarGuia} className="escuela__form">
          <FormField label="Título" name="titulo" value={formGuia.titulo} onChange={(e) => setFormGuia((p) => ({ ...p, titulo: e.target.value }))} required />
          <FormField label="Nivel" type="select" name="nivel_id" value={formGuia.nivel_id}
            onChange={(e) => setFormGuia((p) => ({ ...p, nivel_id: e.target.value }))}
            options={[{ value: '', label: 'Selecciona un nivel' }, ...niveles.map((n) => ({ value: n.id, label: n.nombre }))]}
            required />
          <FormField label="Tipo" type="select" name="tipo" value={formGuia.tipo}
            onChange={(e) => setFormGuia((p) => ({ ...p, tipo: e.target.value }))}
            options={TIPOS_GUIA} />
          <FormField label="Descripción breve" name="descripcion" type="textarea" value={formGuia.descripcion} onChange={(e) => setFormGuia((p) => ({ ...p, descripcion: e.target.value }))} />
          {(formGuia.tipo === 'VIDEO' || formGuia.tipo === 'DOCUMENTO') && (
            <FormField label="URL del video / documento" name="url_video" type="url" value={formGuia.url_video} onChange={(e) => setFormGuia((p) => ({ ...p, url_video: e.target.value }))} />
          )}
          {formGuia.tipo === 'TEXTO' && (
            <FormField label="Contenido (HTML permitido)" name="contenido" type="textarea" value={formGuia.contenido} onChange={(e) => setFormGuia((p) => ({ ...p, contenido: e.target.value }))}
              helpText="Puedes usar etiquetas HTML básicas para dar formato." />
          )}
          {errorGuia && <p className="escuela__error">{errorGuia}</p>}
        </form>
      </Modal>

      {/* Modal calificar */}
      <Modal
        abierto={!!modalCalificar}
        titulo={`Calificar: ${modalCalificar?.miembro_nombre}`}
        onClose={() => setModalCalificar(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalCalificar(null)}>Cancelar</Button>
            <Button onClick={guardarCalificacion} loading={guardandoCalif}>Guardar calificación</Button>
          </>
        }
      >
        {modalCalificar && (
          <form onSubmit={guardarCalificacion} className="escuela__form">
            <p className="escuela__calif-subtitulo">Tarea: <strong>{modalCalificar.tarea_titulo}</strong></p>
            {modalCalificar.url_evidencia && (
              <p><a href={modalCalificar.url_evidencia} target="_blank" rel="noopener noreferrer">Ver evidencia →</a></p>
            )}
            <FormField label="Calificación (0 – 100)" type="number" min="0" max="100" name="calificacion"
              value={formCalif.calificacion}
              onChange={(e) => setFormCalif((p) => ({ ...p, calificacion: e.target.value }))}
              required />
            <FormField label="Retroalimentación (opcional)" type="textarea" name="retroalimentacion"
              value={formCalif.retroalimentacion}
              onChange={(e) => setFormCalif((p) => ({ ...p, retroalimentacion: e.target.value }))} />
            {errorCalif && <p className="escuela__error">{errorCalif}</p>}
          </form>
        )}
      </Modal>
    </div>
  );
}
