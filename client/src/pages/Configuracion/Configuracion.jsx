import { useState, useEffect, useCallback } from 'react';
import { useTheme, COLORES_POR_DEFECTO } from '../../context/ThemeContext';
import {
  actualizarConfiguracion,
  subirLogo,
  obtenerAuditoriaConfiguracion,
} from '../../services/configuracion.service';
import { obtenerPuntoRegistro, regenerarPuntoRegistro } from '../../services/puntoRegistro.service';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import UploadField from '../../components/ui/UploadField';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import AuditLog from '../../components/ui/AuditLog';
import './Configuracion.css';

const CAMPOS_COLOR = [
  { campo: 'color_primario', etiqueta: 'Primario' },
  { campo: 'color_secundario', etiqueta: 'Secundario' },
  { campo: 'color_acento', etiqueta: 'Acento' },
  { campo: 'color_texto', etiqueta: 'Texto' },
  { campo: 'color_fondo', etiqueta: 'Fondo' },
];

export default function Configuracion() {
  const { config, recargarConfiguracion, previsualizarColores } = useTheme();

  const [datosGenerales, setDatosGenerales] = useState({
    escuela_nombre: '',
    escuela_telefono: '',
    escuela_direccion: '',
  });
  const [parametros, setParametros] = useState({
    multa_valor_por_tardanza: 0,
    asistencia_tolerancia_minutos: 0,
    fecha_go_live: '',
  });
  const [colores, setColores] = useState(COLORES_POR_DEFECTO);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'exito' | 'error', texto }
  const [mostrarConfirmReset, setMostrarConfirmReset] = useState(false);

  const [auditoria, setAuditoria] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(true);

  const [puntoRegistro, setPuntoRegistro] = useState(null);
  const [cargandoPunto, setCargandoPunto] = useState(true);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  const [confirmRegenerar, setConfirmRegenerar] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [errorPunto, setErrorPunto] = useState('');

  // Sincroniza el formulario cuando llega/cambia la configuración global
  useEffect(() => {
    if (!config) return;
    setDatosGenerales({
      escuela_nombre: config.escuela_nombre || '',
      escuela_telefono: config.escuela_telefono || '',
      escuela_direccion: config.escuela_direccion || '',
    });
    setParametros({
      multa_valor_por_tardanza: config.multa_valor_por_tardanza || 0,
      asistencia_tolerancia_minutos: config.asistencia_tolerancia_minutos || 0,
      fecha_go_live: config.fecha_go_live || '',
    });
    setColores({
      color_primario: config.color_primario || COLORES_POR_DEFECTO.color_primario,
      color_secundario: config.color_secundario || COLORES_POR_DEFECTO.color_secundario,
      color_acento: config.color_acento || COLORES_POR_DEFECTO.color_acento,
      color_texto: config.color_texto || COLORES_POR_DEFECTO.color_texto,
      color_fondo: config.color_fondo || COLORES_POR_DEFECTO.color_fondo,
    });
    setLogoPreview(config.escuela_logo || '');
  }, [config]);

  const cargarAuditoria = useCallback(async () => {
    setCargandoAuditoria(true);
    try {
      const respuesta = await obtenerAuditoriaConfiguracion();
      setAuditoria(respuesta.data);
    } catch {
      // si falla, simplemente se deja la lista vacía
    } finally {
      setCargandoAuditoria(false);
    }
  }, []);

  useEffect(() => {
    cargarAuditoria();
  }, [cargarAuditoria]);

  const cargarPuntoRegistro = useCallback(async () => {
    setCargandoPunto(true);
    try {
      const respuesta = await obtenerPuntoRegistro();
      setPuntoRegistro(respuesta.data);
    } catch {
      setPuntoRegistro(null);
    } finally {
      setCargandoPunto(false);
    }
  }, []);

  useEffect(() => {
    cargarPuntoRegistro();
  }, [cargarPuntoRegistro]);

  async function copiarEnlacePunto() {
    if (!puntoRegistro?.url) return;
    try {
      await navigator.clipboard.writeText(puntoRegistro.url);
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch {
      // si el navegador bloquea el portapapeles, simplemente no se confirma la copia
    }
  }

  async function confirmarRegenerar() {
    setRegenerando(true);
    setErrorPunto('');
    try {
      const respuesta = await regenerarPuntoRegistro();
      setPuntoRegistro(respuesta.data);
      setConfirmRegenerar(false);
    } catch (err) {
      setErrorPunto(err.response?.data?.message || 'No se pudo regenerar el enlace');
    } finally {
      setRegenerando(false);
    }
  }

  function actualizarColor(campo, valor) {
    const nuevosColores = { ...colores, [campo]: valor };
    setColores(nuevosColores);
    previsualizarColores(nuevosColores); // previsualización en tiempo real
  }

  function restablecerColores() {
    setColores(COLORES_POR_DEFECTO);
    previsualizarColores(COLORES_POR_DEFECTO);
    setMostrarConfirmReset(false);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);

    try {
      let escuela_logo = config?.escuela_logo || null;
      if (logoFile) {
        const respuestaLogo = await subirLogo(logoFile);
        escuela_logo = respuestaLogo.data.url;
      }

      const payload = {
        ...datosGenerales,
        ...parametros,
        fecha_go_live: parametros.fecha_go_live || null,
        ...colores,
        escuela_logo,
      };

      await actualizarConfiguracion(payload);
      await recargarConfiguracion();
      await cargarAuditoria();
      setLogoFile(null);
      setMensaje({ tipo: 'exito', texto: 'Configuración actualizada correctamente' });
    } catch (err) {
      const texto = err.response?.data?.message || 'No se pudo guardar la configuración';
      setMensaje({ tipo: 'error', texto });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="configuracion">
      <h1>Configuración</h1>
      <p className="configuracion__descripcion">
        Datos generales de la escuela, parámetros operativos y personalización de colores de toda la aplicación.
      </p>

      <form onSubmit={manejarSubmit} className="configuracion__formulario">
        <section className="configuracion__seccion">
          <h2>Datos generales</h2>
          <FormField
            label="Nombre de la escuela"
            name="escuela_nombre"
            value={datosGenerales.escuela_nombre}
            onChange={(e) => setDatosGenerales((p) => ({ ...p, escuela_nombre: e.target.value }))}
            required
          />
          <FormField
            label="Teléfono"
            name="escuela_telefono"
            value={datosGenerales.escuela_telefono}
            onChange={(e) => setDatosGenerales((p) => ({ ...p, escuela_telefono: e.target.value }))}
          />
          <FormField
            label="Dirección"
            name="escuela_direccion"
            value={datosGenerales.escuela_direccion}
            onChange={(e) => setDatosGenerales((p) => ({ ...p, escuela_direccion: e.target.value }))}
          />
          <UploadField
            label="Logo de la escuela"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            previewUrl={logoFile ? URL.createObjectURL(logoFile) : logoPreview}
            onFileSelected={setLogoFile}
            helpText="PNG, JPG, WEBP o SVG — máximo 3MB"
          />
        </section>

        <section className="configuracion__seccion">
          <h2>Parámetros operativos</h2>
          <FormField
            label="Valor de multa por tardanza (COP)"
            type="number"
            min="0"
            step="100"
            name="multa_valor_por_tardanza"
            value={parametros.multa_valor_por_tardanza}
            onChange={(e) => setParametros((p) => ({ ...p, multa_valor_por_tardanza: e.target.value }))}
          />
          <FormField
            label="Tolerancia de asistencia (minutos)"
            type="number"
            min="0"
            name="asistencia_tolerancia_minutos"
            value={parametros.asistencia_tolerancia_minutos}
            onChange={(e) => setParametros((p) => ({ ...p, asistencia_tolerancia_minutos: e.target.value }))}
          />
          <FormField
            label="Fecha de GO Live"
            type="date"
            name="fecha_go_live"
            value={parametros.fecha_go_live}
            onChange={(e) => setParametros((p) => ({ ...p, fecha_go_live: e.target.value }))}
            helpText="Fecha desde la cual el sistema está en uso. Las ausencias nunca se calculan antes de esta fecha."
          />
        </section>

        <section className="configuracion__seccion">
          <div className="configuracion__seccion-header">
            <h2>Personalización de colores</h2>
            <Button type="button" variant="ghost" onClick={() => setMostrarConfirmReset(true)}>
              Restablecer colores por defecto
            </Button>
          </div>
          <div className="configuracion__colores">
            {CAMPOS_COLOR.map(({ campo, etiqueta }) => (
              <FormField
                key={campo}
                label={etiqueta}
                type="color"
                name={campo}
                value={colores[campo]}
                onChange={(e) => actualizarColor(campo, e.target.value)}
              />
            ))}
          </div>
          <p className="configuracion__nota">
            Los cambios de color se previsualizan en vivo en toda la app. Haz clic en
            <strong> Guardar cambios</strong> para que queden aplicados de forma permanente.
          </p>
        </section>

        <section className="configuracion__seccion">
          <h2>Plantillas de WhatsApp</h2>
          <p className="configuracion__nota">
            La gestión de plantillas predeterminadas estará disponible cuando se construya el
            módulo de Comunicaciones.
          </p>
        </section>

        {mensaje && (
          <p className={`configuracion__mensaje configuracion__mensaje--${mensaje.tipo}`}>
            {mensaje.texto}
          </p>
        )}

        <Button type="submit" loading={guardando}>Guardar cambios</Button>
      </form>

      <section className="configuracion__seccion">
        <h2>Punto de registro fijo (kiosko)</h2>
        <p className="configuracion__nota">
          Enlace permanente para un único dispositivo de la sede (p. ej. una tablet en la entrada).
          A diferencia del QR de Horarios, este enlace no expira ni rota: su seguridad depende de
          que solo lo tenga ese dispositivo. <strong>Nunca lo compartas con los miembros.</strong>{' '}
          Quien lo abra solo ingresa su número de documento; el sistema detecta solo la clase que
          tiene en curso en ese momento.
        </p>

        {cargandoPunto ? (
          <p className="configuracion__nota">Cargando enlace...</p>
        ) : puntoRegistro ? (
          <div className="configuracion__enlace-fijo">
            <input
              type="text"
              readOnly
              value={puntoRegistro.url}
              className="configuracion__enlace-input"
              onFocus={(e) => e.target.select()}
            />
            <Button type="button" variant="secondary" onClick={copiarEnlacePunto}>
              {enlaceCopiado ? 'Enlace copiado ✓' : 'Copiar enlace'}
            </Button>
            <Button type="button" variant="danger" onClick={() => setConfirmRegenerar(true)}>
              Regenerar enlace
            </Button>
          </div>
        ) : (
          <p className="configuracion__mensaje configuracion__mensaje--error">No se pudo cargar el enlace.</p>
        )}
        {errorPunto && <p className="configuracion__mensaje configuracion__mensaje--error">{errorPunto}</p>}
      </section>

      <section className="configuracion__seccion">
        <h2>Auditoría</h2>
        <AuditLog registros={auditoria} cargando={cargandoAuditoria} />
      </section>

      <ConfirmDialog
        abierto={mostrarConfirmReset}
        titulo="Restablecer colores"
        mensaje="Esto restablecerá los colores a los valores por defecto en el formulario. Deberás guardar para aplicarlo de forma permanente. ¿Continuar?"
        onConfirmar={restablecerColores}
        onCancelar={() => setMostrarConfirmReset(false)}
        textoConfirmar="Restablecer"
        variant="primary"
      />

      <ConfirmDialog
        abierto={confirmRegenerar}
        titulo="Regenerar enlace fijo"
        mensaje="Esto invalida el enlace actual de inmediato. Deberás actualizar el enlace guardado en el dispositivo del punto de registro. ¿Continuar?"
        onConfirmar={confirmarRegenerar}
        onCancelar={() => setConfirmRegenerar(false)}
        textoConfirmar="Regenerar"
        cargando={regenerando}
      />
    </div>
  );
}
