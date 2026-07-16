import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  obtenerMiembro,
  actualizarMiembro,
  agregarNivelMiembro,
  actualizarNivelMiembro,
  quitarNivelMiembro,
  agregarContactoMiembro,
  actualizarContactoMiembro,
  eliminarContactoMiembro,
  listarPagosMiembro,
  registrarPagoMiembro,
  obtenerAuditoriaMiembro,
  generarCorreoMiembro,
  concederAccesoPortal,
  removerAccesoPortal,
  listarAsistenciasMiembro,
  listarEntregasPlanMiembro,
} from '../../services/miembros.service';
import { listarNiveles } from '../../services/niveles.service';
import { listarInstrumentos } from '../../services/instrumentos.service';
import Tabs from '../../components/ui/Tabs';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SubList from '../../components/ui/SubList';
import AuditLog from '../../components/ui/AuditLog';
import UploadField from '../../components/ui/UploadField';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatearFecha, formatearMoneda, NOMBRES_MES } from '../../utils/formato';
import { urlArchivo } from '../../services/api';
import './Miembros.css';

const PESTANAS = [
  { clave: 'personal',    titulo: 'Información' },
  { clave: 'medica',      titulo: 'Médica' },
  { clave: 'niveles',     titulo: 'Niveles' },
  { clave: 'contactos',   titulo: 'Contactos' },
  { clave: 'asistencias', titulo: 'Asistencias' },
  { clave: 'pagos',       titulo: 'Pagos' },
  { clave: 'entregas',    titulo: 'Entregas' },
  { clave: 'auditoria',   titulo: 'Auditoría' },
];

const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];
const TIPOS_SANGRE = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const NIVEL_VACIO = { nivel_id: '', instrumento_id: '', progreso: '', fecha_inicio: '' };
const CONTACTO_VACIO = { nombre: '', parentesco: '', telefono: '' };
const PAGO_VACIO = {
  valor: '', fecha_pago: '',
  mes_correspondiente: String(new Date().getMonth() + 1),
  anio_correspondiente: String(new Date().getFullYear()),
  observaciones: '',
};

function miembro2form(m) {
  return {
    nombres_completos:    m.nombres_completos    || '',
    tipo_documento:       m.tipo_documento       || 'CC',
    numero_documento:     m.numero_documento     || '',
    whatsapp:             m.whatsapp             || '',
    email:                m.email               || '',
    fecha_nacimiento:     m.fecha_nacimiento ? String(m.fecha_nacimiento).slice(0, 10) : '',
    direccion:            m.direccion            || '',
    tipo_sangre:          m.tipo_sangre          || '',
    eps:                  m.eps                  || '',
    padece_enfermedad:    !!m.padece_enfermedad,
    enfermedad_cual:      m.enfermedad_cual      || '',
    sufre_alergia:        !!m.sufre_alergia,
    alergia_cual:         m.alergia_cual         || '',
    toma_medicamentos:    !!m.toma_medicamentos,
    medicamentos_cuales:  m.medicamentos_cuales  || '',
    restricciones_fisicas: m.restricciones_fisicas || '',
    exento_pago:          !!m.exento_pago,
    asistencia_obligatoria: !!m.asistencia_obligatoria,
  };
}

// ─── Estado badge de asistencia ───────────────────────────────────────────────

function badgeAsistencia(estado) {
  if (estado === 'A_TIEMPO') return <StatusBadge texto="A tiempo" variant="success" />;
  if (estado === 'TARDE')    return <StatusBadge texto="Tarde" variant="warning" />;
  if (estado === 'AUSENTE')  return <StatusBadge texto="Ausente" variant="danger" />;
  return <StatusBadge texto={estado} variant="secondary" />;
}

// ─── Badge de calificación de entrega ─────────────────────────────────────────

