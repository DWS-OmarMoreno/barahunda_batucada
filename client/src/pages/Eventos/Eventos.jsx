import { useState, useEffect, useCallback } from 'react';
import {
  listarEventos,
  obtenerEvento,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  agregarParticipante,
  actualizarParticipante,
  quitarParticipante,
} from '../../services/eventos.service';
import { listarMiembros } from '../../services/miembros.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import SubList from '../../components/ui/SubList';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatearFecha, formatearMoneda } from '../../utils/formato';
import ActionsMenu from '../../components/ui/ActionsMenu';
import './Eventos.css';

const ETIQUETAS_TIPO = { PAGO: 'Pago', BENEFICO: 'Benéfico' };
const VARIANTES_TIPO = { PAGO: 'success', BENEFICO: 'info' };

const FILTROS_VACIOS = { tipo: '', fecha_desde: '', fecha_hasta: '' };
const EVENTO_VACIO = { nombre: '', fecha: '', descripcion: '', tipo: 'PAGO', valor_total: '', quien_contrata_nombre: '', quien_contrata_contacto: '' };
const PARTICIPANTE_VACIO = { miembro_id: '', valor_individual: '', notas: '' };

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ totalPages: 1, total: 0 });
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [miembros, setMiembros] = useState([]);

  const [modalForm, setModalForm] = useState(null); // null | 'crear' | evento (editar)
  const [formEvento, setFormEvento] = useState(EVENTO_VACIO);
  const [guardandoForm, setGuardandoForm] = useState(false);

  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [formParticipante, setFormParticipante] = useState(PARTICIPANTE_VACIO);
  const [editandoParticipante, setEditandoParticipante] = useState(null);
  const [guardandoParticipante, setGuardandoParticipante] = useState(false);

  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarEventos({ ...filtros, page: pagina, limit: 15 });
      setEventos(respuesta.data);
      setPaginacion(respuesta.pagination || { totalPages: 1, total: respuesta.data.length });
    } catch {
      setEventos([]);
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    listarMiembros({ activo: '1', limit: 500 }).then((r) => setMiembros(r.data)).catch(() => setMiembros([]));
  }, []);

  function actualizarFiltro(campo, valor) {
    setFiltros((p) => ({ ...p, [campo]: valor }));
    setPagina(1);
  }

  function abrirCrear() {
    setModalForm('crear');
    setFormEvento(EVENTO_VACIO);
    setError('');
  }

  function abrirEditar(evento) {
    setModalForm(evento);
    setFormEvento({
      nombre: evento.nombre,
      fecha: String(evento.fecha).slice(0, 10),
      descripcion: evento.descripcion || '',
      tipo: evento.tipo,
      valor_total: String(evento.valor_total),
      quien_contrata_nombre: evento.quien_contrata_nombre || '',
      quien_contrata_contacto: evento.quien_contrata_contacto || '',
    });
    setError('');
  }

  async function guardarForm(e) {
    e.preventDefault();
    if (!formEvento.nombre.trim() || !formEvento.fecha) {
      setError('Nombre y fecha son obligatorios');
      return;
    }
    setGuardandoForm(true);
    setError('');
    try {
      if (modalForm === 'crear') {
        await crearEvento(formEvento);
      } else {
        await actualizarEvento(modalForm.id, formEvento);
      }
      setModalForm(null);
      cargar();
      if (detalle && modalForm !== 'crear' && detalle.id === modalForm.id) abrirDetalle(modalForm.id);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el evento');
    } finally {
      setGuardandoForm(false);
    }
  }

  async function abrirDetalle(id) {
    setCargandoDetalle(true);
    setError('');
    try {
      const respuesta = await obtenerEvento(id);
      setDetalle(respuesta.data);
      setFormParticipante(PARTICIPANTE_VACIO);
      setEditandoParticipante(null);
    } catch {
      setDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function confirmarEliminarEvento() {
    setEliminando(true);
    try {
      await eliminarEvento(confirmarEliminar.id);
      setConfirmarEliminar(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el evento');
    } finally {
      setEliminando(false);
    }
  }

  async function guardarParticipante(e) {
    e.preventDefault();
    if (editandoParticipante) {
      setGuardandoParticipante(true);
      try {
        await actualizarParticipante(detalle.id, editandoParticipante.miembro_id, {
          valor_individual: formParticipante.valor_individual,
          notas: formParticipante.notas,
        });
        setEditandoParticipante(null);
        setFormParticipante(PARTICIPANTE_VACIO);
        abrirDetalle(detalle.id);
      } catch (err) {
        setError(err.response?.data?.message || 'No se pudo actualizar el participante');
      } finally {
        setGuardandoParticipante(false);
      }
      return;
    }

    if (!formParticipante.miembro_id) {
      setError('Selecciona un miembro');
      return;
    }
    setGuardandoParticipante(true);
    setError('');
    try {
      await agregarParticipante(detalle.id, formParticipante);
      setFormParticipante(PARTICIPANTE_VACIO);
      abrirDetalle(detalle.id);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo agregar el participante');
    } finally {
      setGuardandoParticipante(false);
    }
  }

  function iniciarEdicionParticipante(p) {
    setEditandoParticipante(p);
    setFormParticipante({ miembro_id: p.miembro_id, valor_individual: String(p.valor_individual), notas: p.notas || '' });
  }

  async function confirmarQuitarParticipante() {
    setEliminando(true);
    try {
      await quitarParticipante(detalle.id, confirmarQuitar.miembro_id);
      setConfirmarQuitar(null);
      abrirDetalle(detalle.id);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo quitar el participante');
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="eventos">
      <div className="eventos__header">
        <div>
          <h1>Eventos</h1>
          <p className="eventos__descripcion">Conciertos y eventos pagos o benéficos, con participantes y valores asignados.</p>
        </div>
        <Button onClick={abrirCrear}>Crear evento</Button>
      </div>

      <DataTable
        cargando={cargando}
        datos={eventos}
        filtros={
          <>
            <input type="date" className="eventos__select-filtro" value={filtros.fecha_desde} onChange={(e) => actualizarFiltro('fecha_desde', e.target.value)} title="Desde" />
            <input type="date" className="eventos__select-filtro" value={filtros.fecha_hasta} onChange={(e) => actualizarFiltro('fecha_hasta', e.target.value)} title="Hasta" />
            <select className="eventos__select-filtro" value={filtros.tipo} onChange={(e) => actualizarFiltro('tipo', e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="PAGO">Pago</option>
              <option value="BENEFICO">Benéfico</option>
            </select>
          </>
        }
        paginacion={{ pagina, totalPaginas: paginacion.totalPages, total: paginacion.total, onCambiarPagina: setPagina }}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre' },
          { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha) },
          { clave: 'tipo', titulo: 'Tipo', render: (f) => <StatusBadge texto={ETIQUETAS_TIPO[f.tipo] || f.tipo} variant={VARIANTES_TIPO[f.tipo] || 'secondary'} /> },
          { clave: 'valor_total', titulo: 'Valor total', render: (f) => formatearMoneda(f.valor_total) },
          { clave: 'total_participantes', titulo: 'Participantes' },
          { clave: 'total_asignado', titulo: 'Asignado', render: (f) => formatearMoneda(f.total_asignado) },
        ]}
        acciones={(fila) => (
          <ActionsMenu acciones={[
            { etiqueta: 'Ver detalle', onClick: () => abrirDetalle(fila.id) },
            { etiqueta: 'Editar', onClick: () => abrirEditar(fila) },
            { etiqueta: 'Eliminar', onClick: () => setConfirmarEliminar(fila), variant: 'danger' },
          ]} />
        )}
        vacioTexto="No hay eventos registrados con estos filtros."
      />

      <Modal
        abierto={!!modalForm}
        titulo={modalForm === 'crear' ? 'Crear evento' : 'Editar evento'}
        onClose={() => setModalForm(null)}
        ancho="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalForm(null)}>Cancelar</Button>
            <Button onClick={guardarForm} loading={guardandoForm}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardarForm} className="eventos__form">
          <FormField label="Nombre" name="nombre" value={formEvento.nombre} onChange={(e) => setFormEvento((p) => ({ ...p, nombre: e.target.value }))} required />
          <FormField label="Fecha" type="date" name="fecha" value={formEvento.fecha} onChange={(e) => setFormEvento((p) => ({ ...p, fecha: e.target.value }))} required />
          <FormField
            label="Tipo"
            type="select"
            name="tipo"
            value={formEvento.tipo}
            onChange={(e) => setFormEvento((p) => ({ ...p, tipo: e.target.value }))}
            options={[{ value: 'PAGO', label: 'Pago' }, { value: 'BENEFICO', label: 'Benéfico' }]}
          />
          <FormField label="Valor total" type="number" min="0" step="100" name="valor_total" value={formEvento.valor_total} onChange={(e) => setFormEvento((p) => ({ ...p, valor_total: e.target.value }))} />
          <FormField label="Descripción" type="textarea" name="descripcion" value={formEvento.descripcion} onChange={(e) => setFormEvento((p) => ({ ...p, descripcion: e.target.value }))} />
          <FormField label="Quién contrata (nombre)" name="quien_contrata_nombre" value={formEvento.quien_contrata_nombre} onChange={(e) => setFormEvento((p) => ({ ...p, quien_contrata_nombre: e.target.value }))} />
          <FormField label="Quién contrata (contacto)" name="quien_contrata_contacto" value={formEvento.quien_contrata_contacto} onChange={(e) => setFormEvento((p) => ({ ...p, quien_contrata_contacto: e.target.value }))} />
          {error && <p className="eventos__error">{error}</p>}
        </form>
      </Modal>

      <Modal abierto={!!detalle} titulo={detalle?.nombre || 'Detalle del evento'} onClose={() => setDetalle(null)} ancho="lg">
        {cargandoDetalle && <p>Cargando...</p>}
        {detalle && !cargandoDetalle && (
          <div className="eventos__detalle">
            <div className="eventos__detalle-campos">
              <div><span>Fecha</span><strong>{formatearFecha(detalle.fecha)}</strong></div>
              <div><span>Tipo</span><StatusBadge texto={ETIQUETAS_TIPO[detalle.tipo] || detalle.tipo} variant={VARIANTES_TIPO[detalle.tipo] || 'secondary'} /></div>
              <div><span>Valor total</span><strong>{formatearMoneda(detalle.valor_total)}</strong></div>
              <div><span>Total asignado</span><strong>{formatearMoneda(detalle.total_asignado)}</strong></div>
              <div><span>Quién contrata</span><strong>{detalle.quien_contrata_nombre || '—'}</strong></div>
              <div><span>Contacto</span><strong>{detalle.quien_contrata_contacto || '—'}</strong></div>
              {detalle.descripcion && <div><span>Descripción</span><strong>{detalle.descripcion}</strong></div>}
            </div>

            <SubList
              titulo={`Participantes (${detalle.participantes.length})`}
              vacio={detalle.participantes.length === 0}
              vacioTexto="Aún no hay participantes agregados a este evento."
            >
              <table className="eventos__tabla-participantes">
                <thead>
                  <tr>
                    <th>Miembro</th>
                    <th>Valor individual</th>
                    <th>Notas</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.participantes.map((p) => (
                    <tr key={p.id}>
                      <td>{p.miembro_nombre}</td>
                      <td>{formatearMoneda(p.valor_individual)}</td>
                      <td>{p.notas || '—'}</td>
                      <td className="eventos__tabla-participantes-acciones">
                        <Button variant="secondary" onClick={() => iniciarEdicionParticipante(p)}>Editar</Button>
                        <Button variant="ghost" onClick={() => setConfirmarQuitar(p)}>Quitar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SubList>

            <form onSubmit={guardarParticipante} className="eventos__form-participante">
              <h4>{editandoParticipante ? `Editar a ${editandoParticipante.miembro_nombre}` : 'Agregar participante'}</h4>
              <div className="eventos__form-participante-campos">
                {!editandoParticipante && (
                  <FormField
                    label="Miembro"
                    type="select"
                    name="miembro_id"
                    value={formParticipante.miembro_id}
                    onChange={(e) => setFormParticipante((p) => ({ ...p, miembro_id: e.target.value }))}
                    options={[{ value: '', label: 'Seleccione un miembro' }, ...miembros.map((m) => ({ value: m.id, label: m.nombres_completos }))]}
                  />
                )}
                <FormField label="Valor individual" type="number" min="0" step="100" name="valor_individual" value={formParticipante.valor_individual} onChange={(e) => setFormParticipante((p) => ({ ...p, valor_individual: e.target.value }))} />
                <FormField label="Notas" name="notas" value={formParticipante.notas} onChange={(e) => setFormParticipante((p) => ({ ...p, notas: e.target.value }))} />
              </div>
              <div className="eventos__form-participante-acciones">
                {editandoParticipante && (
                  <Button variant="secondary" type="button" onClick={() => { setEditandoParticipante(null); setFormParticipante(PARTICIPANTE_VACIO); }}>Cancelar edición</Button>
                )}
                <Button type="submit" loading={guardandoParticipante}>{editandoParticipante ? 'Guardar cambios' : 'Agregar'}</Button>
              </div>
              {error && <p className="eventos__error">{error}</p>}
            </form>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={!!confirmarEliminar}
        titulo="Eliminar evento"
        mensaje={confirmarEliminar ? `¿Eliminar el evento "${confirmarEliminar.nombre}"? Esta acción se puede revertir desde la base de datos, pero no desde la app.` : ''}
        onConfirmar={confirmarEliminarEvento}
        onCancelar={() => setConfirmarEliminar(null)}
        cargando={eliminando}
      />

      <ConfirmDialog
        abierto={!!confirmarQuitar}
        titulo="Quitar participante"
        mensaje={confirmarQuitar ? `¿Quitar a "${confirmarQuitar.miembro_nombre}" de este evento?` : ''}
        onConfirmar={confirmarQuitarParticipante}
        onCancelar={() => setConfirmarQuitar(null)}
        cargando={eliminando}
      />
    </div>
  );
}
