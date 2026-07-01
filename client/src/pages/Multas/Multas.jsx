import { useState, useEffect, useCallback } from 'react';
import {
  listarMultas,
  obtenerResumenMultas,
  crearMulta,
  condonarMulta,
  pagarMulta,
  eliminarMulta,
} from '../../services/multas.service';
import { listarMiembros } from '../../services/miembros.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import { formatearFecha, formatearMoneda } from '../../utils/formato';
import ActionsMenu from '../../components/ui/ActionsMenu';
import './Multas.css';

const ETIQUETAS_ESTADO = { PENDIENTE: 'Pendiente', PAGADA: 'Pagada', CONDONADA: 'Condonada' };
const VARIANTES_ESTADO = { PENDIENTE: 'danger', PAGADA: 'success', CONDONADA: 'secondary' };
const ETIQUETAS_TIPO = { TARDANZA: 'Tardanza', OTRA: 'Otra' };

const FILTROS_VACIOS = { miembro_id: '', estado: '', tipo: '', fecha_desde: '', fecha_hasta: '' };

export default function Multas() {
  const [multas, setMultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ totalPages: 1, total: 0 });

  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [miembros, setMiembros] = useState([]);

  const [resumen, setResumen] = useState({
    total_pendiente: 0,
    total_recaudado: 0,
    total_condonado: 0,
    cantidad_pendientes: 0,
    cantidad_pagadas: 0,
    cantidad_condonadas: 0,
  });

  const [detalle, setDetalle] = useState(null);

  const [modalCondonar, setModalCondonar] = useState(null);
  const [motivoCondonacion, setMotivoCondonacion] = useState('');
  const [guardandoCondonar, setGuardandoCondonar] = useState(false);

  const [modalPagar, setModalPagar] = useState(null);
  const [formPagar, setFormPagar] = useState(null);
  const [guardandoPagar, setGuardandoPagar] = useState(false);

  const [modalCrear, setModalCrear] = useState(false);
  const [formCrear, setFormCrear] = useState({ miembro_id: '', valor: '', fecha_generada: '', tipo: 'OTRA' });
  const [guardandoCrear, setGuardandoCrear] = useState(false);

  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarMultas({ ...filtros, page: pagina, limit: 15 });
      setMultas(respuesta.data);
      setPaginacion(respuesta.pagination || { totalPages: 1, total: respuesta.data.length });
    } catch {
      setMultas([]);
    } finally {
      setCargando(false);
    }
  }, [filtros, pagina]);

  const cargarResumen = useCallback(async () => {
    try {
      const respuesta = await obtenerResumenMultas(filtros);
      setResumen(respuesta.data);
    } catch {
      setResumen({
        total_pendiente: 0,
        total_recaudado: 0,
        total_condonado: 0,
        cantidad_pendientes: 0,
        cantidad_pagadas: 0,
        cantidad_condonadas: 0,
      });
    }
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  useEffect(() => {
    listarMiembros({ activo: '1', limit: 500 }).then((r) => setMiembros(r.data)).catch(() => setMiembros([]));
  }, []);

  function actualizarFiltro(campo, valor) {
    setFiltros((p) => ({ ...p, [campo]: valor }));
    setPagina(1);
  }

  function abrirCondonar(multa) {
    setModalCondonar(multa);
    setMotivoCondonacion('');
    setError('');
  }

  async function guardarCondonar(e) {
    e.preventDefault();
    if (!motivoCondonacion.trim()) {
      setError('El motivo de condonación es obligatorio');
      return;
    }
    setGuardandoCondonar(true);
    setError('');
    try {
      await condonarMulta(modalCondonar.id, motivoCondonacion.trim());
      setModalCondonar(null);
      cargar();
      cargarResumen();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo condonar la multa');
    } finally {
      setGuardandoCondonar(false);
    }
  }

  function abrirPagar(multa) {
    setModalPagar(multa);
    setFormPagar({ valor: String(multa.valor), fecha_pago: '' });
    setError('');
  }

  async function guardarPagar(e) {
    e.preventDefault();
    if (!formPagar.fecha_pago) {
      setError('La fecha de pago es obligatoria');
      return;
    }
    setGuardandoPagar(true);
    setError('');
    try {
      await pagarMulta(modalPagar.id, formPagar);
      setModalPagar(null);
      cargar();
      cargarResumen();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el pago de la multa');
    } finally {
      setGuardandoPagar(false);
    }
  }

  function abrirCrear() {
    setModalCrear(true);
    setFormCrear({ miembro_id: '', valor: '', fecha_generada: '', tipo: 'OTRA' });
    setError('');
  }

  async function guardarCrear(e) {
    e.preventDefault();
    if (!formCrear.miembro_id || !formCrear.valor || !formCrear.fecha_generada) {
      setError('Miembro, valor y fecha son obligatorios');
      return;
    }
    setGuardandoCrear(true);
    setError('');
    try {
      await crearMulta(formCrear);
      setModalCrear(false);
      cargar();
      cargarResumen();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la multa');
    } finally {
      setGuardandoCrear(false);
    }
  }

  async function confirmarEliminar() {
    if (!confirmEliminar) return;
    setEliminando(true);
    try {
      await eliminarMulta(confirmEliminar.id);
      setConfirmEliminar(null);
      cargar();
      cargarResumen();
    } catch {
      setConfirmEliminar(null);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="multas">
      <div className="multas__header">
        <div>
          <h1>Multas</h1>
          <p className="multas__descripcion">Multas por tardanza generadas automáticamente y multas manuales.</p>
        </div>
        <Button onClick={abrirCrear}>Crear multa manual</Button>
      </div>

      <div className="multas__indicadores">
        <div className="multas__indicador multas__indicador--danger">
          <span className="multas__indicador-valor">{formatearMoneda(resumen.total_pendiente)}</span>
          <span className="multas__indicador-etiqueta">Pendiente ({resumen.cantidad_pendientes})</span>
        </div>
        <div className="multas__indicador multas__indicador--success">
          <span className="multas__indicador-valor">{formatearMoneda(resumen.total_recaudado)}</span>
          <span className="multas__indicador-etiqueta">Recaudado ({resumen.cantidad_pagadas})</span>
        </div>
        <div className="multas__indicador">
          <span className="multas__indicador-valor">{formatearMoneda(resumen.total_condonado)}</span>
          <span className="multas__indicador-etiqueta">Condonado ({resumen.cantidad_condonadas})</span>
        </div>
      </div>

      <DataTable
        cargando={cargando}
        datos={multas}
        filtros={
          <>
            <input
              type="date"
              className="multas__select-filtro"
              value={filtros.fecha_desde}
              onChange={(e) => actualizarFiltro('fecha_desde', e.target.value)}
              title="Desde"
            />
            <input
              type="date"
              className="multas__select-filtro"
              value={filtros.fecha_hasta}
              onChange={(e) => actualizarFiltro('fecha_hasta', e.target.value)}
              title="Hasta"
            />
            <select className="multas__select-filtro" value={filtros.miembro_id} onChange={(e) => actualizarFiltro('miembro_id', e.target.value)}>
              <option value="">Todos los miembros</option>
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>{m.nombres_completos}</option>
              ))}
            </select>
            <select className="multas__select-filtro" value={filtros.tipo} onChange={(e) => actualizarFiltro('tipo', e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="TARDANZA">Tardanza</option>
              <option value="OTRA">Otra</option>
            </select>
            <select className="multas__select-filtro" value={filtros.estado} onChange={(e) => actualizarFiltro('estado', e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PAGADA">Pagada</option>
              <option value="CONDONADA">Condonada</option>
            </select>
          </>
        }
        paginacion={{ pagina, totalPaginas: paginacion.totalPages, total: paginacion.total, onCambiarPagina: setPagina }}
        columnas={[
          { clave: 'miembro_nombre', titulo: 'Miembro' },
          { clave: 'numero_documento', titulo: 'Documento' },
          { clave: 'tipo', titulo: 'Tipo', render: (f) => ETIQUETAS_TIPO[f.tipo] || f.tipo },
          { clave: 'valor', titulo: 'Valor', render: (f) => formatearMoneda(f.valor) },
          { clave: 'fecha_generada', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha_generada) },
          { clave: 'estado', titulo: 'Estado', render: (f) => <StatusBadge texto={ETIQUETAS_ESTADO[f.estado] || f.estado} variant={VARIANTES_ESTADO[f.estado] || 'secondary'} /> },
        ]}
        acciones={(fila) => (
          <ActionsMenu acciones={[
            { etiqueta: 'Ver detalle', onClick: () => setDetalle(fila) },
            { etiqueta: 'Marcar Pagada', onClick: () => abrirPagar(fila), visible: fila.estado === 'PENDIENTE' },
            { etiqueta: 'Condonar', onClick: () => abrirCondonar(fila), visible: fila.estado === 'PENDIENTE' },
            { etiqueta: 'Eliminar', onClick: () => setConfirmEliminar(fila), variant: 'danger' },
          ]} />
        )}
        vacioTexto="No hay multas registradas con estos filtros."
      />

      <Modal abierto={!!detalle} titulo="Detalle de multa" onClose={() => setDetalle(null)} ancho="lg">
        {detalle && (
          <div className="multas__detalle-campos">
            <div><span>Miembro</span><strong>{detalle.miembro_nombre}</strong></div>
            <div><span>Documento</span><strong>{detalle.numero_documento}</strong></div>
            <div><span>Tipo</span><strong>{ETIQUETAS_TIPO[detalle.tipo] || detalle.tipo}</strong></div>
            <div><span>Valor</span><strong>{formatearMoneda(detalle.valor)}</strong></div>
            <div><span>Fecha generada</span><strong>{formatearFecha(detalle.fecha_generada)}</strong></div>
            <div><span>Fecha de pago</span><strong>{detalle.fecha_pago ? formatearFecha(detalle.fecha_pago) : '—'}</strong></div>
            {detalle.tipo === 'TARDANZA' && (
              <>
                <div><span>Fecha asistencia</span><strong>{detalle.asistencia_fecha ? formatearFecha(detalle.asistencia_fecha) : '—'}</strong></div>
                <div><span>Minutos de retraso</span><strong>{detalle.asistencia_minutos_retraso ?? '—'}</strong></div>
                <div><span>Nivel</span><strong>{detalle.nivel_nombre || '—'}</strong></div>
              </>
            )}
            <div>
              <span>Estado</span>
              <StatusBadge texto={ETIQUETAS_ESTADO[detalle.estado] || detalle.estado} variant={VARIANTES_ESTADO[detalle.estado] || 'secondary'} />
            </div>
            {detalle.estado === 'CONDONADA' && (
              <div><span>Motivo condonación</span><strong>{detalle.motivo_condonacion}</strong></div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        abierto={!!modalCondonar}
        titulo="Condonar multa"
        onClose={() => setModalCondonar(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalCondonar(null)}>Cancelar</Button>
            <Button onClick={guardarCondonar} loading={guardandoCondonar}>Condonar</Button>
          </>
        }
      >
        {modalCondonar && (
          <form onSubmit={guardarCondonar} className="multas__form">
            <p>{modalCondonar.miembro_nombre} — {formatearMoneda(modalCondonar.valor)}</p>
            <FormField
              label="Motivo de condonación"
              type="textarea"
              name="motivo_condonacion"
              value={motivoCondonacion}
              onChange={(e) => setMotivoCondonacion(e.target.value)}
              required
            />
            {error && <p className="multas__error">{error}</p>}
          </form>
        )}
      </Modal>

      <Modal
        abierto={!!modalPagar}
        titulo="Marcar multa como pagada"
        onClose={() => setModalPagar(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalPagar(null)}>Cancelar</Button>
            <Button onClick={guardarPagar} loading={guardandoPagar}>Registrar pago</Button>
          </>
        }
      >
        {modalPagar && formPagar && (
          <form onSubmit={guardarPagar} className="multas__form">
            <p>{modalPagar.miembro_nombre}</p>
            <FormField label="Valor" type="number" min="0" step="100" name="valor" value={formPagar.valor} onChange={(e) => setFormPagar((p) => ({ ...p, valor: e.target.value }))} required />
            <FormField label="Fecha de pago" type="date" name="fecha_pago" value={formPagar.fecha_pago} onChange={(e) => setFormPagar((p) => ({ ...p, fecha_pago: e.target.value }))} required />
            {error && <p className="multas__error">{error}</p>}
          </form>
        )}
      </Modal>

      <Modal
        abierto={modalCrear}
        titulo="Crear multa manual"
        onClose={() => setModalCrear(false)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalCrear(false)}>Cancelar</Button>
            <Button onClick={guardarCrear} loading={guardandoCrear}>Crear multa</Button>
          </>
        }
      >
        <form onSubmit={guardarCrear} className="multas__form">
          <FormField
            label="Miembro"
            type="select"
            name="miembro_id"
            value={formCrear.miembro_id}
            onChange={(e) => setFormCrear((p) => ({ ...p, miembro_id: e.target.value }))}
            options={[{ value: '', label: 'Seleccione un miembro' }, ...miembros.map((m) => ({ value: m.id, label: m.nombres_completos }))]}
            required
          />
          <FormField label="Valor" type="number" min="0" step="100" name="valor" value={formCrear.valor} onChange={(e) => setFormCrear((p) => ({ ...p, valor: e.target.value }))} required />
          <FormField label="Fecha" type="date" name="fecha_generada" value={formCrear.fecha_generada} onChange={(e) => setFormCrear((p) => ({ ...p, fecha_generada: e.target.value }))} required />
          {error && <p className="multas__error">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmEliminar}
        titulo="Eliminar multa"
        mensaje={
          confirmEliminar
            ? `¿Seguro que deseas eliminar la multa de ${formatearMoneda(confirmEliminar.valor)} de ${confirmEliminar.miembro_nombre}? Esta acción no se puede deshacer.`
            : ''
        }
        onConfirmar={confirmarEliminar}
        onCancelar={() => setConfirmEliminar(null)}
        textoConfirmar="Eliminar"
        cargando={eliminando}
      />
    </div>
  );
}
