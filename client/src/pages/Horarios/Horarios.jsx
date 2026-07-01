import { useState, useEffect, useCallback } from 'react';
import {
  listarHorarios,
  crearHorario,
  actualizarHorario,
  toggleHorario,
  eliminarHorario,
  obtenerAuditoriaHorario,
  obtenerQrHorario,
} from '../../services/horarios.service';
import { listarNiveles } from '../../services/niveles.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import AuditLog from '../../components/ui/AuditLog';
import ActionsMenu from '../../components/ui/ActionsMenu';
import { ETIQUETAS_DIA_SEMANA, formatearHora } from '../../utils/formato';
import './Horarios.css';

const DIAS = Object.keys(ETIQUETAS_DIA_SEMANA);

const FORM_VACIO = { nivel_id: '', dia_semana: 'LUNES', hora_inicio: '', hora_fin: '', tolerancia_minutos: 10 };

// Cada cuánto se vuelve a pedir el QR mientras el modal está abierto, para
// que siempre se muestre el token vigente (el backend lo rota cada pocos
// minutos — ver server/utils/asistenciaToken.js). No hace falta sincronizar
// con el intervalo exacto: refrescar cada 20s es suficiente margen.
const INTERVALO_REFRESCO_QR_MS = 20000;

export default function Horarios() {
  const [horarios, setHorarios] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroNivel, setFiltroNivel] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [confirmToggle, setConfirmToggle] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState('');
  const [detalleAuditoria, setDetalleAuditoria] = useState(null);
  const [auditoria, setAuditoria] = useState([]);

  const [modalQr, setModalQr] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [cargandoQr, setCargandoQr] = useState(false);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarHorarios({ nivel_id: filtroNivel || undefined, limit: 100 });
      setHorarios(respuesta.data);
    } catch {
      setHorarios([]);
    } finally {
      setCargando(false);
    }
  }, [filtroNivel]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    listarNiveles({ limit: 100, activo: '1' }).then((r) => setNiveles(r.data)).catch(() => setNiveles([]));
  }, []);

  // Mientras el modal de QR está abierto, refresca el token periódicamente
  // para que el código mostrado en pantalla nunca quede vencido.
  useEffect(() => {
    if (!modalQr) return undefined;
    const intervalo = setInterval(async () => {
      try {
        const respuesta = await obtenerQrHorario(modalQr.id);
        setQrData(respuesta.data);
      } catch {
        // si falla el refresco, se deja el último QR visible hasta el siguiente intento
      }
    }, INTERVALO_REFRESCO_QR_MS);
    return () => clearInterval(intervalo);
  }, [modalQr]);

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(horario) {
    setEditando(horario);
    setForm({
      nivel_id: horario.nivel_id,
      dia_semana: horario.dia_semana,
      hora_inicio: formatearHora(horario.hora_inicio),
      hora_fin: formatearHora(horario.hora_fin),
      tolerancia_minutos: horario.tolerancia_minutos,
    });
    setError('');
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (editando) {
        await actualizarHorario(editando.id, form);
      } else {
        await crearHorario(form);
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el horario');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarToggle() {
    if (!confirmToggle) return;
    try {
      await toggleHorario(confirmToggle.id);
      setConfirmToggle(null);
      cargar();
    } catch {
      setConfirmToggle(null);
    }
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return;
    setEliminando(true);
    setErrorEliminar('');
    try {
      await eliminarHorario(confirmEliminar.id);
      setConfirmEliminar(null);
      cargar();
    } catch (err) {
      setErrorEliminar(err.response?.data?.message || 'No se pudo eliminar el horario');
      setEliminando(false);
    }
  }

  async function verAuditoria(horario) {
    setDetalleAuditoria(horario);
    try {
      const respuesta = await obtenerAuditoriaHorario(horario.id);
      setAuditoria(respuesta.data);
    } catch {
      setAuditoria([]);
    }
  }

  async function abrirQr(horario) {
    setModalQr(horario);
    setQrData(null);
    setCargandoQr(true);
    setEnlaceCopiado(false);
    try {
      const respuesta = await obtenerQrHorario(horario.id);
      setQrData(respuesta.data);
    } catch {
      setQrData(null);
    } finally {
      setCargandoQr(false);
    }
  }

  async function copiarEnlace() {
    if (!qrData?.url) return;
    try {
      await navigator.clipboard.writeText(qrData.url);
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch {
      // si el navegador bloquea el portapapeles, simplemente no se confirma la copia
    }
  }

  return (
    <div className="horarios">
      <div className="horarios__header">
        <div>
          <h1>Horarios</h1>
          <p className="horarios__descripcion">Horarios de clase por nivel, día y tolerancia de llegada.</p>
        </div>
        <Button onClick={abrirCrear}>+ Nuevo horario</Button>
      </div>

      <DataTable
        cargando={cargando}
        datos={horarios}
        filtros={
          <select className="horarios__select-filtro" value={filtroNivel} onChange={(e) => setFiltroNivel(e.target.value)}>
            <option value="">Todos los niveles</option>
            {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        }
        columnas={[
          { clave: 'nivel_nombre', titulo: 'Nivel' },
          { clave: 'dia_semana', titulo: 'Día', render: (f) => ETIQUETAS_DIA_SEMANA[f.dia_semana] },
          { clave: 'hora_inicio', titulo: 'Inicio', render: (f) => formatearHora(f.hora_inicio) },
          { clave: 'hora_fin', titulo: 'Fin', render: (f) => formatearHora(f.hora_fin) },
          { clave: 'tolerancia_minutos', titulo: 'Tolerancia (min)' },
          { clave: 'activo', titulo: 'Estado', render: (f) => <StatusBadge texto={f.activo ? 'Activo' : 'Inactivo'} variant={f.activo ? 'success' : 'secondary'} /> },
        ]}
        acciones={(fila) => (
          <ActionsMenu acciones={[
            { etiqueta: 'Ver QR', onClick: () => abrirQr(fila), visible: !!fila.activo },
            { etiqueta: 'Auditoría', onClick: () => verAuditoria(fila) },
            { etiqueta: 'Editar', onClick: () => abrirEditar(fila) },
            { etiqueta: fila.activo ? 'Desactivar' : 'Activar', onClick: () => setConfirmToggle(fila), variant: 'danger' },
            { etiqueta: 'Eliminar', onClick: () => { setErrorEliminar(''); setConfirmEliminar(fila); }, variant: 'danger' },
          ]} />
        )}
        vacioTexto="No hay horarios registrados."
      />

      <Modal
        abierto={modalAbierto}
        titulo={editando ? 'Editar horario' : 'Nuevo horario'}
        onClose={() => setModalAbierto(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardar} className="horarios__form">
          <FormField
            label="Nivel"
            type="select"
            name="nivel_id"
            value={form.nivel_id}
            onChange={(e) => setForm((p) => ({ ...p, nivel_id: e.target.value }))}
            options={[{ value: '', label: 'Selecciona un nivel' }, ...niveles.map((n) => ({ value: n.id, label: n.nombre }))]}
            required
          />
          <FormField
            label="Día de la semana"
            type="select"
            name="dia_semana"
            value={form.dia_semana}
            onChange={(e) => setForm((p) => ({ ...p, dia_semana: e.target.value }))}
            options={DIAS.map((d) => ({ value: d, label: ETIQUETAS_DIA_SEMANA[d] }))}
            required
          />
          <FormField
            label="Hora de inicio"
            type="time"
            name="hora_inicio"
            value={form.hora_inicio}
            onChange={(e) => setForm((p) => ({ ...p, hora_inicio: e.target.value }))}
            required
          />
          <FormField
            label="Hora de fin"
            type="time"
            name="hora_fin"
            value={form.hora_fin}
            onChange={(e) => setForm((p) => ({ ...p, hora_fin: e.target.value }))}
            required
          />
          <FormField
            label="Tolerancia (minutos)"
            type="number"
            min="0"
            name="tolerancia_minutos"
            value={form.tolerancia_minutos}
            onChange={(e) => setForm((p) => ({ ...p, tolerancia_minutos: e.target.value }))}
          />
          {error && <p className="horarios__error">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmToggle}
        titulo={confirmToggle?.activo ? 'Desactivar horario' : 'Activar horario'}
        mensaje={`¿Seguro que deseas ${confirmToggle?.activo ? 'desactivar' : 'activar'} este horario?`}
        onConfirmar={confirmarToggle}
        onCancelar={() => setConfirmToggle(null)}
        textoConfirmar={confirmToggle?.activo ? 'Desactivar' : 'Activar'}
      />

      <ConfirmDialog
        abierto={!!confirmEliminar}
        titulo="Eliminar horario"
        mensaje={
          <>
            <p>¿Seguro que deseas eliminar el horario de <strong>{confirmEliminar?.nivel_nombre}</strong> ({confirmEliminar ? ETIQUETAS_DIA_SEMANA[confirmEliminar.dia_semana] : ''})? Esta acción es irreversible.</p>
            {errorEliminar && <p style={{ color: 'var(--color-danger)', marginTop: '8px', fontSize: '13px' }}>{errorEliminar}</p>}
          </>
        }
        onConfirmar={confirmarEliminar}
        onCancelar={() => { setConfirmEliminar(null); setErrorEliminar(''); }}
        textoConfirmar="Eliminar"
        cargando={eliminando}
      />

      <Modal abierto={!!detalleAuditoria} titulo="Auditoría del horario" onClose={() => setDetalleAuditoria(null)} ancho="lg">
        <AuditLog registros={auditoria} />
      </Modal>

      <Modal
        abierto={!!modalQr}
        titulo={modalQr ? `Código QR — ${modalQr.nivel_nombre} (${ETIQUETAS_DIA_SEMANA[modalQr.dia_semana]})` : 'Código QR'}
        onClose={() => { setModalQr(null); setQrData(null); }}
        ancho="sm"
      >
        {cargandoQr && !qrData ? (
          <p>Generando código QR...</p>
        ) : qrData ? (
          <div className="horarios__qr">
            <img src={qrData.qr_data_url} alt="Código QR de asistencia" className="horarios__qr-imagen" />
            <p className="horarios__qr-nota">
              El código se renueva automáticamente cada {Math.round(qrData.intervalo_ms / 60000)} minutos
              para evitar que alguien registre asistencia sin estar presente. Mantén esta ventana abierta
              durante la clase; si la cierras, vuelve a abrirla para ver el código vigente.
            </p>
            <div className="horarios__qr-acciones">
              <a href={qrData.qr_data_url} download={`qr-horario-${modalQr.id}.png`} className="horarios__qr-descargar">
                Descargar QR
              </a>
              <Button variant="secondary" onClick={copiarEnlace}>
                {enlaceCopiado ? 'Enlace copiado ✓' : 'Copiar enlace'}
              </Button>
            </div>
          </div>
        ) : (
          <p className="horarios__error">No se pudo generar el código QR.</p>
        )}
      </Modal>
    </div>
  );
}
