import { useState, useEffect, useCallback } from 'react';
import {
  listarPlantillas,
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
} from '../../services/plantillas.service';
import {
  listarComunicaciones,
  enviarComunicacion,
} from '../../services/comunicaciones.service';
import { listarMiembros } from '../../services/miembros.service';
import { listarNiveles } from '../../services/niveles.service';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import WhatsAppButton from '../../components/ui/WhatsAppButton';
import { formatearFechaHora } from '../../utils/formato';
import ActionsMenu from '../../components/ui/ActionsMenu';
import './Comunicaciones.css';

const VARIABLES_DISPONIBLES = [
  '{nombre}', '{nivel}', '{valor_mensualidad}', '{mes_pendiente}', '{valor_multa}', '{fecha_evento}',
];

const ETIQUETAS_TIPO_DESTINATARIO = {
  TODOS: 'Todos los miembros',
  POR_NIVEL: 'Por nivel',
  MANUAL: 'Selección manual',
};

const FORM_PLANTILLA_VACIO = { nombre: '', contenido: '' };
const FORM_VARIABLES_VACIO = { mes_pendiente: '', valor_multa: '', fecha_evento: '' };

function resaltarVariables(texto) {
  if (!texto) return null;
  const partes = String(texto).split(/(\{[a-z_]+\})/g);
  return partes.map((parte, i) => (
    /^\{[a-z_]+\}$/.test(parte)
      ? <span key={i} className="comunicaciones__variable">{parte}</span>
      : <span key={i}>{parte}</span>
  ));
}

export default function Comunicaciones() {
  const [tab, setTab] = useState('plantillas');

  // ---------- Datos compartidos ----------
  const [plantillas, setPlantillas] = useState([]);
  const [cargandoPlantillas, setCargandoPlantillas] = useState(true);
  const [niveles, setNiveles] = useState([]);
  const [miembros, setMiembros] = useState([]);

  const cargarPlantillas = useCallback(async () => {
    setCargandoPlantillas(true);
    try {
      const respuesta = await listarPlantillas({ limit: 200 });
      setPlantillas(respuesta.data);
    } catch {
      setPlantillas([]);
    } finally {
      setCargandoPlantillas(false);
    }
  }, []);

  useEffect(() => { cargarPlantillas(); }, [cargarPlantillas]);

  useEffect(() => {
    listarNiveles({ activo: '1', limit: 200 }).then((r) => setNiveles(r.data)).catch(() => setNiveles([]));
    listarMiembros({ activo: '1', limit: 1000 }).then((r) => setMiembros(r.data)).catch(() => setMiembros([]));
  }, []);

  return (
    <div className="comunicaciones">
      <div className="comunicaciones__header">
        <div>
          <h1>Comunicaciones</h1>
          <p className="comunicaciones__descripcion">Plantillas de WhatsApp, envío masivo e historial de comunicaciones.</p>
        </div>
      </div>

      <div className="comunicaciones__tabs">
        <button type="button" className={`comunicaciones__tab ${tab === 'plantillas' ? 'comunicaciones__tab--activo' : ''}`} onClick={() => setTab('plantillas')}>Plantillas</button>
        <button type="button" className={`comunicaciones__tab ${tab === 'enviar' ? 'comunicaciones__tab--activo' : ''}`} onClick={() => setTab('enviar')}>Enviar</button>
        <button type="button" className={`comunicaciones__tab ${tab === 'historial' ? 'comunicaciones__tab--activo' : ''}`} onClick={() => setTab('historial')}>Historial</button>
      </div>

      {tab === 'plantillas' && (
        <TabPlantillas
          plantillas={plantillas}
          cargando={cargandoPlantillas}
          onRecargar={cargarPlantillas}
        />
      )}

      {tab === 'enviar' && (
        <TabEnviar
          plantillas={plantillas.filter((p) => p.activo === 1 || p.activo === true)}
          niveles={niveles}
          miembros={miembros}
        />
      )}

      {tab === 'historial' && <TabHistorial />}
    </div>
  );
}

// =========================================================================
// Tab: Plantillas
// =========================================================================

