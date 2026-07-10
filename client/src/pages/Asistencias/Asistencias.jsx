import { useState, useEffect, useCallback } from 'react';
import {
  listarAsistenciasConAusentes,
  obtenerAsistencia,
  obtenerAuditoriaAsistencia,
  anularAsistencia,
  editarAsistencia,
  obtenerHorariosDisponibles,
  registrarAsistenciaManual,
} from '../../services/asistencias.service';
import { listarNiveles } from '../../services/niveles.service';
import { listarMiembros } from '../../services/miembros.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import SubList from '../../components/ui/SubList';
import AuditLog from '../../components/ui/AuditLog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import { formatearFecha, formatearHora } from '../../utils/formato';
import ActionsMenu from '../../components/ui/ActionsMenu';
import './Asistencias.css';

const ETIQUETAS_ESTADO = { A_TIEMPO: 'A tiempo', TARDE: 'Tarde', AUSENTE: 'Ausente' };
const VARIANTES_ESTADO = { A_TIEMPO: 'success', TARDE: 'warning', AUSENTE: 'danger' };

function primerDiaMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function ultimoDiaMes() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const FILTROS_VACIOS = { fecha_desde: primerDiaMes(), fecha_hasta: ultimoDiaMes(), nivel_id: '', miembro_id: '', estado: '' };

