import { useState, useEffect, useCallback } from 'react';
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarPasswordUsuario,
  cambiarActivoUsuario,
  obtenerUsuario,
  obtenerAuditoriaUsuario,
} from '../../services/usuarios.service';
import { useAuth } from '../../context/AuthContext';
import { listarMiembros } from '../../services/miembros.service';
import { formatearFechaHora } from '../../utils/formato';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import SubList from '../../components/ui/SubList';
import AuditLog from '../../components/ui/AuditLog';
import ActionsMenu from '../../components/ui/ActionsMenu';
import './Usuarios.css';

const FORM_VACIO = { nombre: '', email: '', password: '', confirmarPassword: '', rol: 'ADMIN', miembro_id: '' };
const FORM_PASSWORD_VACIO = { password: '', confirmarPassword: '' };

export default function Usuarios() {
  const { usuario: usuarioSesion } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ totalPages: 1, total: 0 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [modalPassword, setModalPassword] = useState(null);
  const [formPassword, setFormPassword] = useState(FORM_PASSWORD_VACIO);
  const [errorPassword, setErrorPassword] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const [confirmActivo, setConfirmActivo] = useState(null);
  const [errorActivo, setErrorActivo] = useState('');
  const [cambiandoActivo, setCambiandoActivo] = useState(false);

  const [miembros, setMiembros] = useState([]);

  const [detalle, setDetalle] = useState(null);
  const [auditoria, setAuditoria] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarUsuarios({ busqueda, page: pagina, limit: 10 });
      setUsuarios(respuesta.data);
      setPaginacion(respuesta.pagination || { totalPages: 1, total: respuesta.data.length });
    } catch {
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  }, [busqueda, pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    listarMiembros({ activo: '1', limit: 500 })
      .then((r) => setMiembros(r.data))
      .catch(() => setMiembros([]));
  }, []);

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(usuario) {
    setEditando(usuario);
    setForm({ nombre: usuario.nombre, email: usuario.email, password: '', confirmarPassword: '', rol: usuario.rol || 'ADMIN', miembro_id: usuario.miembro_id || '' });
    setError('');
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');

    if (!editando && form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setGuardando(true);
    try {
      if (editando) {
        await actualizarUsuario(editando.id, { nombre: form.nombre, email: form.email, miembro_id: form.miembro_id || null });
      } else {
        await crearUsuario({ nombre: form.nombre, email: form.email, password: form.password, rol: form.rol, miembro_id: form.miembro_id || null });
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el usuario');
    } finally {
      setGuardando(false);
    }
  }

  function abrirCambiarPassword(usuario) {
    setModalPassword(usuario);
    setFormPassword(FORM_PASSWORD_VACIO);
    setErrorPassword('');
  }

  async function guardarPassword(e) {
    e.preventDefault();
    setErrorPassword('');

    if (formPassword.password !== formPassword.confirmarPassword) {
      setErrorPassword('Las contraseñas no coinciden');
      return;
    }

    setGuardandoPassword(true);
    try {
      await cambiarPasswordUsuario(modalPassword.id, formPassword.password);
      setModalPassword(null);
    } catch (err) {
      setErrorPassword(err.response?.data?.message || 'No se pudo cambiar la contraseña');
    } finally {
      setGuardandoPassword(false);
    }
  }

  async function confirmarCambioActivo() {
    if (!confirmActivo) return;
    setCambiandoActivo(true);
    setErrorActivo('');
    try {
      await cambiarActivoUsuario(confirmActivo.id, !confirmActivo.activo);
      setConfirmActivo(null);
      cargar();
    } catch (err) {
      setErrorActivo(err.response?.data?.message || 'No se pudo cambiar el estado del administrador');
    } finally {
      setCambiandoActivo(false);
    }
  }

  async function abrirDetalle(usuario) {
    setDetalle(usuario);
    setCargandoDetalle(true);
    try {
      const [respuestaUsuario, respuestaAuditoria] = await Promise.all([
        obtenerUsuario(usuario.id),
        obtenerAuditoriaUsuario(usuario.id),
      ]);
      setDetalle(respuestaUsuario.data);
      setAuditoria(respuestaAuditoria.data);
    } catch {
      // si falla, se deja el detalle parcial
    } finally {
      setCargandoDetalle(false);
    }
  }

  return (
    <div className="usuarios">
      <div className="usuarios__header">
        <div>
          <h1>Administradores</h1>
          <p className="usuarios__descripcion">Cuentas con acceso al panel administrativo del sistema.</p>
        </div>
        <Button onClick={abrirCrear}>+ Nuevo administrador</Button>
      </div>

      <DataTable
        cargando={cargando}
        datos={usuarios}
        busqueda={{ valor: busqueda, onChange: (v) => { setBusqueda(v); setPagina(1); }, placeholder: 'Buscar por nombre o email...' }}
        paginacion={{ pagina, totalPaginas: paginacion.totalPages, total: paginacion.total, onCambiarPagina: setPagina }}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre' },
          { clave: 'email', titulo: 'Email' },
          { clave: 'rol', titulo: 'Rol', render: (f) => <StatusBadge texto={f.rol === 'MIEMBRO' ? 'Miembro' : 'Administrador'} variant={f.rol === 'MIEMBRO' ? 'info' : 'secondary'} /> },
          { clave: 'created_at', titulo: 'Creado', render: (f) => formatearFechaHora(f.created_at) },
          { clave: 'activo', titulo: 'Estado', render: (f) => <StatusBadge texto={f.activo ? 'Activo' : 'Inactivo'} variant={f.activo ? 'success' : 'secondary'} /> },
        ]}
        acciones={(fila) => (
          <ActionsMenu acciones={[
            { etiqueta: 'Ver detalle', onClick: () => abrirDetalle(fila) },
            { etiqueta: 'Editar', onClick: () => abrirEditar(fila) },
            { etiqueta: 'Cambiar contraseña', onClick: () => abrirCambiarPassword(fila) },
            {
              etiqueta: fila.activo ? 'Desactivar' : 'Activar',
              onClick: () => { setConfirmActivo(fila); setErrorActivo(''); },
              variant: 'danger',
              disabled: fila.id === usuarioSesion?.id && !!fila.activo,
            },
          ]} />
        )}
        vacioTexto="No hay administradores registrados."
      />

      <Modal
        abierto={modalAbierto}
        titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}
        onClose={() => setModalAbierto(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardar} className="usuarios__form">
          <FormField
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            required
          />
          <FormField
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          {!editando && (
            <FormField
              label="Rol"
              type="select"
              name="rol"
              value={form.rol}
              onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value, miembro_id: '' }))}
              options={[
                { value: 'ADMIN', label: 'Administrador' },
                { value: 'MIEMBRO', label: 'Miembro (acceso al portal)' },
              ]}
            />
          )}
          {form.rol === 'MIEMBRO' && (
            <FormField
              label="Miembro vinculado"
              type="select"
              name="miembro_id"
              value={form.miembro_id}
              onChange={(e) => setForm((p) => ({ ...p, miembro_id: e.target.value }))}
              options={[{ value: '', label: 'Selecciona un miembro...' }, ...miembros.map((m) => ({ value: m.id, label: m.nombres_completos }))]}
              helpText="Este usuario iniciará sesión con su correo institucional o personal."
            />
          )}
          {!editando && (
            <>
              <FormField
                label="Contraseña"
                type="password"
                name="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
                helpText="Mínimo 6 caracteres."
              />
              <FormField
                label="Confirmar contraseña"
                type="password"
                name="confirmarPassword"
                value={form.confirmarPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmarPassword: e.target.value }))}
                required
              />
            </>
          )}
          {error && <p className="usuarios__error">{error}</p>}
        </form>
      </Modal>

      <Modal
        abierto={!!modalPassword}
        titulo={`Cambiar contraseña: ${modalPassword?.nombre || ''}`}
        onClose={() => setModalPassword(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalPassword(null)}>Cancelar</Button>
            <Button onClick={guardarPassword} loading={guardandoPassword}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardarPassword} className="usuarios__form">
          <FormField
            label="Nueva contraseña"
            type="password"
            name="password"
            value={formPassword.password}
            onChange={(e) => setFormPassword((p) => ({ ...p, password: e.target.value }))}
            required
            helpText="Mínimo 6 caracteres."
          />
          <FormField
            label="Confirmar nueva contraseña"
            type="password"
            name="confirmarPassword"
            value={formPassword.confirmarPassword}
            onChange={(e) => setFormPassword((p) => ({ ...p, confirmarPassword: e.target.value }))}
            required
          />
          {errorPassword && <p className="usuarios__error">{errorPassword}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmActivo}
        titulo={confirmActivo?.activo ? 'Desactivar administrador' : 'Activar administrador'}
        mensaje={
          errorActivo
            ? errorActivo
            : `¿Seguro que deseas ${confirmActivo?.activo ? 'desactivar' : 'activar'} a "${confirmActivo?.nombre}"?`
        }
        onConfirmar={confirmarCambioActivo}
        onCancelar={() => { setConfirmActivo(null); setErrorActivo(''); }}
        textoConfirmar={confirmActivo?.activo ? 'Desactivar' : 'Activar'}
        cargando={cambiandoActivo}
      />

      <Modal
        abierto={!!detalle}
        titulo={`${detalle?.rol === 'MIEMBRO' ? 'Miembro' : 'Administrador'}: ${detalle?.nombre || ''}`}
        onClose={() => setDetalle(null)}
        ancho="lg"
      >
        {detalle && (
          <div className="usuarios__detalle">
            <SubList titulo="Datos">
              <p><strong>Email:</strong> {detalle.email}</p>
              <p><strong>Estado:</strong> {detalle.activo ? 'Activo' : 'Inactivo'}</p>
              <p><strong>Creado:</strong> {formatearFechaHora(detalle.created_at)}</p>
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
