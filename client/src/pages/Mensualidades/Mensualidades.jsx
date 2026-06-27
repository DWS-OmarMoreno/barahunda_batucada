import { useState, useEffect, useCallback } from 'react';
import {
  listarEstadoMensualidades,
  obtenerHistorialMensualidad,
  establecerValorMensualidad,
  registrarPagoMensualidad,
  eliminarPagoMensualidad,
} from '../../services/mensualidades.service';
import { obtenerWhatsappRecordatorio } from '../../services/miembros.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import SubList from '../../components/ui/SubList';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import UploadField from '../../components/ui/UploadField';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatearFecha, formatearMoneda, NOMBRES_MES } from '../../utils/formato';
import './Mensualidades.css';

const ETIQUETAS_ESTADO = { PAGADO: 'Pagado', PARCIAL: 'Parcial', PENDIENTE: 'Pendiente', EXENTO: 'Exento' };
const VARIANTES_ESTADO = { PAGADO: 'success', PARCIAL: 'warning', PENDIENTE: 'danger', EXENTO: 'info' };

const AHORA = new Date();

export default function Mensualidades() {
  const [mes, setMes] = useState(AHORA.getMonth() + 1);
  const [anio, setAnio] = useState(AHORA.getFullYear());
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modalValor, setModalValor] = useState(null);
  const [valorEditado, setValorEditado] = useState('');
  const [guardandoValor, setGuardandoValor] = useState(false);

  const [modalPago, setModalPago] = useState(null);
  const [formPago, setFormPago] = useState(null);
  const [archivoSoporte, setArchivoSoporte] = useState(null);
  const [guardandoPago, setGuardandoPago] = useState(false);

  const [modalHistorial, setModalHistorial] = useState(null);
  const [historial, setHistorial] = useState({ pagos: [], mensualidad: null });
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(null);
  const [error, setError] = useState('');

  const [confirmEliminarPago, setConfirmEliminarPago] = useState(null);
  const [eliminandoPago, setEliminandoPago] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarEstadoMensualidades({ mes, anio });
      setFilas(respuesta.data);
    } catch {
      setFilas([]);
    } finally {
      setCargando(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalMiembros = filas.length;
  const totalEsperado = filas.reduce((acc, f) => acc + f.valor_mensualidad, 0);
  const totalRecaudado = filas.reduce((acc, f) => acc + f.total_pagado, 0);
  const totalPagados = filas.filter((f) => f.estado === 'PAGADO').length;
  const cumplimiento = totalMiembros > 0 ? Math.round((totalPagados / totalMiembros) * 100) : 0;

  function abrirEditarValor(fila) {
    setModalValor(fila);
    setValorEditado(String(fila.valor_mensualidad || ''));
    setError('');
  }

  async function guardarValor(e) {
    e.preventDefault();
    setGuardandoValor(true);
    setError('');
    try {
      await establecerValorMensualidad(modalValor.miembro_id, valorEditado);
      setModalValor(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el valor de mensualidad');
    } finally {
      setGuardandoValor(false);
    }
  }

  function abrirRegistrarPago(fila) {
    setModalPago(fila);
    const saldo = fila.valor_mensualidad - fila.total_pagado;
    setFormPago({
      miembro_id: fila.miembro_id,
      valor: String(saldo > 0 ? saldo : fila.valor_mensualidad || ''),
      fecha_pago: '',
      mes_correspondiente: String(mes),
      anio_correspondiente: String(anio),
      observaciones: '',
    });
    setArchivoSoporte(null);
    setError('');
  }

  async function guardarPago(e) {
    e.preventDefault();
    if (!formPago.valor || !formPago.fecha_pago) {
      setError('El valor y la fecha de pago son obligatorios');
      return;
    }
    setGuardandoPago(true);
    setError('');
    try {
      await registrarPagoMensualidad(formPago, archivoSoporte);
      setModalPago(null);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar el pago');
    } finally {
      setGuardandoPago(false);
    }
  }

  async function abrirHistorial(fila) {
    setModalHistorial(fila);
    setCargandoHistorial(true);
    try {
      const respuesta = await obtenerHistorialMensualidad(fila.miembro_id);
      setHistorial(respuesta.data);
    } catch {
      setHistorial({ pagos: [], mensualidad: null });
    } finally {
      setCargandoHistorial(false);
    }
  }

  async function confirmarEliminarPago() {
    if (!confirmEliminarPago) return;
    setEliminandoPago(true);
    try {
      await eliminarPagoMensualidad(confirmEliminarPago.id);
      setConfirmEliminarPago(null);
      if (modalHistorial) {
        await abrirHistorial(modalHistorial);
      }
      cargar();
    } catch {
      setConfirmEliminarPago(null);
    } finally {
      setEliminandoPago(false);
    }
  }

  async function enviarRecordatorio(fila) {
    setEnviandoWhatsapp(fila.miembro_id);
    try {
      const respuesta = await obtenerWhatsappRecordatorio(fila.miembro_id);
      window.open(respuesta.data.url, '_blank', 'noopener,noreferrer');
    } catch {
      // si falla la generación del mensaje, simplemente no se abre nada
    } finally {
      setEnviandoWhatsapp(null);
    }
  }

  return (
    <div className="mensualidades">
      <div className="mensualidades__header">
        <div>
          <h1>Mensualidades</h1>
          <p className="mensualidades__descripcion">Estado de pagos mensuales por miembro.</p>
        </div>
        <div className="mensualidades__selector-mes">
          <select className="mensualidades__select-filtro" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {NOMBRES_MES.map((nombre, i) => (
              <option key={nombre} value={i + 1}>{nombre}</option>
            ))}
          </select>
          <input
            type="number"
            className="mensualidades__select-filtro mensualidades__input-anio"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="mensualidades__indicadores">
        <div className="mensualidades__indicador mensualidades__indicador--success">
          <span className="mensualidades__indicador-valor">{formatearMoneda(totalRecaudado)}</span>
          <span className="mensualidades__indicador-etiqueta">Recaudado</span>
        </div>
        <div className="mensualidades__indicador mensualidades__indicador--danger">
          <span className="mensualidades__indicador-valor">{formatearMoneda(Math.max(totalEsperado - totalRecaudado, 0))}</span>
          <span className="mensualidades__indicador-etiqueta">Pendiente</span>
        </div>
        <div className="mensualidades__indicador">
          <span className="mensualidades__indicador-valor">{cumplimiento}%</span>
          <span className="mensualidades__indicador-etiqueta">Cumplimiento</span>
        </div>
        <div className="mensualidades__indicador">
          <span className="mensualidades__indicador-valor">{totalMiembros}</span>
          <span className="mensualidades__indicador-etiqueta">Miembros</span>
        </div>
      </div>

      <DataTable
        cargando={cargando}
        datos={filas}
        claveFila={(f) => f.miembro_id}
        columnas={[
          { clave: 'nombres_completos', titulo: 'Miembro' },
          { clave: 'numero_documento', titulo: 'Documento' },
          {
            clave: 'valor_mensualidad',
            titulo: 'Valor mensualidad',
            render: (f) => (
              <button type="button" className="mensualidades__valor-editable" onClick={() => abrirEditarValor(f)} title="Editar valor">
                {formatearMoneda(f.valor_mensualidad)}
              </button>
            ),
          },
          { clave: 'total_pagado', titulo: 'Pagado', render: (f) => formatearMoneda(f.total_pagado) },
          { clave: 'ultima_fecha_pago', titulo: 'Último pago', render: (f) => formatearFecha(f.ultima_fecha_pago) },
          { clave: 'estado', titulo: 'Estado', render: (f) => <StatusBadge texto={ETIQUETAS_ESTADO[f.estado]} variant={VARIANTES_ESTADO[f.estado]} /> },
        ]}
        acciones={(fila) => (
          <>
            <Button variant="secondary" onClick={() => abrirRegistrarPago(fila)}>Registrar Pago</Button>
            <Button variant="ghost" onClick={() => abrirHistorial(fila)}>Historial</Button>
            <Button variant="secondary" onClick={() => enviarRecordatorio(fila)} loading={enviandoWhatsapp === fila.miembro_id}>
              WhatsApp
            </Button>
          </>
        )}
        vacioTexto="No hay miembros activos para mostrar."
      />

      <Modal
        abierto={!!modalValor}
        titulo="Editar valor de mensualidad"
        onClose={() => setModalValor(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalValor(null)}>Cancelar</Button>
            <Button onClick={guardarValor} loading={guardandoValor}>Guardar</Button>
          </>
        }
      >
        {modalValor && (
          <form onSubmit={guardarValor} className="mensualidades__form-valor">
            <p>{modalValor.nombres_completos}</p>
            <FormField
              label="Valor mensualidad"
              type="number"
              min="0"
              step="100"
              name="valor_mensualidad"
              value={valorEditado}
              onChange={(e) => setValorEditado(e.target.value)}
              required
            />
            {error && <p className="mensualidades__error">{error}</p>}
          </form>
        )}
      </Modal>

      <Modal
        abierto={!!modalPago}
        titulo="Registrar pago"
        onClose={() => setModalPago(null)}
        ancho="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalPago(null)}>Cancelar</Button>
            <Button onClick={guardarPago} loading={guardandoPago}>Registrar pago</Button>
          </>
        }
      >
        {modalPago && formPago && (
          <form onSubmit={guardarPago} className="mensualidades__form-pago">
            <p>{modalPago.nombres_completos}</p>
            <div className="mensualidades__grid">
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
            {error && <p className="mensualidades__error">{error}</p>}
          </form>
        )}
      </Modal>

      <Modal
        abierto={!!modalHistorial}
        titulo={modalHistorial ? `Historial — ${modalHistorial.nombres_completos}` : 'Historial'}
        onClose={() => setModalHistorial(null)}
        ancho="lg"
      >
        {modalHistorial && (
          <div className="mensualidades__historial">
            <p className="mensualidades__nota">
              Mensualidad configurada: <strong>{formatearMoneda(historial.mensualidad?.valor_mensualidad || 0)}</strong>
            </p>
            <SubList
              titulo="Pagos registrados"
              vacio={!cargandoHistorial && !historial.pagos?.length}
              vacioTexto="Este miembro no tiene pagos registrados."
            >
              {cargandoHistorial ? (
                <p>Cargando...</p>
              ) : (
                historial.pagos?.length > 0 && (
                  <table className="mensualidades__tabla">
                    <thead><tr><th>Mes</th><th>Valor</th><th>Fecha de pago</th><th>Observaciones</th><th></th></tr></thead>
                    <tbody>
                      {historial.pagos.map((p) => (
                        <tr key={p.id}>
                          <td>{NOMBRES_MES[p.mes_correspondiente - 1]} {p.anio_correspondiente}</td>
                          <td>{formatearMoneda(p.valor)}</td>
                          <td>{formatearFecha(p.fecha_pago)}</td>
                          <td>{p.observaciones || '—'}</td>
                          <td>
                            <Button variant="danger" onClick={() => setConfirmEliminarPago(p)}>Eliminar</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </SubList>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        abierto={!!confirmEliminarPago}
        titulo="Eliminar pago"
        mensaje={
          confirmEliminarPago
            ? `¿Seguro que deseas eliminar el pago de ${formatearMoneda(confirmEliminarPago.valor)} correspondiente a ${NOMBRES_MES[confirmEliminarPago.mes_correspondiente - 1]} ${confirmEliminarPago.anio_correspondiente} (fecha de pago: ${formatearFecha(confirmEliminarPago.fecha_pago)})? Esta acción no se puede deshacer.`
            : ''
        }
        onConfirmar={confirmarEliminarPago}
        onCancelar={() => setConfirmEliminarPago(null)}
        textoConfirmar="Eliminar"
        cargando={eliminandoPago}
      />
    </div>
  );
}
