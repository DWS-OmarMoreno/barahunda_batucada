import { useState, useEffect, useCallback } from 'react';
import {
  listarMiembros,
  crearMiembro,
  actualizarMiembro,
  cambiarActivoMiembro,
  obtenerWhatsappRecordatorio,
} from '../../services/miembros.service';
import { listarNiveles } from '../../services/niveles.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import { formatearFecha } from '../../utils/formato';
import MiembroDetalle from './MiembroDetalle';
import ActionsMenu from '../../components/ui/ActionsMenu';
import './Miembros.css';

const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const TIPOS_SANGRE = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

const FORM_VACIO = {
  nombres_completos: '',
  tipo_documento: 'CC',
  numero_documento: '',
  whatsapp: '',
  email: '',
  fecha_nacimiento: '',
  direccion: '',
  tipo_sangre: '',
  eps: '',
  padece_enfermedad: false,
  enfermedad_cual: '',
  sufre_alergia: false,
  alergia_cual: '',
  toma_medicamentos: false,
  medicamentos_cuales: '',
  restricciones_fisicas: '',
  exento_pago: false,
  asistencia_obligatoria: false,
};

export default function Miembros() {
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('1');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [niveles, setNiveles] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ totalPages: 1, total: 0 });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [mostrarMedica, setMostrarMedica] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [confirmInactivar, setConfirmInactivar] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarMiembros({
        busqueda,
        activo: filtroActivo,
        nivel_id: filtroNivel || undefined,
        page: pagina,
        limit: 15,
      });
      setMiembros(respuesta.data);
      setPaginacion(respuesta.pagination || { totalPages: 1, total: respuesta.data.length });
    } catch {
      setMiembros([]);
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtroActivo, filtroNivel, pagina]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    listarNiveles({ limit: 100 }).then((r) => setNiveles(r.data)).catch(() => setNiveles([]));
  }, []);

  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setMostrarMedica(false);
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(miembro) {
    setEditando(miembro);
    setForm({
      nombres_completos: miembro.nombres_completos || '',
      tipo_documento: miembro.tipo_documento || 'CC',
      numero_documento: miembro.numero_documento || '',
      whatsapp: miembro.whatsapp || '',
      email: miembro.email || '',
      fecha_nacimiento: miembro.fecha_nacimiento ? String(miembro.fecha_nacimiento).slice(0, 10) : '',
      direccion: miembro.direccion || '',
      tipo_sangre: miembro.tipo_sangre || '',
      eps: miembro.eps || '',
      padece_enfermedad: !!miembro.padece_enfermedad,
      enfermedad_cual: miembro.enfermedad_cual || '',
      sufre_alergia: !!miembro.sufre_alergia,
      alergia_cual: miembro.alergia_cual || '',
      toma_medicamentos: !!miembro.toma_medicamentos,
      medicamentos_cuales: miembro.medicamentos_cuales || '',
      restricciones_fisicas: miembro.restricciones_fisicas || '',
      exento_pago: !!miembro.exento_pago,
      asistencia_obligatoria: !!miembro.asistencia_obligatoria,
    });
    setMostrarMedica(false);
    setError('');
    setModalAbierto(true);
  }

  function actualizarCampo(campo, valor) {
    setForm((p) => ({ ...p, [campo]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      if (editando) {
        await actualizarMiembro(editando.id, form);
      } else {
        await crearMiembro(form);
      }
      setModalAbierto(false);
      cargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar el miembro');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarInactivar() {
    if (!confirmInactivar) return;
    try {
      await cambiarActivoMiembro(confirmInactivar.id, !confirmInactivar.activo);
      setConfirmInactivar(null);
      cargar();
    } catch {
      setConfirmInactivar(null);
    }
  }

  async function enviarRecordatorio(miembro) {
    setEnviandoWhatsapp(miembro.id);
    try {
      const respuesta = await obtenerWhatsappRecordatorio(miembro.id);
      window.open(respuesta.data.url, '_blank', 'noopener,noreferrer');
    } catch {
      // si falla la generación del mensaje, simplemente no se abre nada
    } finally {
      setEnviandoWhatsapp(null);
    }
  }

  return (
    <div className="miembros">
      <div className="miembros__header">
        <div>
          <h1>Miembros</h1>
          <p className="miembros__descripcion">Estudiantes inscritos en la escuela de música.</p>
        </div>
        <Button onClick={abrirCrear}>+ Nuevo miembro</Button>
      </div>

      <DataTable
        cargando={cargando}
        datos={miembros}
        busqueda={{ valor: busqueda, onChange: (v) => { setBusqueda(v); setPagina(1); }, placeholder: 'Buscar por nombre o documento...' }}
        filtros={
          <>
            <select className="miembros__select-filtro" value={filtroActivo} onChange={(e) => { setFiltroActivo(e.target.value); setPagina(1); }}>
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
              <option value="">Todos</option>
            </select>
            <select className="miembros__select-filtro" value={filtroNivel} onChange={(e) => { setFiltroNivel(e.target.value); setPagina(1); }}>
              <option value="">Todos los niveles</option>
              {niveles.map((n) => (
                <option key={n.id} value={n.id}>{n.nombre}</option>
              ))}
            </select>
          </>
        }
        paginacion={{ pagina, totalPaginas: paginacion.totalPages, total: paginacion.total, onCambiarPagina: setPagina }}
        columnas={[
          { clave: 'nombres_completos', titulo: 'Nombre' },
          { clave: 'numero_documento', titulo: 'Documento', render: (f) => `${f.tipo_documento} ${f.numero_documento}` },
          { clave: 'whatsapp', titulo: 'WhatsApp' },
          { clave: 'fecha_nacimiento', titulo: 'Nacimiento', render: (f) => formatearFecha(f.fecha_nacimiento) },
          {
            clave: 'indicadores',
            titulo: 'Indicadores',
            render: (f) => (
              <div className="miembros__indicadores">
                {!!f.exento_pago && <StatusBadge texto="Exento" variant="info" />}
                {!!f.asistencia_obligatoria && <StatusBadge texto="Asist. obligatoria" variant="warning" />}
              </div>
            ),
          },
          { clave: 'activo', titulo: 'Estado', render: (f) => <StatusBadge texto={f.activo ? 'Activo' : 'Inactivo'} variant={f.activo ? 'success' : 'secondary'} /> },
        ]}
        acciones={(fila) => (
          <ActionsMenu acciones={[
            { etiqueta: 'Ver detalle', onClick: () => setDetalleId(fila.id) },
            { etiqueta: 'Editar', onClick: () => abrirEditar(fila) },
            { etiqueta: 'WhatsApp', onClick: () => enviarRecordatorio(fila) },
            { etiqueta: fila.activo ? 'Inactivar' : 'Activar', onClick: () => setConfirmInactivar(fila), variant: 'danger' },
          ]} />
        )}
        vacioTexto="No hay miembros registrados."
      />

      <Modal
        abierto={modalAbierto}
        titulo={editando ? 'Editar miembro' : 'Nuevo miembro'}
        onClose={() => setModalAbierto(false)}
        ancho="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardar} className="miembros__form">
          <section className="miembros__seccion">
            <h3>Información personal</h3>
            <div className="miembros__grid">
              <FormField label="Nombres completos" name="nombres_completos" value={form.nombres_completos} onChange={(e) => actualizarCampo('nombres_completos', e.target.value)} required />
              <FormField label="Tipo de documento" type="select" name="tipo_documento" value={form.tipo_documento} options={TIPOS_DOCUMENTO} onChange={(e) => actualizarCampo('tipo_documento', e.target.value)} required />
              <FormField label="Número de documento" name="numero_documento" value={form.numero_documento} onChange={(e) => actualizarCampo('numero_documento', e.target.value)} required />
              <FormField label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={(e) => actualizarCampo('whatsapp', e.target.value)} helpText="Sin indicativo de país" required />
              <FormField label="Email" type="email" name="email" value={form.email} onChange={(e) => actualizarCampo('email', e.target.value)} />
              <FormField label="Fecha de nacimiento" type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={(e) => actualizarCampo('fecha_nacimiento', e.target.value)} />
            </div>
            <FormField label="Dirección" name="direccion" value={form.direccion} onChange={(e) => actualizarCampo('direccion', e.target.value)} />
          </section>

          <section className="miembros__seccion">
            <h3>Pagos y asistencia</h3>
            <FormField
              label="Exento de pago (no se le cobra mensualidad)"
              type="checkbox"
              name="exento_pago"
              value={form.exento_pago}
              onChange={(e) => actualizarCampo('exento_pago', e.target.checked)}
            />
            <FormField
              label="Asistencia obligatoria"
              type="checkbox"
              name="asistencia_obligatoria"
              value={form.asistencia_obligatoria}
              onChange={(e) => actualizarCampo('asistencia_obligatoria', e.target.checked)}
            />
          </section>

          <section className="miembros__seccion">
            <div className="miembros__seccion-header">
              <h3>Información médica</h3>
              <Button type="button" variant="ghost" onClick={() => setMostrarMedica((v) => !v)}>
                {mostrarMedica ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            {mostrarMedica && (
              <div className="miembros__medica">
                <div className="miembros__grid">
                  <FormField label="Tipo de sangre" type="select" name="tipo_sangre" value={form.tipo_sangre} onChange={(e) => actualizarCampo('tipo_sangre', e.target.value)} options={TIPOS_SANGRE.map((t) => ({ value: t, label: t || 'Sin especificar' }))} />
                  <FormField label="EPS" name="eps" value={form.eps} onChange={(e) => actualizarCampo('eps', e.target.value)} />
                </div>

                <FormField label="¿Padece alguna enfermedad?" type="checkbox" name="padece_enfermedad" value={form.padece_enfermedad} onChange={(e) => actualizarCampo('padece_enfermedad', e.target.checked)} />
                {form.padece_enfermedad && (
                  <FormField label="¿Cuál?" name="enfermedad_cual" value={form.enfermedad_cual} onChange={(e) => actualizarCampo('enfermedad_cual', e.target.value)} />
                )}

                <FormField label="¿Sufre alguna alergia?" type="checkbox" name="sufre_alergia" value={form.sufre_alergia} onChange={(e) => actualizarCampo('sufre_alergia', e.target.checked)} />
                {form.sufre_alergia && (
                  <FormField label="¿Cuál?" name="alergia_cual" value={form.alergia_cual} onChange={(e) => actualizarCampo('alergia_cual', e.target.value)} />
                )}

                <FormField label="¿Toma medicamentos regularmente?" type="checkbox" name="toma_medicamentos" value={form.toma_medicamentos} onChange={(e) => actualizarCampo('toma_medicamentos', e.target.checked)} />
                {form.toma_medicamentos && (
                  <FormField label="¿Cuáles?" name="medicamentos_cuales" value={form.medicamentos_cuales} onChange={(e) => actualizarCampo('medicamentos_cuales', e.target.value)} />
                )}

                <FormField label="Restricciones físicas" type="textarea" name="restricciones_fisicas" value={form.restricciones_fisicas} onChange={(e) => actualizarCampo('restricciones_fisicas', e.target.value)} />
              </div>
            )}
          </section>

          {error && <p className="miembros__error">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!confirmInactivar}
        titulo={confirmInactivar?.activo ? 'Inactivar miembro' : 'Activar miembro'}
        mensaje={`¿Seguro que deseas ${confirmInactivar?.activo ? 'inactivar' : 'activar'} a "${confirmInactivar?.nombres_completos}"?`}
        onConfirmar={confirmarInactivar}
        onCancelar={() => setConfirmInactivar(null)}
        textoConfirmar={confirmInactivar?.activo ? 'Inactivar' : 'Activar'}
      />

      {detalleId && (
        <MiembroDetalle
          miembroId={detalleId}
          onClose={() => setDetalleId(null)}
          onCambio={cargar}
        />
      )}
    </div>
  );
}