export default function Asistencias() {
  const [asistencias, setAsistencias] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [niveles, setNiveles] = useState([]);
  const [miembros, setMiembros] = useState([]);

  const [detalle, setDetalle] = useState(null);
  const [auditoria, setAuditoria] = useState([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [modalAnular, setModalAnular] = useState(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [guardandoAnular, setGuardandoAnular] = useState(false);
  const [error, setError] = useState('');

  const [modalEditar, setModalEditar] = useState(null);
  const [formEditar, setFormEditar] = useState({ estado: '', hora: '', motivo: '' });
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorEditar, setErrorEditar] = useState('');

  const hoyCom = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const horaActual = (() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  })();

  const [modalManual, setModalManual] = useState(false);
  const [formManual, setFormManual] = useState({ miembro_id: '', fecha: hoyCom, horario_id: '', hora: horaActual });
  const [horariosManual, setHorariosManual] = useState([]);
  const [cargandoHorariosManual, setCargandoHorariosManual] = useState(false);
  const [guardandoManual, setGuardandoManual] = useState(false);
  const [errorManual, setErrorManual] = useState('');

  // Trae asistencias reales + filas sintéticas "Ausente" para los miembros
  // inscritos que no registraron asistencia en una clase que les
  // correspondía (ver server/utils/calcularAusentes.js). No está paginado
  // por el backend, así que conviene acotar con los filtros de fecha para
  // rangos grandes.
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarAsistenciasConAusentes(filtros);
      setAsistencias(respuesta.data);
    } catch {
      setAsistencias([]);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    listarNiveles({ limit: 100 }).then((r) => setNiveles(r.data)).catch(() => setNiveles([]));
    listarMiembros({ activo: '1', limit: 500 }).then((r) => setMiembros(r.data)).catch(() => setMiembros([]));
  }, []);

  // Contadores derivados de los mismos datos que se muestran en la tabla
  // (incluyen los ausentes sintéticos), para que coincidan exactamente.
  const contadores = asistencias.reduce(
    (acc, f) => {
      acc[f.estado] = (acc[f.estado] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { A_TIEMPO: 0, TARDE: 0, AUSENTE: 0, total: 0 }
  );

  function actualizarFiltro(campo, valor) {
    setFiltros((p) => ({ ...p, [campo]: valor }));
  }

  async function abrirDetalle(asistencia) {
    if (asistencia.sintetico) return;
    setDetalle(asistencia);
    setCargandoDetalle(true);
    try {
      const [respuestaAsistencia, respuestaAuditoria] = await Promise.all([
        obtenerAsistencia(asistencia.id),
        obtenerAuditoriaAsistencia(asistencia.id),
      ]);
      setDetalle(respuestaAsistencia.data);
      setAuditoria(respuestaAuditoria.data);
    } catch {
      // si falla, se deja el detalle parcial ya cargado desde la tabla
    } finally {
      setCargandoDetalle(false);
    }
  }

  function abrirEditar(asistencia) {
    setModalEditar(asistencia);
    setFormEditar({
      estado: asistencia.estado || 'A_TIEMPO',
      hora: asistencia.hora ? String(asistencia.hora).slice(0, 5) : '',
      motivo: '',
    });
    setErrorEditar('');
  }

  async function guardarEditar(e) {
    e.preventDefault();
    if (!formEditar.motivo.trim()) {
      setErrorEditar('El motivo del cambio es obligatorio');
      return;
    }
    setGuardandoEditar(true);
    setErrorEditar('');
    try {
      await editarAsistencia(modalEditar.id, {
        estado: formEditar.estado,
        hora: formEditar.hora || undefined,
        motivo: formEditar.motivo.trim(),
      });
      setModalEditar(null);
      // Refrescar detalle si está abierto
      if (detalle?.id === modalEditar.id) {
        const [r1, r2] = await Promise.all([
          obtenerAsistencia(modalEditar.id),
          obtenerAuditoriaAsistencia(modalEditar.id),
        ]);
        setDetalle(r1.data);
        setAuditoria(r2.data);
      }
      cargar();
    } catch (err) {
      setErrorEditar(err.response?.data?.message || 'No se pudo editar la asistencia');
    } finally {
      setGuardandoEditar(false);
    }
  }

  function abrirAnular(asistencia) {
    setModalAnular(asistencia);
    setMotivoAnulacion('');
    setError('');
  }

  async function guardarAnular(e) {
    e.preventDefault();
    if (!motivoAnulacion.trim()) {
      setError('El motivo de anulación es obligatorio');
      return;
    }
    setGuardandoAnular(true);
    setError('');
    try {
      await anularAsistencia(modalAnular.id, motivoAnulacion.trim());
      setModalAnular(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo anular la asistencia');
    } finally {
      setGuardandoAnular(false);
    }
  }

  function abrirManual() {
    const d = new Date();
    const fechaHoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setFormManual({ miembro_id: '', fecha: fechaHoy, horario_id: '', hora });
    setHorariosManual([]);
    setErrorManual('');
    setModalManual(true);
  }

  async function cargarHorariosManual(miembroId, fecha) {
    if (!miembroId || !fecha) { setHorariosManual([]); return; }
    setCargandoHorariosManual(true);
    try {
      const r = await obtenerHorariosDisponibles({ miembroId, fecha });
      setHorariosManual(r.data || []);
      setFormManual((p) => ({ ...p, horario_id: '' }));
    } catch {
      setHorariosManual([]);
    } finally {
      setCargandoHorariosManual(false);
    }
  }

  function cambiarCampoManual(campo, valor) {
    setFormManual((p) => {
      const siguiente = { ...p, [campo]: valor };
      if (campo === 'miembro_id' || campo === 'fecha') {
        cargarHorariosManual(siguiente.miembro_id, siguiente.fecha);
      }
      return siguiente;
    });
  }

  async function guardarManual(e) {
    e.preventDefault();
    if (!formManual.miembro_id || !formManual.horario_id || !formManual.fecha || !formManual.hora) {
      setErrorManual('Todos los campos son obligatorios');
      return;
    }
    setGuardandoManual(true);
    setErrorManual('');
    try {
      await registrarAsistenciaManual({
        miembroId: formManual.miembro_id,
        horarioId: formManual.horario_id,
        fecha: formManual.fecha,
        hora: formManual.hora,
      });
      setModalManual(false);
      cargar();
    } catch (err) {
      setErrorManual(err.response?.data?.message || 'No se pudo registrar la asistencia');
    } finally {
      setGuardandoManual(false);
    }
  }

  return (
    <div className="asistencias">
      <div className="asistencias__header">
        <div>
          <h1>Asistencias</h1>
          <p className="asistencias__descripcion">
            Registros generados desde el portal público de autoregistro. Los miembros inscritos que no registraron asistencia aparecen como "Ausente".
          </p>
        </div>
        <Button onClick={abrirManual}>Registrar manual</Button>
      </div>

      <div className="asistencias__indicadores">
        <div className="asistencias__indicador">
          <span className="asistencias__indicador-valor">{contadores.total}</span>
          <span className="asistencias__indicador-etiqueta">Total</span>
        </div>
        <div className="asistencias__indicador asistencias__indicador--success">
          <span className="asistencias__indicador-valor">{contadores.A_TIEMPO}</span>
          <span className="asistencias__indicador-etiqueta">A tiempo</span>
        </div>
        <div className="asistencias__indicador asistencias__indicador--warning">
          <span className="asistencias__indicador-valor">{contadores.TARDE}</span>
          <span className="asistencias__indicador-etiqueta">Tarde</span>
        </div>
        <div className="asistencias__indicador asistencias__indicador--danger">
          <span className="asistencias__indicador-valor">{contadores.AUSENTE}</span>
          <span className="asistencias__indicador-etiqueta">Ausente</span>
        </div>
      </div>

      <DataTable
        cargando={cargando}
        datos={asistencias}
        claveFila={(f) => (f.sintetico ? `ausente-${f.miembro_id}-${f.horario_id}-${f.fecha}` : f.id)}
        filtros={
          <>
            <input
              type="date"
              className="asistencias__select-filtro"
              value={filtros.fecha_desde}
              onChange={(e) => actualizarFiltro('fecha_desde', e.target.value)}
              title="Desde"
            />
            <input
              type="date"
              className="asistencias__select-filtro"
              value={filtros.fecha_hasta}
              onChange={(e) => actualizarFiltro('fecha_hasta', e.target.value)}
              title="Hasta"
            />
            <select className="asistencias__select-filtro" value={filtros.nivel_id} onChange={(e) => actualizarFiltro('nivel_id', e.target.value)}>
              <option value="">Todos los niveles</option>
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
            <select className="asistencias__select-filtro" value={filtros.miembro_id} onChange={(e) => actualizarFiltro('miembro_id', e.target.value)}>
              <option value="">Todos los miembros</option>
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>{m.nombres_completos}</option>
              ))}
            </select>
            <select className="asistencias__select-filtro" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="A_TIEMPO">A tiempo</option>
              <option value="TARDE">Tarde</option>
              <option value="AUSENTE">Ausente</option>
            </select>
          </>
        }
        columnas={[
          { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha) },
          { clave: 'hora', titulo: 'Hora', render: (f) => formatearHora(f.hora) },
          { clave: 'miembro_nombre', titulo: 'Miembro' },
          { clave: 'nivel_nombre', titulo: 'Nivel' },
          { clave: 'minutos_retraso', titulo: 'Min. retraso', render: (f) => (f.minutos_retraso > 0 ? f.minutos_retraso : '—') },
          { clave: 'estado', titulo: 'Estado', render: (f) => <StatusBadge texto={ETIQUETAS_ESTADO[f.estado] || f.estado} variant={VARIANTES_ESTADO[f.estado] || 'secondary'} /> },
        ]}
        acciones={(fila) => (
          fila.sintetico ? (
            <span className="asistencias__sin-registro">Sin registro</span>
          ) : (
            <ActionsMenu acciones={[
              { etiqueta: 'Ver detalle', onClick: () => abrirDetalle(fila) },
              { etiqueta: 'Editar', onClick: () => abrirEditar(fila) },
              { etiqueta: 'Anular', onClick: () => abrirAnular(fila), variant: 'danger' },
            ]} />
          )
        )}
        vacioTexto="No hay asistencias registradas con estos filtros."
      />

      <Modal
        abierto={!!detalle}
        titulo="Detalle de asistencia"
        onClose={() => setDetalle(null)}
        ancho="lg"
      >
        {detalle && (
          <div className="asistencias__detalle">
            <div className="asistencias__detalle-campos">
              <div><span>Miembro</span><strong>{detalle.miembro_nombre}</strong></div>
              <div><span>Documento</span><strong>{detalle.numero_documento}</strong></div>
              <div><span>Nivel</span><strong>{detalle.nivel_nombre}</strong></div>
              <div><span>Fecha</span><strong>{formatearFecha(detalle.fecha)}</strong></div>
              <div><span>Hora</span><strong>{formatearHora(detalle.hora)}</strong></div>
              <div><span>Minutos de retraso</span><strong>{detalle.minutos_retraso || 0}</strong></div>
              <div>
                <span>Estado</span>
                <StatusBadge texto={ETIQUETAS_ESTADO[detalle.estado] || detalle.estado} variant={VARIANTES_ESTADO[detalle.estado] || 'secondary'} />
              </div>
            </div>

            <SubList titulo="Auditoría">
              <AuditLog registros={auditoria} cargando={cargandoDetalle} />
            </SubList>
          </div>
        )}
      </Modal>

      <Modal
        abierto={!!modalAnular}
        titulo="Anular asistencia"
        onClose={() => setModalAnular(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAnular(null)}>Cancelar</Button>
            <Button variant="danger" onClick={guardarAnular} loading={guardandoAnular}>Anular</Button>
          </>
        }
      >
        {modalAnular && (
          <form onSubmit={guardarAnular} className="asistencias__form-anular">
            <p>{modalAnular.miembro_nombre} — {formatearFecha(modalAnular.fecha)} {formatearHora(modalAnular.hora)}</p>
            <p className="asistencias__nota">
              Esta asistencia se excluirá de los reportes. Si generó una multa por tardanza pendiente, se condonará automáticamente con el mismo motivo.
            </p>
            <FormField
              label="Motivo de anulación"
              type="textarea"
              name="motivo_anulacion"
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              required
            />
            {error && <p className="asistencias__error">{error}</p>}
          </form>
        )}
      </Modal>
      <Modal
        abierto={modalManual}
        titulo="Registrar asistencia manual"
        onClose={() => setModalManual(false)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalManual(false)}>Cancelar</Button>
            <Button onClick={guardarManual} loading={guardandoManual}>Registrar</Button>
          </>
        }
      >
        <form onSubmit={guardarManual} className="asistencias__form-anular">
          <FormField
            label="Miembro"
            type="select"
            name="miembro_id"
            value={formManual.miembro_id}
            onChange={(e) => cambiarCampoManual('miembro_id', e.target.value)}
            options={[
              { value: '', label: 'Selecciona un miembro' },
              ...miembros.map((m) => ({ value: String(m.id), label: m.nombres_completos })),
            ]}
            required
          />
          <FormField
            label="Fecha"
            type="date"
            name="fecha"
            value={formManual.fecha}
            onChange={(e) => cambiarCampoManual('fecha', e.target.value)}
            required
          />
          <FormField
            label={cargandoHorariosManual ? 'Horario (cargando...)' : 'Horario'}
            type="select"
            name="horario_id"
            value={formManual.horario_id}
            onChange={(e) => setFormManual((p) => ({ ...p, horario_id: e.target.value }))}
            options={[
              { value: '', label: horariosManual.length === 0 && !cargandoHorariosManual && formManual.miembro_id ? 'Sin horarios para esa fecha' : 'Selecciona un horario' },
              ...horariosManual.map((h) => ({
                value: String(h.id),
                label: `${h.nivel_nombre} — ${h.dia_semana} ${h.hora_inicio?.slice(0, 5)}–${h.hora_fin?.slice(0, 5)}`,
              })),
            ]}
            disabled={horariosManual.length === 0 || cargandoHorariosManual}
            required
          />
          <FormField
            label="Hora de llegada"
            type="time"
            name="hora"
            value={formManual.hora}
            onChange={(e) => setFormManual((p) => ({ ...p, hora: e.target.value }))}
            required
          />
          <p className="asistencias__nota">El estado (A tiempo / Tarde) se calculará automáticamente según la tolerancia del horario.</p>
          {errorManual && <p className="asistencias__error">{errorManual}</p>}
        </form>
      </Modal>

      <Modal
        abierto={!!modalEditar}
        titulo="Editar asistencia"
        onClose={() => setModalEditar(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalEditar(null)}>Cancelar</Button>
            <Button onClick={guardarEditar} loading={guardandoEditar}>Guardar cambios</Button>
          </>
        }
      >
        {modalEditar && (
          <form onSubmit={guardarEditar} className="asistencias__form-anular">
            <p><strong>{modalEditar.miembro_nombre}</strong> — {formatearFecha(modalEditar.fecha)} {formatearHora(modalEditar.hora)}</p>
            <p className="asistencias__nota">
              El cambio quedará registrado en la auditoría de esta asistencia con tu usuario y el motivo indicado.
            </p>
            <FormField
              label="Nuevo estado"
              type="select"
              name="estado"
              value={formEditar.estado}
              onChange={(e) => setFormEditar((p) => ({ ...p, estado: e.target.value }))}
              options={[
                { value: 'A_TIEMPO', label: 'A tiempo' },
                { value: 'TARDE', label: 'Tarde' },
                { value: 'AUSENTE', label: 'Ausente' },
              ]}
            />
            <FormField
              label="Hora (opcional, formato HH:MM)"
              type="time"
              name="hora"
              value={formEditar.hora}
              onChange={(e) => setFormEditar((p) => ({ ...p, hora: e.target.value }))}
              helpText="Deja vacío para conservar la hora original."
            />
            <FormField
              label="Motivo del cambio"
              type="textarea"
              name="motivo"
              value={formEditar.motivo}
              onChange={(e) => setFormEditar((p) => ({ ...p, motivo: e.target.value }))}
              required
            />
            {errorEditar && <p className="asistencias__error">{errorEditar}</p>}
          </form>
        )}
      </Modal>
    </div>
  );
}