function TabPlantillas({ plantillas, cargando, onRecargar }) {
  const [busqueda, setBusqueda] = useState('');
  const [modalForm, setModalForm] = useState(null); // null | 'crear' | plantilla
  const [form, setForm] = useState(FORM_PLANTILLA_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [eliminarObjetivo, setEliminarObjetivo] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');

  const plantillasFiltradas = plantillas.filter((p) =>
    !busqueda.trim() || p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  function abrirCrear() {
    setForm(FORM_PLANTILLA_VACIO);
    setError('');
    setModalForm('crear');
  }

  function abrirEditar(plantilla) {
    setForm({ nombre: plantilla.nombre, contenido: plantilla.contenido });
    setError('');
    setModalForm(plantilla);
  }

  function insertarVariable(variable) {
    setForm((p) => ({ ...p, contenido: `${p.contenido || ''}${variable}` }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.contenido.trim()) {
      setError('Nombre y contenido son obligatorios');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      if (modalForm === 'crear') {
        await crearPlantilla(form);
      } else {
        await actualizarPlantilla(modalForm.id, form);
      }
      setModalForm(null);
      onRecargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar la plantilla');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    setEliminando(true);
    try {
      await eliminarPlantilla(eliminarObjetivo.id);
      setEliminarObjetivo(null);
      onRecargar();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar la plantilla');
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="comunicaciones__panel">
      <div className="comunicaciones__panel-header">
        <p className="comunicaciones__variables-hint">
          Variables disponibles: {VARIABLES_DISPONIBLES.join(' ')}
        </p>
        <Button onClick={abrirCrear}>Nueva plantilla</Button>
      </div>

      <DataTable
        cargando={cargando}
        datos={plantillasFiltradas}
        busqueda={{ valor: busqueda, onChange: setBusqueda, placeholder: 'Buscar plantilla...' }}
        columnas={[
          { clave: 'nombre', titulo: 'Nombre' },
          {
            clave: 'contenido',
            titulo: 'Contenido',
            render: (f) => (
              <span className="comunicaciones__preview-corta">
                {f.contenido.length > 80 ? `${f.contenido.slice(0, 80)}...` : f.contenido}
              </span>
            ),
          },
          {
            clave: 'activo',
            titulo: 'Estado',
            render: (f) => (
              <StatusBadge
                texto={(f.activo === 1 || f.activo === true) ? 'Activa' : 'Inactiva'}
                variant={(f.activo === 1 || f.activo === true) ? 'success' : 'secondary'}
              />
            ),
          },
        ]}
        acciones={(fila) => (
          <ActionsMenu acciones={[
            { etiqueta: 'Editar', onClick: () => abrirEditar(fila) },
            { etiqueta: 'Eliminar', onClick: () => setEliminarObjetivo(fila), variant: 'danger' },
          ]} />
        )}
        vacioTexto="No hay plantillas creadas."
      />

      <Modal
        abierto={!!modalForm}
        titulo={modalForm === 'crear' ? 'Nueva plantilla' : 'Editar plantilla'}
        onClose={() => setModalForm(null)}
        ancho="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalForm(null)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Guardar</Button>
          </>
        }
      >
        <form onSubmit={guardar} className="comunicaciones__form">
          <FormField
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            required
          />
          <div className="comunicaciones__variables-botones">
            {VARIABLES_DISPONIBLES.map((v) => (
              <button key={v} type="button" className="comunicaciones__variable-btn" onClick={() => insertarVariable(v)}>{v}</button>
            ))}
          </div>
          <FormField
            label="Contenido del mensaje"
            type="textarea"
            rows={6}
            name="contenido"
            value={form.contenido}
            onChange={(e) => setForm((p) => ({ ...p, contenido: e.target.value }))}
            helpText="Usa los botones de variables o escríbelas directamente, ej: {nombre}"
            required
          />
          {form.contenido && (
            <div className="comunicaciones__preview-caja">
              <span className="comunicaciones__preview-etiqueta">Vista previa</span>
              <p>{resaltarVariables(form.contenido)}</p>
            </div>
          )}
          {error && <p className="comunicaciones__error">{error}</p>}
        </form>
      </Modal>

      <ConfirmDialog
        abierto={!!eliminarObjetivo}
        titulo="Eliminar plantilla"
        mensaje={eliminarObjetivo ? `¿Eliminar la plantilla "${eliminarObjetivo.nombre}"?` : ''}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setEliminarObjetivo(null)}
        cargando={eliminando}
        textoConfirmar="Eliminar"
      />
    </div>
  );
}

// =========================================================================
// Tab: Enviar
// =========================================================================

function TabEnviar({ plantillas, niveles, miembros }) {
  const [plantillaId, setPlantillaId] = useState('');
  const [destinatariosTipo, setDestinatariosTipo] = useState('TODOS');
  const [nivelId, setNivelId] = useState('');
  const [miembroIds, setMiembroIds] = useState([]);
  const [busquedaMiembro, setBusquedaMiembro] = useState('');
  const [variablesExtra, setVariablesExtra] = useState(FORM_VARIABLES_VACIO);

  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null); // { comunicacion, mensajes }
  const [error, setError] = useState('');

  const plantillaSeleccionada = plantillas.find((p) => String(p.id) === String(plantillaId));

  const miembrosFiltrados = miembros.filter((m) =>
    !busquedaMiembro.trim() || m.nombres_completos.toLowerCase().includes(busquedaMiembro.trim().toLowerCase())
  );

  function alternarMiembro(id) {
    setMiembroIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function generar() {
    setError('');
    if (!plantillaId) {
      setError('Selecciona una plantilla');
      return;
    }
    if (destinatariosTipo === 'POR_NIVEL' && !nivelId) {
      setError('Selecciona un nivel');
      return;
    }
    if (destinatariosTipo === 'MANUAL' && miembroIds.length === 0) {
      setError('Selecciona al menos un miembro');
      return;
    }

    const extra = {};
    if (variablesExtra.mes_pendiente.trim()) extra.mes_pendiente = variablesExtra.mes_pendiente.trim();
    if (variablesExtra.valor_multa.trim()) extra.valor_multa = variablesExtra.valor_multa.trim();
    if (variablesExtra.fecha_evento.trim()) extra.fecha_evento = variablesExtra.fecha_evento.trim();

    setGenerando(true);
    setResultado(null);
    try {
      const respuesta = await enviarComunicacion({
        plantilla_id: plantillaId,
        destinatarios_tipo: destinatariosTipo,
        nivel_id: destinatariosTipo === 'POR_NIVEL' ? nivelId : undefined,
        miembro_ids: destinatariosTipo === 'MANUAL' ? miembroIds.map(Number) : undefined,
        variables_extra: extra,
      });
      setResultado(respuesta.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron generar los mensajes');
    } finally {
      setGenerando(false);
    }
  }

  function abrirTodos() {
    if (!resultado) return;
    resultado.mensajes.filter((m) => m.url).forEach((m) => window.open(m.url, '_blank', 'noopener,noreferrer'));
  }

  return (
    <div className="comunicaciones__panel">
      <div className="comunicaciones__envio-grid">
        <div className="comunicaciones__envio-form">
          <FormField
            label="Plantilla"
            type="select"
            name="plantilla_id"
            value={plantillaId}
            onChange={(e) => setPlantillaId(e.target.value)}
            options={[{ value: '', label: 'Seleccione una plantilla' }, ...plantillas.map((p) => ({ value: p.id, label: p.nombre }))]}
            required
          />

          {plantillaSeleccionada && (
            <div className="comunicaciones__preview-caja">
              <span className="comunicaciones__preview-etiqueta">Mensaje original</span>
              <p>{resaltarVariables(plantillaSeleccionada.contenido)}</p>
            </div>
          )}

          <FormField
            label="Destinatarios"
            type="select"
            name="destinatarios_tipo"
            value={destinatariosTipo}
            onChange={(e) => setDestinatariosTipo(e.target.value)}
            options={[
              { value: 'TODOS', label: 'Todos los miembros activos' },
              { value: 'POR_NIVEL', label: 'Por nivel' },
              { value: 'MANUAL', label: 'Selección manual' },
            ]}
          />

          {destinatariosTipo === 'POR_NIVEL' && (
            <FormField
              label="Nivel"
              type="select"
              name="nivel_id"
              value={nivelId}
              onChange={(e) => setNivelId(e.target.value)}
              options={[{ value: '', label: 'Seleccione un nivel' }, ...niveles.map((n) => ({ value: n.id, label: n.nombre }))]}
              required
            />
          )}

          {destinatariosTipo === 'MANUAL' && (
            <div className="comunicaciones__lista-miembros">
              <input
                type="search"
                className="comunicaciones__buscar-miembro"
                placeholder="Buscar miembro..."
                value={busquedaMiembro}
                onChange={(e) => setBusquedaMiembro(e.target.value)}
              />
              <div className="comunicaciones__checklist">
                {miembrosFiltrados.map((m) => (
                  <label key={m.id} className="comunicaciones__checklist-item">
                    <input
                      type="checkbox"
                      checked={miembroIds.includes(m.id)}
                      onChange={() => alternarMiembro(m.id)}
                    />
                    {m.nombres_completos}
                  </label>
                ))}
                {miembrosFiltrados.length === 0 && <p className="comunicaciones__checklist-vacio">Sin resultados.</p>}
              </div>
              <span className="comunicaciones__seleccion-conteo">{miembroIds.length} miembro(s) seleccionado(s)</span>
            </div>
          )}

          <div className="comunicaciones__variables-extra">
            <span className="comunicaciones__preview-etiqueta">Variables adicionales (opcional)</span>
            <FormField label="Mes pendiente" name="mes_pendiente" value={variablesExtra.mes_pendiente} onChange={(e) => setVariablesExtra((p) => ({ ...p, mes_pendiente: e.target.value }))} placeholder="Ej: Junio" />
            <FormField label="Valor multa" name="valor_multa" value={variablesExtra.valor_multa} onChange={(e) => setVariablesExtra((p) => ({ ...p, valor_multa: e.target.value }))} placeholder="Ej: $20.000" />
            <FormField label="Fecha de evento" name="fecha_evento" value={variablesExtra.fecha_evento} onChange={(e) => setVariablesExtra((p) => ({ ...p, fecha_evento: e.target.value }))} placeholder="Ej: 15 de julio" />
          </div>

          {error && <p className="comunicaciones__error">{error}</p>}

          <Button onClick={generar} loading={generando}>Generar enlaces de WhatsApp</Button>
        </div>

        <div className="comunicaciones__envio-resultado">
          {resultado ? (
            <>
              <div className="comunicaciones__resultado-header">
                <span>{resultado.mensajes.length} mensaje(s) generado(s)</span>
                <Button variant="secondary" onClick={abrirTodos}>Abrir todos</Button>
              </div>
              <div className="comunicaciones__resultado-lista">
                {resultado.mensajes.map((m) => (
                  <div key={m.miembro_id} className="comunicaciones__resultado-item">
                    <div className="comunicaciones__resultado-info">
                      <strong>{m.miembro_nombre}</strong>
                      <p className="comunicaciones__preview-corta">{m.mensaje}</p>
                      {!m.whatsapp && <StatusBadge texto="Sin WhatsApp" variant="warning" />}
                    </div>
                    {m.url && <WhatsAppButton numero={m.whatsapp} mensaje={m.mensaje}>Enviar</WhatsAppButton>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="comunicaciones__resultado-vacio">Selecciona una plantilla y destinatarios, luego genera los enlaces.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Tab: Historial
// =========================================================================

function TabHistorial() {
  const [comunicaciones, setComunicaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ totalPages: 1, total: 0 });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await listarComunicaciones({ page: pagina, limit: 15 });
      setComunicaciones(respuesta.data);
      setPaginacion(respuesta.pagination || { totalPages: 1, total: respuesta.data.length });
    } catch {
      setComunicaciones([]);
    } finally {
      setCargando(false);
    }
  }, [pagina]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="comunicaciones__panel">
      <DataTable
        cargando={cargando}
        datos={comunicaciones}
        paginacion={{ pagina, totalPaginas: paginacion.totalPages, total: paginacion.total, onCambiarPagina: setPagina }}
        columnas={[
          { clave: 'created_at', titulo: 'Fecha', render: (f) => formatearFechaHora(f.created_at) },
          { clave: 'plantilla_nombre', titulo: 'Plantilla', render: (f) => f.plantilla_nombre || '—' },
          { clave: 'destinatarios_tipo', titulo: 'Destinatarios', render: (f) => ETIQUETAS_TIPO_DESTINATARIO[f.destinatarios_tipo] || f.destinatarios_tipo },
          { clave: 'nivel_nombre', titulo: 'Nivel', render: (f) => f.nivel_nombre || '—' },
          { clave: 'total_destinatarios', titulo: 'Total enviados' },
          { clave: 'enviado_por_nombre', titulo: 'Enviado por', render: (f) => f.enviado_por_nombre || '—' },
        ]}
        vacioTexto="Aún no se han enviado comunicaciones."
      />
    </div>
  );
}
