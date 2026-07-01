import { useState, useEffect, useCallback } from 'react';
import {
  listarAsistenciasConAusentes,
  obtenerAsistencia,
  obtenerAuditoriaAsistencia,
  anularAsistencia,
  editarAsistencia,
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

const FILTROS_VACIOS = { fecha_desde: '', fecha_hasta: '', nivel_id: '', miembro_id: '', estado: '' };

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

  return (
    <div className="asistencias">
      <div className="asistencias__header">
        <div>
          <h1>Asistencias</h1>
          <p className="asistencias__descripcion">
            Registros generados desde el portal público de autoregistro. Los miembros inscritos que no registraron asistencia aparecen como "Ausente".
          </p>
        </div>
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
