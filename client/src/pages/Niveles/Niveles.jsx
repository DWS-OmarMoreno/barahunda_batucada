import { useState, useEffect, useCallback } from 'react';
import {
  listarNiveles,
  crearNivel,
  actualizarNivel,
  cambiarActivoNivel,
  obtenerNivel,
  obtenerAuditoriaNivel,
} from '../../services/niveles.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import SubList from '../../components/ui/SubList';
import AuditLog from '../../components/ui/AuditLog';
import './Niveles.css';

const FORM_VACIO = { nombre: '', descripcion: '' };

export default function Niveles() {
  const [niveles, setNiveles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ totalPages: 1, total: 0 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [confirmInactivar, setConfirmInactivar] = useState(null);

  const [detalle, setDetalle] = useState(null);
  const [auditoria, setAuditoria] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarNiveles({ busqueda, page: pagina, limit: 10 });
      setNiveles(respuesta.data);
      setPaginacion(respuesta.pagination || { totalPages: 1, total: respuesta.data.length });
    } catch {
      setNiveles([]);
    } finally {
      setCargando(false);
    }
  }, [busqueda, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(nivel) {
    setEditando(nivel);
    setForm({ nombre: nivel.nombre, descripcion: nivel.descripcion || '' });
    setError('');
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (editando) {
        await actualizarNivel(editando.id, form);
      } else {
        await crearNivel(form);
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el nivel');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarInactivar() {
    if (!confirmInactivar) return;
    try {
      await cambiarActivoNivel(confirmInactivar.id, !confirmInactivar.activo);
      setConfirmInactivar(null);
      cargar();
    } catch {
      setConfirmInactivar(null);
    }
  }

  async function abrirDetalle(nivel) {
    setDetalle({ ...nivel, miembros: [] });
    setCargandoDetalle(true);
    try {
      const [respuestaNivel, respuestaAuditoria] = await Promise.all([
        obtenerNivel(nivel.id),
        obtenerAuditoriaNivel(nivel.id),
      ]);
      setDetalle(respuestaNivel.data);
      setAuditoria(respuestaAuditoria.data);
    } catch {
      // si falla, se deja el detalle parcial
    } finally {
      setCargandoDetalle(false);
    }
  }

  return (
    <div className="niveles">
      <div className="niveles__header">
        <div>
          <h1>Niveles</h1>
          <p className="niveles__descripcion">Niveles musicales en los que se inscriben los miembros.</p>
        </div>
        <Button onClick={abrirCrear}>+ Nuevo nivel</Button>
      </div>

      <DataTable
        cargando={cargando}
        datos={niveles}
        busqueda={{ valor: busqueda, onChange: (v) => { setBusqueda(v); setPagina(1); }, placeholder: 'Buscar nivel...' }}
        paginacion={{ pagina, totalPaginas: paginacion.totalPages, total: paginacion.total, onCambiarPagina: setPagina }}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre' },
          { clave: 'descripcion', titulo: 'Descripción', render: (f) => f.descripcion || '—' },
          { clave: 'total_miembros', titulo: 'Miembros activos' },
          { clave: 'activo', titulo: 'Estado', render: (f) => <StatusBadge texto={f.activo ? 'Activo' : 'Inactivo'} variant={f.activo ? 'success' : 'secondary'} /> },
        ]}
        acciones={(fila) => (
          <>
            <Button variant="ghost" onClick={() => abrirDetalle(fila)}>Ver</Button>
            <Button variant="secondary" onClick={() => abrirEditar(fila)}>Editar</Button>
            <Button variant="danger" onClick={() => setConfirmInactivar(fila)}>
              {fila.activo ? 'Inactivar' : 'Activar'}
            </Button>
          </>
        )}
        vacioTexto="No hay niveles registrados."
      />

      <Modal
        abierto={modalAbierto}
        titulo={editando ? 'Editar nivel' : 'Nuevo nivel'}
        onClose={() => setModalAbierto(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardar} className="niveles__form">
          <FormField
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            required
          />
          <FormField
            label="Descripción"
            type="textarea"
            name="descripcion"
            value={form.descripcion}
            onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
          />
          {error && <p className="niveles__error">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmInactivar}
        titulo={confirmInactivar?.activo ? 'Inactivar nivel' : 'Activar nivel'}
        mensaje={`¿Seguro que deseas ${confirmInactivar?.activo ? 'inactivar' : 'activar'} el nivel "${confirmInactivar?.nombre}"?`}
        onConfirmar={confirmarInactivar}
        onCancelar={() => setConfirmInactivar(null)}
        textoConfirmar={confirmInactivar?.activo ? 'Inactivar' : 'Activar'}
      />

      <Modal
        abierto={!!detalle}
        titulo={`Nivel: ${detalle?.nombre || ''}`}
        onClose={() => setDetalle(null)}
        ancho="lg"
      >
        {detalle && (
          <div className="niveles__detalle">
            <SubList titulo="Miembros inscritos" vacio={!detalle.miembros?.length} vacioTexto="Este nivel no tiene miembros activos.">
              {detalle.miembros?.length > 0 && (
                <table className="niveles__tabla-miembros">
                  <thead>
                    <tr><th>Nombre</th><th>Instrumento</th><th>Progreso</th></tr>
                  </thead>
                  <tbody>
                    {detalle.miembros.map((m) => (
                      <tr key={m.miembro_nivel_id}>
                        <td>{m.nombres_completos}</td>
                        <td>{m.instrumento_nombre}</td>
                        <td>{m.progreso || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SubList>

            <SubList titulo="Auditoría">
              <AuditLog registros={auditoria} cargando={cargandoDetalle} />
            </SubList>
          </div>
        )}
      </Modal>
    </div>
  );
}