function badgeCalif(entrega) {
  if (entrega.calificacion != null)
    return <StatusBadge texto={`Nota: ${entrega.calificacion}`} variant="success" />;
  if (entrega.calificacion_categorica) {
    const v = entrega.calificacion_categorica;
    return <StatusBadge texto={v === 'EXCELENTE' ? 'Excelente' : 'Por mejorar'} variant={v === 'EXCELENTE' ? 'success' : 'warning'} />;
  }
  return <StatusBadge texto="Entregado" variant="info" />;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MiembroDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pestana, setPestana] = useState('personal');
  const [miembro, setMiembro] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Edición inline personal/médica
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorEdit, setErrorEdit] = useState('');
  const [exitoEdit, setExitoEdit] = useState('');

  // Sublistas
  const [pagos, setPagos] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(true);
  const [asistencias, setAsistencias] = useState([]);
  const [pagAsist, setPagAsist] = useState(1);
  const [totalPagAsist, setTotalPagAsist] = useState(1);
  const [cargandoAsist, setCargandoAsist] = useState(false);
  const [entregas, setEntregas] = useState([]);
  const [cargandoEntregas, setCargandoEntregas] = useState(false);

  // Catálogos
  const [catalogoNiveles, setCatalogoNiveles] = useState([]);
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);

  // Niveles
  const [formNivel, setFormNivel] = useState(NIVEL_VACIO);
  const [editandoNivelId, setEditandoNivelId] = useState(null);
  const [formEditarNivel, setFormEditarNivel] = useState({ progreso: '', fecha_inicio: '', instrumento_id: '' });
  const [confirmQuitarNivel, setConfirmQuitarNivel] = useState(null);

  // Contactos
  const [formContacto, setFormContacto] = useState(CONTACTO_VACIO);
  const [editandoContacto, setEditandoContacto] = useState(null);
  const [confirmEliminarContacto, setConfirmEliminarContacto] = useState(null);

  // Pagos
  const [formPago, setFormPago] = useState(PAGO_VACIO);
  const [archivoSoporte, setArchivoSoporte] = useState(null);
  const [guardandoPago, setGuardandoPago] = useState(false);

  // Correo y acceso
  const [generandoCorreo, setGenerandoCorreo] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState('');
  const [accesoAccion, setAccesoAccion] = useState(null);
  const [accesoMensaje, setAccesoMensaje] = useState('');
  const [gestionandoAcceso, setGestionandoAcceso] = useState(false);
  const [guardandoSub, setGuardandoSub] = useState(false);

  // ── Carga inicial ─────────────────────────────────────────────────────────

  const cargarMiembro = useCallback(async () => {
    setCargando(true);
    try {
      const r = await obtenerMiembro(id);
      setMiembro(r.data);
    } catch {
      setMiembro(null);
    } finally {
      setCargando(false);
    }
  }, [id]);

  const cargarPagos = useCallback(async () => {
    try { const r = await listarPagosMiembro(id); setPagos(r.data); }
    catch { setPagos([]); }
  }, [id]);

  const cargarAuditoria = useCallback(async () => {
    setCargandoAuditoria(true);
    try { const r = await obtenerAuditoriaMiembro(id); setAuditoria(r.data); }
    catch { setAuditoria([]); }
    finally { setCargandoAuditoria(false); }
  }, [id]);

  const cargarAsistencias = useCallback(async (pag = 1) => {
    setCargandoAsist(true);
    try {
      const r = await listarAsistenciasMiembro(id, { pagina: pag, limite: 15 });
      setAsistencias(r.data);
      setTotalPagAsist(r.pagination?.totalPages ?? 1);
      setPagAsist(pag);
    } catch { setAsistencias([]); }
    finally { setCargandoAsist(false); }
  }, [id]);

  const cargarEntregas = useCallback(async () => {
    setCargandoEntregas(true);
    try { const r = await listarEntregasPlanMiembro(id); setEntregas(r.data); }
    catch { setEntregas([]); }
    finally { setCargandoEntregas(false); }
  }, [id]);

  useEffect(() => {
    cargarMiembro();
    cargarPagos();
    cargarAuditoria();
    cargarAsistencias(1);
    cargarEntregas();
    listarNiveles({ limit: 100 }).then((r) => setCatalogoNiveles(r.data)).catch(() => setCatalogoNiveles([]));
    listarInstrumentos().then((r) => setCatalogoInstrumentos(r.data)).catch(() => setCatalogoInstrumentos([]));
  }, [cargarMiembro, cargarPagos, cargarAuditoria, cargarAsistencias, cargarEntregas]);

  function notificarCambio() {
    cargarMiembro();
    cargarAuditoria();
  }

  // ── Edición de datos personales/médicos ───────────────────────────────────

  function abrirEdicion() {
    if (!miembro) return;
    setForm(miembro2form(miembro));
    setErrorEdit('');
    setExitoEdit('');
    setEditando(true);
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorEdit('');
    setExitoEdit('');
    try {
      await actualizarMiembro(id, form);
      setExitoEdit('Guardado correctamente.');
      notificarCambio();
      setTimeout(() => { setEditando(false); setExitoEdit(''); }, 1200);
    } catch (err) {
      setErrorEdit(err.response?.data?.message || 'No se pudo guardar');
    } finally { setGuardando(false); }
  }

  // ── Acceso al portal ───────────────────────────────────────────────────────

  async function handleAccesoPortal(accion) {
    setGestionandoAcceso(true);
    setAccesoMensaje('');
    try {
      if (accion === 'conceder') {
        const r = await concederAccesoPortal(id);
        setAccesoMensaje(`Acceso concedido. Email: ${r.data.email} · Contraseña temporal: ${r.data.password_temporal}`);
      } else {
        await removerAccesoPortal(id);
        setAccesoMensaje('Acceso al portal removido.');
      }
      cargarMiembro();
    } catch (err) {
      setAccesoMensaje(err.response?.data?.message || 'No se pudo procesar la solicitud');
    } finally { setGestionandoAcceso(false); setAccesoAccion(null); }
  }

  // ── Correo institucional ───────────────────────────────────────────────────

  async function handleGenerarCorreo() {
    setGenerandoCorreo(true);
    setErrorCorreo('');
    try {
      const r = await generarCorreoMiembro(id);
      setMiembro((m) => ({ ...m, correo_institucional: r.data?.correo_institucional }));
    } catch (err) {
      setErrorCorreo(err.response?.data?.message || 'No se pudo generar el correo institucional');
    } finally { setGenerandoCorreo(false); }
  }

  // ── Niveles ───────────────────────────────────────────────────────────────

  async function agregarNivel(e) {
    e.preventDefault();
    if (!formNivel.nivel_id || !formNivel.instrumento_id) { setError('Selecciona un nivel y un instrumento'); return; }
    setGuardandoSub(true);
    setError('');
    try {
      await agregarNivelMiembro(id, formNivel);
      setFormNivel(NIVEL_VACIO);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo asignar el nivel');
    } finally { setGuardandoSub(false); }
  }

  function abrirEditarNivel(registro) {
    setEditandoNivelId(registro.id);
    setFormEditarNivel({ progreso: registro.progreso || '', fecha_inicio: registro.fecha_inicio ? String(registro.fecha_inicio).slice(0, 10) : '', instrumento_id: registro.instrumento_id });
  }

  async function guardarEditarNivel() {
    setGuardandoSub(true);
    try {
      await actualizarNivelMiembro(id, editandoNivelId, formEditarNivel);
      setEditandoNivelId(null);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar');
    } finally { setGuardandoSub(false); }
  }

  async function confirmarQuitarNivel() {
    if (!confirmQuitarNivel) return;
    try { await quitarNivelMiembro(id, confirmQuitarNivel.id); setConfirmQuitarNivel(null); notificarCambio(); }
    catch { setConfirmQuitarNivel(null); }
  }

  // ── Contactos ─────────────────────────────────────────────────────────────

  async function agregarContacto(e) {
    e.preventDefault();
    if (!formContacto.nombre || !formContacto.telefono) { setError('Nombre y teléfono son obligatorios'); return; }
    setGuardandoSub(true);
    setError('');
    try {
      await agregarContactoMiembro(id, formContacto);
      setFormContacto(CONTACTO_VACIO);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo agregar el contacto');
    } finally { setGuardandoSub(false); }
  }

  async function guardarEditarContacto() {
    setGuardandoSub(true);
    try {
      await actualizarContactoMiembro(id, editandoContacto.id, editandoContacto);
      setEditandoContacto(null);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar');
    } finally { setGuardandoSub(false); }
  }

  async function confirmarEliminarContacto() {
    if (!confirmEliminarContacto) return;
    try { await eliminarContactoMiembro(id, confirmEliminarContacto.id); setConfirmEliminarContacto(null); notificarCambio(); }
    catch { setConfirmEliminarContacto(null); }
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────

  async function guardarPago(e) {
    e.preventDefault();
    if (!formPago.valor || !formPago.fecha_pago) { setError('Valor y fecha son obligatorios'); return; }
    setGuardandoPago(true);
    setError('');
    try {
      await registrarPagoMiembro(id, formPago, archivoSoporte);
      setFormPago(PAGO_VACIO);
      setArchivoSoporte(null);
      cargarPagos();
      cargarAuditoria();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el pago');
    } finally { setGuardandoPago(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (cargando) return <div className="miembro-pag"><p className="miembros__cargando">Cargando miembro...</p></div>;
  if (!miembro) return (
    <div className="miembro-pag">
      <p className="miembros__error">Miembro no encontrado.</p>
      <Button variant="secondary" onClick={() => navigate('/admin/miembros')}>← Volver</Button>
    </div>
  );

  return (
    <div className="miembro-pag">
      {/* Encabezado de la página */}
      <div className="miembro-pag__header">
        <div className="miembro-pag__back">
          <button type="button" className="miembro-pag__back-btn" onClick={() => navigate('/admin/miembros')}>
            ← Miembros
          </button>
        </div>
        <div className="miembro-pag__titulo-bloque">
          <h1 className="miembro-pag__nombre">{miembro.nombres_completos}</h1>
          <div className="miembro-pag__meta">
            <StatusBadge texto={miembro.activo ? 'Activo' : 'Inactivo'} variant={miembro.activo ? 'success' : 'secondary'} />
            {miembro.niveles?.map((n) => (
              <span key={n.id} className="miembro-pag__nivel-chip">{n.nivel_nombre}</span>
            ))}
          </div>
        </div>
        {!editando && (
          <Button onClick={abrirEdicion}>Editar datos</Button>
        )}
      </div>

      {error && <p className="miembros__error">{error}</p>}

      <Tabs pestanas={PESTANAS} activa={pestana} onChange={setPestana} />

      {/* ── Pestaña Personal ── */}
      {pestana === 'personal' && (
        <div className="miembro-pag__tab-body">
          {editando ? (
            <form onSubmit={guardarEdicion} className="miembro-pag__form">
              <div className="miembros__grid">
                <FormField label="Nombre completo" name="nombres_completos" value={form.nombres_completos} onChange={(e) => setForm((p) => ({ ...p, nombres_completos: e.target.value }))} required />
                <FormField label="Tipo de documento" type="select" name="tipo_documento" value={form.tipo_documento} options={TIPOS_DOCUMENTO} onChange={(e) => setForm((p) => ({ ...p, tipo_documento: e.target.value }))} />
                <FormField label="Número de documento" name="numero_documento" value={form.numero_documento} onChange={(e) => setForm((p) => ({ ...p, numero_documento: e.target.value }))} required />
                <FormField label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} helpText="Sin indicativo de país" required />
                <FormField label="Email" type="email" name="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                <FormField label="Fecha de nacimiento" type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={(e) => setForm((p) => ({ ...p, fecha_nacimiento: e.target.value }))} />
                <FormField label="Dirección" name="direccion" value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} />
                <FormField label="EPS" name="eps" value={form.eps} onChange={(e) => setForm((p) => ({ ...p, eps: e.target.value }))} />
                <FormField label="Tipo de sangre" type="select" name="tipo_sangre" value={form.tipo_sangre} onChange={(e) => setForm((p) => ({ ...p, tipo_sangre: e.target.value }))} options={TIPOS_SANGRE.map((t) => ({ value: t, label: t || 'Sin especificar' }))} />
              </div>
              <div className="miembros__grid">
                <FormField label="Exento de pago" type="checkbox" name="exento_pago" value={form.exento_pago} onChange={(e) => setForm((p) => ({ ...p, exento_pago: e.target.checked }))} />
                <FormField label="Asistencia obligatoria" type="checkbox" name="asistencia_obligatoria" value={form.asistencia_obligatoria} onChange={(e) => setForm((p) => ({ ...p, asistencia_obligatoria: e.target.checked }))} />
              </div>
              {errorEdit && <p className="miembros__error">{errorEdit}</p>}
              {exitoEdit && <p style={{ color: 'var(--color-success)', fontSize: '13px' }}>{exitoEdit}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="button" variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
                <Button type="submit" loading={guardando}>Guardar cambios</Button>
              </div>
            </form>
          ) : (
            <>
              <div className="miembro-detalle__campos">
                <div><span>Documento</span><strong>{miembro.tipo_documento} {miembro.numero_documento}</strong></div>
                <div><span>WhatsApp</span><strong>{miembro.whatsapp || '—'}</strong></div>
                <div><span>Email</span><strong>{miembro.email || '—'}</strong></div>
                <div>
                  <span>Correo institucional</span>
                  <strong>
                    {miembro.correo_institucional ? miembro.correo_institucional : (
                      <span className="miembro-detalle__correo-vacio">
                        <em style={{ color: 'var(--color-secondary)', fontStyle: 'normal' }}>Sin asignar</em>
                        <Button type="button" variant="secondary" onClick={handleGenerarCorreo} loading={generandoCorreo} style={{ marginLeft: 10, padding: '2px 10px', fontSize: 12 }}>
                          Generar correo
                        </Button>
                      </span>
                    )}
                  </strong>
                  {errorCorreo && <span style={{ display: 'block', fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{errorCorreo}</span>}
                </div>
                <div><span>Fecha de nacimiento</span><strong>{formatearFecha(miembro.fecha_nacimiento)}</strong></div>
                <div><span>Dirección</span><strong>{miembro.direccion || '—'}</strong></div>
                <div><span>EPS</span><strong>{miembro.eps || '—'}</strong></div>
                <div><span>Tipo de sangre</span><strong>{miembro.tipo_sangre || '—'}</strong></div>
                <div><span>Exento de pago</span><strong>{miembro.exento_pago ? <StatusBadge texto="Sí" variant="info" /> : 'No'}</strong></div>
                <div>
                  <span>Asistencia obligatoria</span>
                  <strong>
                    {miembro.asistencia_obligatoria_efectiva ? <StatusBadge texto="Obligatoria" variant="warning" /> : 'No'}
                    {miembro.dos_meses_pendientes && !miembro.asistencia_obligatoria && (
                      <span className="miembro-detalle__nota-inline"> (2+ meses sin pagar)</span>
                    )}
                  </strong>
                </div>
              </div>

              {/* Acceso al portal */}
              <div className="miembro-detalle__acceso" style={{ marginTop: 16 }}>
                <span>Acceso al portal</span>
                <div className="miembro-detalle__acceso-body">
                  {miembro.usuario_id ? (
                    <>
                      <StatusBadge texto={miembro.usuario_activo ? 'Activo' : 'Inactivo'} variant={miembro.usuario_activo ? 'success' : 'secondary'} />
                      <span className="miembro-detalle__acceso-email">{miembro.usuario_email}</span>
                      {miembro.usuario_activo
                        ? <Button variant="danger" onClick={() => setAccesoAccion('remover')} loading={gestionandoAcceso} style={{ padding: '2px 10px', fontSize: 12 }}>Remover acceso</Button>
                        : <Button variant="secondary" onClick={() => setAccesoAccion('conceder')} loading={gestionandoAcceso} style={{ padding: '2px 10px', fontSize: 12 }}>Reactivar acceso</Button>
                      }
                    </>
                  ) : (
                    <>
                      <StatusBadge texto="Sin acceso" variant="secondary" />
                      <Button variant="secondary" onClick={() => setAccesoAccion('conceder')} loading={gestionandoAcceso} style={{ marginLeft: 8, padding: '2px 10px', fontSize: 12 }}>Conceder acceso</Button>
                    </>
                  )}
                </div>
                {accesoMensaje && <p className="miembro-detalle__acceso-msg">{accesoMensaje}</p>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Pestaña Médica ── */}
      {pestana === 'medica' && (
        <div className="miembro-pag__tab-body">
          {editando ? (
            <form onSubmit={guardarEdicion} className="miembro-pag__form">
              <FormField label="¿Padece alguna enfermedad?" type="checkbox" name="padece_enfermedad" value={form.padece_enfermedad} onChange={(e) => setForm((p) => ({ ...p, padece_enfermedad: e.target.checked }))} />
              {form.padece_enfermedad && <FormField label="¿Cuál?" name="enfermedad_cual" value={form.enfermedad_cual} onChange={(e) => setForm((p) => ({ ...p, enfermedad_cual: e.target.value }))} />}
              <FormField label="¿Sufre alguna alergia?" type="checkbox" name="sufre_alergia" value={form.sufre_alergia} onChange={(e) => setForm((p) => ({ ...p, sufre_alergia: e.target.checked }))} />
              {form.sufre_alergia && <FormField label="¿Cuál?" name="alergia_cual" value={form.alergia_cual} onChange={(e) => setForm((p) => ({ ...p, alergia_cual: e.target.value }))} />}
              <FormField label="¿Toma medicamentos regularmente?" type="checkbox" name="toma_medicamentos" value={form.toma_medicamentos} onChange={(e) => setForm((p) => ({ ...p, toma_medicamentos: e.target.checked }))} />
              {form.toma_medicamentos && <FormField label="¿Cuáles?" name="medicamentos_cuales" value={form.medicamentos_cuales} onChange={(e) => setForm((p) => ({ ...p, medicamentos_cuales: e.target.value }))} />}
              <FormField label="Restricciones físicas" type="textarea" name="restricciones_fisicas" value={form.restricciones_fisicas} onChange={(e) => setForm((p) => ({ ...p, restricciones_fisicas: e.target.value }))} />
              {errorEdit && <p className="miembros__error">{errorEdit}</p>}
              {exitoEdit && <p style={{ color: 'var(--color-success)', fontSize: '13px' }}>{exitoEdit}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="button" variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
                <Button type="submit" loading={guardando}>Guardar cambios</Button>
              </div>
            </form>
          ) : (
            <div className="miembro-detalle__campos">
              <div><span>Tipo de sangre</span><strong>{miembro.tipo_sangre || '—'}</strong></div>
              <div><span>EPS</span><strong>{miembro.eps || '—'}</strong></div>
              <div><span>¿Padece enfermedad?</span><strong>{miembro.padece_enfermedad ? `Sí — ${miembro.enfermedad_cual || 'sin especificar'}` : 'No'}</strong></div>
              <div><span>¿Sufre alergias?</span><strong>{miembro.sufre_alergia ? `Sí — ${miembro.alergia_cual || 'sin especificar'}` : 'No'}</strong></div>
              <div><span>¿Toma medicamentos?</span><strong>{miembro.toma_medicamentos ? `Sí — ${miembro.medicamentos_cuales || 'sin especificar'}` : 'No'}</strong></div>
              <div className="miembro-detalle__campo-ancho"><span>Restricciones físicas</span><strong>{miembro.restricciones_fisicas || '—'}</strong></div>
            </div>
          )}
        </div>
      )}

      {/* ── Pestaña Niveles ── */}
      {pestana === 'niveles' && (
        <div className="miembro-pag__tab-body miembro-detalle__seccion">
          <SubList titulo="Niveles asignados" vacio={!miembro.niveles?.length} vacioTexto="Sin niveles asignados.">
            {miembro.niveles?.length > 0 && (
              <table className="miembro-detalle__tabla">
                <thead>
                  <tr><th>Nivel</th><th>Instrumento</th><th>Progreso</th><th>Inicio</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {miembro.niveles.map((n) => (
                    <tr key={n.id}>
                      <td>{n.nivel_nombre}</td>
                      <td>{editandoNivelId === n.id
                        ? <select value={formEditarNivel.instrumento_id} onChange={(e) => setFormEditarNivel((p) => ({ ...p, instrumento_id: e.target.value }))} className="form-field__input">
                            {catalogoInstrumentos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                          </select>
                        : n.instrumento_nombre}
                      </td>
                      <td>{editandoNivelId === n.id
                        ? <input className="form-field__input" value={formEditarNivel.progreso} onChange={(e) => setFormEditarNivel((p) => ({ ...p, progreso: e.target.value }))} />
                        : (n.progreso || '—')}
                      </td>
                      <td>{editandoNivelId === n.id
                        ? <input type="date" className="form-field__input" value={formEditarNivel.fecha_inicio} onChange={(e) => setFormEditarNivel((p) => ({ ...p, fecha_inicio: e.target.value }))} />
                        : formatearFecha(n.fecha_inicio)}
                      </td>
                      <td>{n.activo ? 'Activo' : 'Inactivo'}</td>
                      <td className="miembro-detalle__acciones-fila">
                        {editandoNivelId === n.id ? (
                          <>
                            <Button variant="primary" onClick={guardarEditarNivel} loading={guardandoSub}>Guardar</Button>
                            <Button variant="secondary" onClick={() => setEditandoNivelId(null)}>Cancelar</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="secondary" onClick={() => abrirEditarNivel(n)}>Editar</Button>
                            {n.activo === 1 && <Button variant="danger" onClick={() => setConfirmQuitarNivel(n)}>Quitar</Button>}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SubList>

          <SubList titulo="Asignar nuevo nivel">
            <form onSubmit={agregarNivel} className="miembro-detalle__form-inline">
              <select className="form-field__input" value={formNivel.nivel_id} onChange={(e) => setFormNivel((p) => ({ ...p, nivel_id: e.target.value }))}>
                <option value="">Nivel...</option>
                {catalogoNiveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
              <select className="form-field__input" value={formNivel.instrumento_id} onChange={(e) => setFormNivel((p) => ({ ...p, instrumento_id: e.target.value }))}>
                <option value="">Instrumento...</option>
                {catalogoInstrumentos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
              <input className="form-field__input" placeholder="Progreso (opcional)" value={formNivel.progreso} onChange={(e) => setFormNivel((p) => ({ ...p, progreso: e.target.value }))} />
              <input type="date" className="form-field__input" value={formNivel.fecha_inicio} onChange={(e) => setFormNivel((p) => ({ ...p, fecha_inicio: e.target.value }))} />
              <Button type="submit" loading={guardandoSub}>Asignar</Button>
            </form>
          </SubList>
        </div>
      )}

      {/* ── Pestaña Contactos ── */}
      {pestana === 'contactos' && (
        <div className="miembro-pag__tab-body miembro-detalle__seccion">
          <SubList titulo="Contactos de emergencia" vacio={!miembro.contactos?.length} vacioTexto="Sin contactos registrados.">
            {miembro.contactos?.length > 0 && (
              <table className="miembro-detalle__tabla">
                <thead><tr><th>Nombre</th><th>Parentesco</th><th>Teléfono</th><th></th></tr></thead>
                <tbody>
                  {miembro.contactos.map((c) => (
                    <tr key={c.id}>
                      {editandoContacto?.id === c.id ? (
                        <>
                          <td><input className="form-field__input" value={editandoContacto.nombre} onChange={(e) => setEditandoContacto((p) => ({ ...p, nombre: e.target.value }))} /></td>
                          <td><input className="form-field__input" value={editandoContacto.parentesco || ''} onChange={(e) => setEditandoContacto((p) => ({ ...p, parentesco: e.target.value }))} /></td>
                          <td><input className="form-field__input" value={editandoContacto.telefono} onChange={(e) => setEditandoContacto((p) => ({ ...p, telefono: e.target.value }))} /></td>
                          <td className="miembro-detalle__acciones-fila">
                            <Button variant="primary" onClick={guardarEditarContacto} loading={guardandoSub}>Guardar</Button>
                            <Button variant="secondary" onClick={() => setEditandoContacto(null)}>Cancelar</Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{c.nombre}</td>
                          <td>{c.parentesco || '—'}</td>
                          <td>{c.telefono}</td>
                          <td className="miembro-detalle__acciones-fila">
                            <Button variant="secondary" onClick={() => setEditandoContacto({ ...c })}>Editar</Button>
                            <Button variant="danger" onClick={() => setConfirmEliminarContacto(c)}>Eliminar</Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SubList>

          <SubList titulo="Agregar contacto">
            <form onSubmit={agregarContacto} className="miembro-detalle__form-inline">
              <input className="form-field__input" placeholder="Nombre" value={formContacto.nombre} onChange={(e) => setFormContacto((p) => ({ ...p, nombre: e.target.value }))} />
              <input className="form-field__input" placeholder="Parentesco" value={formContacto.parentesco} onChange={(e) => setFormContacto((p) => ({ ...p, parentesco: e.target.value }))} />
              <input className="form-field__input" placeholder="Teléfono" value={formContacto.telefono} onChange={(e) => setFormContacto((p) => ({ ...p, telefono: e.target.value }))} />
              <Button type="submit" loading={guardandoSub}>Agregar</Button>
            </form>
          </SubList>
        </div>
      )}

      {/* ── Pestaña Asistencias ── */}
      {pestana === 'asistencias' && (
        <div className="miembro-pag__tab-body">
          {cargandoAsist
            ? <p className="miembros__cargando">Cargando asistencias...</p>
            : asistencias.length === 0
              ? <p className="miembro-pag__vacio">Sin registros de asistencia.</p>
              : (
                <>
                  <table className="miembro-detalle__tabla">
                    <thead><tr><th>Fecha</th><th>Nivel</th><th>Estado</th><th>Observaciones</th></tr></thead>
                    <tbody>
                      {asistencias.map((a) => (
                        <tr key={a.id}>
                          <td>{formatearFecha(a.fecha)}</td>
                          <td>{a.nivel_nombre || '—'}</td>
                          <td>{badgeAsistencia(a.estado)}</td>
                          <td>{a.observaciones || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {totalPagAsist > 1 && (
                    <div className="miembro-pag__paginacion">
                      <button className="portal__pag-btn" disabled={pagAsist <= 1} onClick={() => cargarAsistencias(pagAsist - 1)}>← Anterior</button>
                      <span className="portal__pag-info">Página {pagAsist} / {totalPagAsist}</span>
                      <button className="portal__pag-btn" disabled={pagAsist >= totalPagAsist} onClick={() => cargarAsistencias(pagAsist + 1)}>Siguiente →</button>
                    </div>
                  )}
                </>
              )
          }
        </div>
      )}

      {/* ── Pestaña Pagos ── */}
      {pestana === 'pagos' && (
        <div className="miembro-pag__tab-body miembro-detalle__seccion">
          <p className="miembro-detalle__nota">
            Mensualidad configurada: <strong>{formatearMoneda(miembro.mensualidad?.valor_mensualidad || 0)}</strong>
            {!!miembro.exento_pago && <> <StatusBadge texto="Exento" variant="info" /></>}
          </p>

          <SubList titulo="Historial de pagos" vacio={!pagos.length} vacioTexto="Sin pagos registrados.">
            {pagos.length > 0 && (
              <table className="miembro-detalle__tabla">
                <thead><tr><th>Mes</th><th>Valor</th><th>Fecha de pago</th><th>Soporte</th><th>Observaciones</th></tr></thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id}>
                      <td>{NOMBRES_MES[p.mes_correspondiente - 1]} {p.anio_correspondiente}</td>
                      <td>{formatearMoneda(p.valor)}</td>
                      <td>{formatearFecha(p.fecha_pago)}</td>
                      <td>{p.soporte_url ? <a href={urlArchivo(p.soporte_url)} target="_blank" rel="noopener noreferrer">Ver</a> : '—'}</td>
                      <td>{p.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SubList>

          <SubList titulo="Registrar pago">
            <form onSubmit={guardarPago} className="miembro-detalle__form-pago">
              <div className="miembros__grid">
                <FormField label="Valor" type="number" min="0" step="100" name="valor" value={formPago.valor} onChange={(e) => setFormPago((p) => ({ ...p, valor: e.target.value }))} required />
                <FormField label="Fecha de pago" type="date" name="fecha_pago" value={formPago.fecha_pago} onChange={(e) => setFormPago((p) => ({ ...p, fecha_pago: e.target.value }))} required />
                <FormField label="Mes" type="select" name="mes_correspondiente" value={formPago.mes_correspondiente} onChange={(e) => setFormPago((p) => ({ ...p, mes_correspondiente: e.target.value }))} options={NOMBRES_MES.map((m, i) => ({ value: String(i + 1), label: m }))} />
                <FormField label="Año" type="number" name="anio_correspondiente" value={formPago.anio_correspondiente} onChange={(e) => setFormPago((p) => ({ ...p, anio_correspondiente: e.target.value }))} />
              </div>
              <FormField label="Observaciones" type="textarea" name="observaciones" value={formPago.observaciones} onChange={(e) => setFormPago((p) => ({ ...p, observaciones: e.target.value }))} />
              <UploadField label="Soporte (opcional)" accept="image/png,image/jpeg,image/webp,application/pdf" onFileSelected={setArchivoSoporte} helpText="Imagen o PDF — máx. 5MB" />
              <Button type="submit" loading={guardandoPago}>Registrar pago</Button>
            </form>
          </SubList>
        </div>
      )}

      {/* ── Pestaña Entregas ── */}
      {pestana === 'entregas' && (
        <div className="miembro-pag__tab-body">
          {cargandoEntregas
            ? <p className="miembros__cargando">Cargando entregas...</p>
            : entregas.length === 0
              ? <p className="miembro-pag__vacio">Sin entregas de plan registradas.</p>
              : (
                <table className="miembro-detalle__tabla">
                  <thead>
                    <tr><th>Fecha</th><th>Ítem</th><th>Tipo</th><th>Plan / Nivel</th><th>Calificación</th><th>Retroalimentación</th></tr>
                  </thead>
                  <tbody>
                    {entregas.map((e) => (
                      <tr key={e.id}>
                        <td>{formatearFecha(e.fecha_entrega)}</td>
                        <td>{e.item_titulo}</td>
                        <td><span style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--color-secondary)' }}>{e.item_tipo}</span></td>
                        <td>{e.plan_nombre}<br /><small style={{ color: 'var(--color-secondary)' }}>{e.nivel_nombre}</small></td>
                        <td>{badgeCalif(e)}</td>
                        <td style={{ maxWidth: 200 }}>{e.retroalimentacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      )}

      {/* ── Pestaña Auditoría ── */}
      {pestana === 'auditoria' && (
        <div className="miembro-pag__tab-body">
          <AuditLog registros={auditoria} cargando={cargandoAuditoria} />
        </div>
      )}

      {/* ── Diálogos ── */}
      <ConfirmDialog
        abierto={!!accesoAccion}
        titulo={accesoAccion === 'conceder' ? 'Conceder acceso al portal' : 'Remover acceso al portal'}
        mensaje={accesoAccion === 'conceder'
          ? `Se creará una cuenta para ${miembro?.nombres_completos}. La contraseña temporal es su número de documento.`
          : `${miembro?.nombres_completos} perderá acceso al portal.`}
        onConfirmar={() => handleAccesoPortal(accesoAccion)}
        onCancelar={() => setAccesoAccion(null)}
        textoConfirmar={accesoAccion === 'conceder' ? 'Conceder' : 'Remover'}
        cargando={gestionandoAcceso}
      />
      <ConfirmDialog
        abierto={!!confirmQuitarNivel}
        titulo="Quitar nivel"
        mensaje={`¿Seguro que deseas quitar "${confirmQuitarNivel?.nivel_nombre}" de este miembro?`}
        onConfirmar={confirmarQuitarNivel}
        onCancelar={() => setConfirmQuitarNivel(null)}
        textoConfirmar="Quitar"
      />
      <ConfirmDialog
        abierto={!!confirmEliminarContacto}
        titulo="Eliminar contacto"
        mensaje={`¿Seguro que deseas eliminar el contacto "${confirmEliminarContacto?.nombre}"?`}
        onConfirmar={confirmarEliminarContacto}
        onCancelar={() => setConfirmEliminarContacto(null)}
        textoConfirmar="Eliminar"
      />
    </div>
  );
}
