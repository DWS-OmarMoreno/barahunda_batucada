import { useState, useEffect, useCallback } from 'react';
import {
  obtenerMiembro,
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
} from '../../services/miembros.service';
import { listarNiveles } from '../../services/niveles.service';
import { listarInstrumentos } from '../../services/instrumentos.service';
import Modal from '../../components/ui/Modal';
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
  { clave: 'personal', titulo: 'Información personal' },
  { clave: 'medica', titulo: 'Información médica' },
  { clave: 'niveles', titulo: 'Niveles' },
  { clave: 'contactos', titulo: 'Contactos de emergencia' },
  { clave: 'pagos', titulo: 'Pagos' },
  { clave: 'auditoria', titulo: 'Auditoría' },
];

const NIVEL_VACIO = { nivel_id: '', instrumento_id: '', progreso: '', fecha_inicio: '' };
const CONTACTO_VACIO = { nombre: '', parentesco: '', telefono: '' };
const PAGO_VACIO = { valor: '', fecha_pago: '', mes_correspondiente: String(new Date().getMonth() + 1), anio_correspondiente: String(new Date().getFullYear()), observaciones: '' };

export default function MiembroDetalle({ miembroId, onClose, onCambio }) {
  const [pestana, setPestana] = useState('personal');
  const [miembro, setMiembro] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [pagos, setPagos] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(true);

  const [catalogoNiveles, setCatalogoNiveles] = useState([]);
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);

  const [formNivel, setFormNivel] = useState(NIVEL_VACIO);
  const [editandoNivelId, setEditandoNivelId] = useState(null);
  const [formEditarNivel, setFormEditarNivel] = useState({ progreso: '', fecha_inicio: '', instrumento_id: '' });
  const [confirmQuitarNivel, setConfirmQuitarNivel] = useState(null);

  const [formContacto, setFormContacto] = useState(CONTACTO_VACIO);
  const [editandoContacto, setEditandoContacto] = useState(null);
  const [confirmEliminarContacto, setConfirmEliminarContacto] = useState(null);

  const [formPago, setFormPago] = useState(PAGO_VACIO);
  const [archivoSoporte, setArchivoSoporte] = useState(null);
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [generandoCorreo, setGenerandoCorreo] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState('');

  const [accesoAccion, setAccesoAccion] = useState(null); // 'conceder' | 'remover'
  const [accesoMensaje, setAccesoMensaje] = useState('');
  const [gestionandoAcceso, setGestionandoAcceso] = useState(false);

  const [error, setError] = useState('');
  const [guardandoSub, setGuardandoSub] = useState(false);

  const cargarMiembro = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await obtenerMiembro(miembroId);
      setMiembro(respuesta.data);
    } catch {
      setMiembro(null);
    } finally {
      setCargando(false);
    }
  }, [miembroId]);

  const cargarPagos = useCallback(async () => {
    try {
      const respuesta = await listarPagosMiembro(miembroId);
      setPagos(respuesta.data);
    } catch {
      setPagos([]);
    }
  }, [miembroId]);

  const cargarAuditoria = useCallback(async () => {
    setCargandoAuditoria(true);
    try {
      const respuesta = await obtenerAuditoriaMiembro(miembroId);
      setAuditoria(respuesta.data);
    } catch {
      setAuditoria([]);
    } finally {
      setCargandoAuditoria(false);
    }
  }, [miembroId]);

  useEffect(() => {
    cargarMiembro();
    cargarPagos();
    cargarAuditoria();
    listarNiveles({ limit: 100 }).then((r) => setCatalogoNiveles(r.data)).catch(() => setCatalogoNiveles([]));
    listarInstrumentos().then((r) => setCatalogoInstrumentos(r.data)).catch(() => setCatalogoInstrumentos([]));
  }, [cargarMiembro, cargarPagos, cargarAuditoria]);

  function notificarCambio() {
    cargarMiembro();
    cargarAuditoria();
    onCambio?.();
  }

  // ---------- Acceso al portal ----------

  async function handleAccesoPortal(accion) {
    setGestionandoAcceso(true);
    setAccesoMensaje('');
    try {
      if (accion === 'conceder') {
        const respuesta = await concederAccesoPortal(miembroId);
        setAccesoMensaje(`Acceso concedido. Email: ${respuesta.data.email} · Contraseña temporal: ${respuesta.data.password_temporal}`);
      } else {
        await removerAccesoPortal(miembroId);
        setAccesoMensaje('Acceso al portal removido.');
      }
      cargarMiembro();
      onCambio?.();
    } catch (err) {
      setAccesoMensaje(err.response?.data?.message || 'No se pudo procesar la solicitud');
    } finally {
      setGestionandoAcceso(false);
      setAccesoAccion(null);
    }
  }

  // ---------- Correo institucional ----------

  async function handleGenerarCorreo() {
    setGenerandoCorreo(true);
    setErrorCorreo('');
    try {
      const respuesta = await generarCorreoMiembro(miembroId);
      // Actualizar el miembro en estado local para reflejar el correo generado
      setMiembro((m) => ({ ...m, correo_institucional: respuesta.data?.correo_institucional }));
      onCambio?.();
    } catch (err) {
      setErrorCorreo(err.response?.data?.message || 'No se pudo generar el correo institucional');
    } finally {
      setGenerandoCorreo(false);
    }
  }

  // ---------- Niveles ----------

  async function agregarNivel(e) {
    e.preventDefault();
    if (!formNivel.nivel_id || !formNivel.instrumento_id) {
      setError('Selecciona un nivel y un instrumento');
      return;
    }
    setGuardandoSub(true);
    setError('');
    try {
      await agregarNivelMiembro(miembroId, formNivel);
      setFormNivel(NIVEL_VACIO);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo asignar el nivel');
    } finally {
      setGuardandoSub(false);
    }
  }

  function abrirEditarNivel(registro) {
    setEditandoNivelId(registro.id);
    setFormEditarNivel({
      progreso: registro.progreso || '',
      fecha_inicio: registro.fecha_inicio ? String(registro.fecha_inicio).slice(0, 10) : '',
      instrumento_id: registro.instrumento_id,
    });
  }

  async function guardarEditarNivel() {
    setGuardandoSub(true);
    try {
      await actualizarNivelMiembro(miembroId, editandoNivelId, formEditarNivel);
      setEditandoNivelId(null);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el progreso');
    } finally {
      setGuardandoSub(false);
    }
  }

  async function confirmarQuitarNivel() {
    if (!confirmQuitarNivel) return;
    try {
      await quitarNivelMiembro(miembroId, confirmQuitarNivel.id);
      setConfirmQuitarNivel(null);
      notificarCambio();
    } catch {
      setConfirmQuitarNivel(null);
    }
  }

  // ---------- Contactos ----------

  async function agregarContacto(e) {
    e.preventDefault();
    if (!formContacto.nombre || !formContacto.telefono) {
      setError('Nombre y teléfono son obligatorios');
      return;
    }
    setGuardandoSub(true);
    setError('');
    try {
      await agregarContactoMiembro(miembroId, formContacto);
      setFormContacto(CONTACTO_VACIO);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo agregar el contacto');
    } finally {
      setGuardandoSub(false);
    }
  }

  function abrirEditarContacto(contacto) {
    setEditandoContacto({ ...contacto });
  }

  async function guardarEditarContacto() {
    setGuardandoSub(true);
    try {
      await actualizarContactoMiembro(miembroId, editandoContacto.id, editandoContacto);
      setEditandoContacto(null);
      notificarCambio();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el contacto');
    } finally {
      setGuardandoSub(false);
    }
  }

  async function confirmarEliminarContacto() {
    if (!confirmEliminarContacto) return;
    try {
      await eliminarContactoMiembro(miembroId, confirmEliminarContacto.id);
      setConfirmEliminarContacto(null);
      notificarCambio();
    } catch {
      setConfirmEliminarContacto(null);
    }
  }

  // ---------- Pagos ----------

  async function guardarPago(e) {
    e.preventDefault();
    if (!formPago.valor || !formPago.fecha_pago) {
      setError('El valor y la fecha de pago son obligatorios');
      return;
    }
    setGuardandoPago(true);
    setError('');
    try {
      await registrarPagoMiembro(miembroId, formPago, archivoSoporte);
      setFormPago(PAGO_VACIO);
      setArchivoSoporte(null);
      cargarPagos();
      cargarAuditoria();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el pago');
    } finally {
      setGuardandoPago(false);
    }
  }

  return (
    <Modal abierto titulo={cargando ? 'Cargando...' : (miembro?.nombres_completos || 'Miembro')} onClose={onClose} ancho="lg">
      {!cargando && miembro && (
        <div className="miembro-detalle">
          <Tabs pestanas={PESTANAS} activa={pestana} onChange={setPestana} />

          {error && <p className="miembros__error">{error}</p>}

          {pestana === 'personal' && (
            <div className="miembro-detalle__campos">
              <div><span>Documento</span><strong>{miembro.tipo_documento} {miembro.numero_documento}</strong></div>
              <div><span>WhatsApp</span><strong>{miembro.whatsapp || '—'}</strong></div>
              <div><span>Email</span><strong>{miembro.email || '—'}</strong></div>
              <div>
                <span>Correo institucional</span>
                <strong>
                  {miembro.correo_institucional ? (
                    miembro.correo_institucional
                  ) : (
                    <span className="miembro-detalle__correo-vacio">
                      <em style={{ color: 'var(--color-secondary)', fontStyle: 'normal' }}>Sin asignar</em>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleGenerarCorreo}
                        loading={generandoCorreo}
                        style={{ marginLeft: '10px', padding: '2px 10px', fontSize: '12px' }}
                      >
                        Generar correo
                      </Button>
                    </span>
                  )}
                </strong>
                {errorCorreo && (
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-danger)', marginTop: '4px' }}>
                    {errorCorreo}
                  </span>
                )}
              </div>
              <div><span>Fecha de nacimiento</span><strong>{formatearFecha(miembro.fecha_nacimiento)}</strong></div>
              <div><span>Dirección</span><strong>{miembro.direccion || '—'}</strong></div>
              <div><span>Estado</span><strong>{miembro.activo ? 'Activo' : 'Inactivo'}</strong></div>
              <div>
                <span>Exento de pago</span>
                <strong>
                  {miembro.exento_pago
                    ? <StatusBadge texto="Exento" variant="info" />
                    : 'No'}
                </strong>
              </div>
              <div>
                <span>Asistencia obligatoria</span>
                <strong>
                  {miembro.asistencia_obligatoria_efectiva
                    ? <StatusBadge texto="Obligatoria" variant="warning" />
                    : 'No'}
                  {miembro.dos_meses_pendientes && !miembro.asistencia_obligatoria && (
                    <span className="miembro-detalle__nota-inline"> (2+ meses sin pagar)</span>
                  )}
                </strong>
              </div>

              {/* Acceso al portal */}
              <div className="miembro-detalle__acceso">
                <span>Acceso al portal</span>
                <div className="miembro-detalle__acceso-body">
                  {miembro.usuario_id ? (
                    <>
                      <StatusBadge
                        texto={miembro.usuario_activo ? 'Activo' : 'Inactivo'}
                        variant={miembro.usuario_activo ? 'success' : 'secondary'}
                      />
                      <span className="miembro-detalle__acceso-email">{miembro.usuario_email}</span>
                      {miembro.usuario_activo ? (
                        <Button
                          variant="danger"
                          onClick={() => setAccesoAccion('remover')}
                          loading={gestionandoAcceso}
                          style={{ padding: '2px 10px', fontSize: '12px' }}
                        >
                          Remover acceso
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => setAccesoAccion('conceder')}
                          loading={gestionandoAcceso}
                          style={{ padding: '2px 10px', fontSize: '12px' }}
                        >
                          Reactivar acceso
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <StatusBadge texto="Sin acceso" variant="secondary" />
                      <Button
                        variant="secondary"
                        onClick={() => setAccesoAccion('conceder')}
                        loading={gestionandoAcceso}
                        style={{ marginLeft: '8px', padding: '2px 10px', fontSize: '12px' }}
                      >
                        Conceder acceso
                      </Button>
                    </>
                  )}
                </div>
                {accesoMensaje && (
                  <p className="miembro-detalle__acceso-msg">{accesoMensaje}</p>
                )}
              </div>
            </div>
          )}

          <ConfirmDialog
            abierto={!!accesoAccion}
            titulo={accesoAccion === 'conceder' ? 'Conceder acceso al portal' : 'Remover acceso al portal'}
            mensaje={
              accesoAccion === 'conceder'
                ? `Se creará una cuenta para ${miembro?.nombres_completos} con correo institucional o personal y contraseña temporal igual a su número de cédula.`
                : `${miembro?.nombres_completos} perderá acceso al portal de miembros.`
            }
            onConfirmar={() => handleAccesoPortal(accesoAccion)}
            onCancelar={() => setAccesoAccion(null)}
            textoConfirmar={accesoAccion === 'conceder' ? 'Conceder' : 'Remover'}
            cargando={gestionandoAcceso}
          />

          {pestana === 'medica' && (
            <div className="miembro-detalle__campos">
              <div><span>Tipo de sangre</span><strong>{miembro.tipo_sangre || '—'}</strong></div>
              <div><span>EPS</span><strong>{miembro.eps || '—'}</strong></div>
              <div><span>¿Padece enfermedad?</span><strong>{miembro.padece_enfermedad ? `Sí — ${miembro.enfermedad_cual || 'sin especificar'}` : 'No'}</strong></div>
              <div><span>¿Sufre alergias?</span><strong>{miembro.sufre_alergia ? `Sí — ${miembro.alergia_cual || 'sin especificar'}` : 'No'}</strong></div>
              <div><span>¿Toma medicamentos?</span><strong>{miembro.toma_medicamentos ? `Sí — ${miembro.medicamentos_cuales || 'sin especificar'}` : 'No'}</strong></div>
              <div className="miembro-detalle__campo-ancho"><span>Restricciones físicas</span><strong>{miembro.restricciones_fisicas || '—'}</strong></div>
            </div>
          )}

          {pestana === 'niveles' && (
            <div className="miembro-detalle__seccion">
              <SubList titulo="Niveles asignados" vacio={!miembro.niveles?.length} vacioTexto="Este miembro no tiene niveles asignados.">
                {miembro.niveles?.length > 0 && (
                  <table className="miembro-detalle__tabla">
                    <thead>
                      <tr><th>Nivel</th><th>Instrumento</th><th>Progreso</th><th>Inicio</th><th>Estado</th><th></th></tr>
                    </thead>
                    <tbody>
                      {miembro.niveles.map((n) => (
                        <tr key={n.id}>
                          <td>{n.nivel_nombre}</td>
                          <td>
                            {editandoNivelId === n.id ? (
                              <select value={formEditarNivel.instrumento_id} onChange={(e) => setFormEditarNivel((p) => ({ ...p, instrumento_id: e.target.value }))} className="form-field__input">
                                {catalogoInstrumentos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                              </select>
                            ) : n.instrumento_nombre}
                          </td>
                          <td>
                            {editandoNivelId === n.id ? (
                              <input className="form-field__input" value={formEditarNivel.progreso} onChange={(e) => setFormEditarNivel((p) => ({ ...p, progreso: e.target.value }))} />
                            ) : (n.progreso || '—')}
                          </td>
                          <td>
                            {editandoNivelId === n.id ? (
                              <input type="date" className="form-field__input" value={formEditarNivel.fecha_inicio} onChange={(e) => setFormEditarNivel((p) => ({ ...p, fecha_inicio: e.target.value }))} />
                            ) : formatearFecha(n.fecha_inicio)}
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

          {pestana === 'contactos' && (
            <div className="miembro-detalle__seccion">
              <SubList titulo="Contactos de emergencia" vacio={!miembro.contactos?.length} vacioTexto="No hay contactos registrados.">
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
                                <Button variant="secondary" onClick={() => abrirEditarContacto(c)}>Editar</Button>
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

          {pestana === 'pagos' && (
            <div className="miembro-detalle__seccion">
              <p className="miembro-detalle__nota">
                Mensualidad configurada: <strong>{formatearMoneda(miembro.mensualidad?.valor_mensualidad || 0)}</strong>
                {!!miembro.exento_pago && (
                  <>
                    {' '}
                    <StatusBadge texto="Exento de pago" variant="info" />
                  </>
                )}
              </p>

              <SubList titulo="Historial de pagos" vacio={!pagos.length} vacioTexto="Este miembro no tiene pagos registrados.">
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
                    <FormField
                      label="Mes correspondiente"
                      type="select"
                      name="mes_correspondiente"
                      value={formPago.mes_correspondiente}
                      onChange={(e) => setFormPago((p) => ({ ...p, mes_correspondiente: e.target.value }))}
                      options={NOMBRES_MES.map((m, i) => ({ value: String(i + 1), label: m }))}
                    />
                    <FormField label="Año correspondiente" type="number" name="anio_correspondiente" value={formPago.anio_correspondiente} onChange={(e) => setFormPago((p) => ({ ...p, anio_correspondiente: e.target.value }))} />
                  </div>
                  <FormField label="Observaciones" type="textarea" name="observaciones" value={formPago.observaciones} onChange={(e) => setFormPago((p) => ({ ...p, observaciones: e.target.value }))} />
                  <UploadField
                    label="Soporte de pago (opcional)"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onFileSelected={setArchivoSoporte}
                    helpText="Imagen o PDF — máximo 5MB"
                  />
                  <Button type="submit" loading={guardandoPago}>Registrar pago</Button>
                </form>
              </SubList>
            </div>
          )}

          {pestana === 'auditoria' && (
            <AuditLog registros={auditoria} cargando={cargandoAuditoria} />
          )}
        </div>
      )}

      <ConfirmDialog
        abierto={!!confirmQuitarNivel}
        titulo="Quitar nivel"
        mensaje={`¿Seguro que deseas quitar el nivel "${confirmQuitarNivel?.nivel_nombre}" de este miembro?`}
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
    </Modal>
  );
}
