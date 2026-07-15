import { useState, useEffect, useCallback } from 'react';
import { useTheme, COLORES_POR_DEFECTO } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  actualizarConfiguracion,
  subirLogo,
  obtenerAuditoriaConfiguracion,
  probarSmtp,
} from '../../services/configuracion.service';
import { obtenerPuntoRegistro, regenerarPuntoRegistro } from '../../services/puntoRegistro.service';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import UploadField from '../../components/ui/UploadField';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import AuditLog from '../../components/ui/AuditLog';
import SeccionBD from './SeccionBD';
import './Configuracion.css';

// Lista de zonas horarias más comunes en Latinoamérica + algunas globales
const ZONAS_HORARIAS = [
  'America/Bogota',
  'America/Lima',
  'America/Guayaquil',
  'America/Caracas',
  'America/La_Paz',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Panama',
  'America/Costa_Rica',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Madrid',
  'UTC',
];

const CAMPOS_COLOR = [
  { campo: 'color_primario', etiqueta: 'Primario' },
  { campo: 'color_secundario', etiqueta: 'Secundario' },
  { campo: 'color_acento', etiqueta: 'Acento' },
  { campo: 'color_texto', etiqueta: 'Texto' },
  { campo: 'color_fondo', etiqueta: 'Fondo' },
];

export default function Configuracion() {
  const { config, recargarConfiguracion, previsualizarColores } = useTheme();
  const { usuario } = useAuth();

  const [datosGenerales, setDatosGenerales] = useState({
    escuela_nombre: '',
    escuela_telefono: '',
    escuela_direccion: '',
  });
  const [datosPlataforma, setDatosPlataforma] = useState({
    zona_horaria: 'America/Bogota',
    dominio: '',
  });
  const [parametros, setParametros] = useState({
    multa_valor_por_tardanza: 0,
    asistencia_tolerancia_minutos: 0,
    fecha_go_live: '',
  });
  const [smtp, setSmtp] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
    smtp_secure: false,
  });
  const [colores, setColores] = useState(COLORES_POR_DEFECTO);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarConfirmReset, setMostrarConfirmReset] = useState(false);

  const [probandoSmtp, setProbandoSmtp] = useState(false);
  const [mensajeSmtp, setMensajeSmtp] = useState(null);

  const [auditoria, setAuditoria] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(true);

  const [puntoRegistro, setPuntoRegistro] = useState(null);
  const [cargandoPunto, setCargandoPunto] = useState(true);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  const [confirmRegenerar, setConfirmRegenerar] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [errorPunto, setErrorPunto] = useState('');

  useEffect(() => {
    if (!config) return;
    setDatosGenerales({
      escuela_nombre: config.escuela_nombre || '',
      escuela_telefono: config.escuela_telefono || '',
      escuela_direccion: config.escuela_direccion || '',
    });
    setDatosPlataforma({
      zona_horaria: config.zona_horaria || 'America/Bogota',
      dominio: config.dominio || '',
    });
    setParametros({
      multa_valor_por_tardanza: config.multa_valor_por_tardanza || 0,
      asistencia_tolerancia_minutos: config.asistencia_tolerancia_minutos || 0,
      fecha_go_live: config.fecha_go_live || '',
    });
    setSmtp({
      smtp_host: config.smtp_host || '',
      smtp_port: config.smtp_port || 587,
      smtp_user: config.smtp_user || '',
      smtp_password: '', // nunca se devuelve del servidor
      smtp_from: config.smtp_from || '',
      smtp_secure: !!config.smtp_secure,
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
    } catch { /* silencioso */ }
    finally { setCargandoAuditoria(false); }
  }, []);

  useEffect(() => { cargarAuditoria(); }, [cargarAuditoria]);

  const cargarPuntoRegistro = useCallback(async () => {
    setCargandoPunto(true);
    try {
      const respuesta = await obtenerPuntoRegistro();
      setPuntoRegistro(respuesta.data);
    } catch { setPuntoRegistro(null); }
    finally { setCargandoPunto(false); }
  }, []);

  useEffect(() => { cargarPuntoRegistro(); }, [cargarPuntoRegistro]);

  async function copiarEnlacePunto() {
    if (!puntoRegistro?.url) return;
    try {
      await navigator.clipboard.writeText(puntoRegistro.url);
      setEnlaceCopiado(true);
      setTimeout(() => setEnlaceCopiado(false), 2000);
    } catch { /* sin confirmación visual */ }
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
    } finally { setRegenerando(false); }
  }

  async function handleProbarSmtp() {
    setProbandoSmtp(true);
    setMensajeSmtp(null);
    // Guardar primero para que el servidor tenga los datos actualizados
    try {
      const payloadSmtp = { ...smtp, smtp_secure: smtp.smtp_secure ? 1 : 0 };
      // Solo enviamos campos smtp si tienen valor (no sobreescribir contraseña con vacío)
      const payload = Object.fromEntries(
        Object.entries(payloadSmtp).filter(([, v]) => v !== '' && v !== null)
      );
      await actualizarConfiguracion(payload);
      const resultado = await probarSmtp();
      setMensajeSmtp({ tipo: 'exito', texto: resultado.message || 'Conexión SMTP verificada' });
    } catch (err) {
      setMensajeSmtp({ tipo: 'error', texto: err.response?.data?.message || 'Error al probar la conexión SMTP' });
    } finally { setProbandoSmtp(false); }
  }

  function actualizarColor(campo, valor) {
    const nuevosColores = { ...colores, [campo]: valor };
    setColores(nuevosColores);
    previsualizarColores(nuevosColores);
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

      // Si smtp_password está vacío, no lo enviamos (no sobreescribir la contraseña guardada)
      const smtpPayload = { ...smtp, smtp_secure: smtp.smtp_secure ? 1 : 0 };
      if (!smtpPayload.smtp_password) delete smtpPayload.smtp_password;

      const payload = {
        ...datosGenerales,
        ...datosPlataforma,
        ...parametros,
        fecha_go_live: parametros.fecha_go_live || null,
        ...colores,
        ...smtpPayload,
        escuela_logo,
      };

      await actualizarConfiguracion(payload);
      await recargarConfiguracion();
      await cargarAuditoria();
      setLogoFile(null);
      setMensaje({ tipo: 'exito', texto: 'Configuración actualizada correctamente' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo guardar la configuración' });
    } finally { setGuardando(false); }
  }

  return (
    <div className="configuracion">
      <h1>Configuración</h1>
      <p className="configuracion__descripcion">
        Datos generales, parámetros operativos, zona horaria, correo y personalización de la plataforma.
      </p>

      <form onSubmit={manejarSubmit} className="configuracion__formulario">

        {/* DATOS GENERALES */}
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

        {/* PLATAFORMA */}
        <section className="configuracion__seccion">
          <h2>Plataforma</h2>
          <div className="form-field">
            <label className="form-field__label" htmlFor="zona_horaria">Zona horaria</label>
            <select
              id="zona_horaria"
              className="form-field__input"
              value={datosPlataforma.zona_horaria}
              onChange={(e) => setDatosPlataforma((p) => ({ ...p, zona_horaria: e.target.value }))}
            >
              {ZONAS_HORARIAS.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <span className="form-field__help">Todas las fechas y horas de la app se expresarán en esta zona horaria.</span>
          </div>
          <FormField
            label="Dominio base de la plataforma"
            name="dominio"
            type="text"
            placeholder="barahunda.com"
            value={datosPlataforma.dominio}
            onChange={(e) => setDatosPlataforma((p) => ({ ...p, dominio: e.target.value }))}
            helpText="Se usará para generar los correos institucionales de los miembros (ej. juan.perez@barahunda.com)."
          />
        </section>

        {/* PARÁMETROS OPERATIVOS */}
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

        {/* CONFIGURACIÓN DE CORREO (SMTP) */}
        <section className="configuracion__seccion">
          <h2>Correo electrónico (SMTP)</h2>
          <p className="configuracion__nota">
            Configura el servidor de correo saliente. Se usa para enviar bienvenidas, notificaciones de tareas
            y recordatorios de mensualidades. Compatible con Hostinger, Gmail, Outlook y cualquier SMTP estándar.
          </p>
          <FormField
            label="Servidor SMTP (host)"
            name="smtp_host"
            placeholder="smtp.hostinger.com"
            value={smtp.smtp_host}
            onChange={(e) => setSmtp((p) => ({ ...p, smtp_host: e.target.value }))}
          />
          <FormField
            label="Puerto"
            type="number"
            name="smtp_port"
            value={smtp.smtp_port}
            onChange={(e) => setSmtp((p) => ({ ...p, smtp_port: Number(e.target.value) }))}
            helpText="Hostinger: 587 (TLS) o 465 (SSL). Gmail: 587."
          />
          <FormField
            label="Usuario SMTP (correo)"
            name="smtp_user"
            type="email"
            placeholder="noreply@barahunda.com"
            value={smtp.smtp_user}
            onChange={(e) => setSmtp((p) => ({ ...p, smtp_user: e.target.value }))}
          />
          <FormField
            label="Contraseña SMTP"
            name="smtp_password"
            type="password"
            placeholder="Deja vacío para conservar la contraseña guardada"
            value={smtp.smtp_password}
            onChange={(e) => setSmtp((p) => ({ ...p, smtp_password: e.target.value }))}
            helpText="Solo completa este campo si quieres cambiar la contraseña guardada."
          />
          <FormField
            label="Nombre / correo de origen (From)"
            name="smtp_from"
            placeholder="Escuela Barahunda <noreply@barahunda.com>"
            value={smtp.smtp_from}
            onChange={(e) => setSmtp((p) => ({ ...p, smtp_from: e.target.value }))}
          />
          <div className="form-field">
            <label className="form-field__label">
              <input
                type="checkbox"
                checked={smtp.smtp_secure}
                onChange={(e) => setSmtp((p) => ({ ...p, smtp_secure: e.target.checked }))}
                style={{ marginRight: '8px' }}
              />
              Usar SSL/TLS (puerto 465)
            </label>
            <span className="form-field__help">Desactivado = STARTTLS (puerto 587). Actívalo solo si tu proveedor usa SSL puro en puerto 465.</span>
          </div>
          {mensajeSmtp && (
            <p className={`configuracion__mensaje configuracion__mensaje--${mensajeSmtp.tipo}`}>
              {mensajeSmtp.texto}
            </p>
          )}
          <Button type="button" variant="secondary" onClick={handleProbarSmtp} loading={probandoSmtp}>
            Probar conexión SMTP
          </Button>
        </section>

        {/* COLORES */}
        <section className="configuracion__seccion">
          <div className="configuracion__seccion-header">
            <h2>Personalización de colores</h2>
            <Button type="button" variant="ghost" onClick={() => setMostrarConfirmReset(true)}>
              Restablecer por defecto
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
            Los cambios de color se previsualizan en vivo. Haz clic en <strong>Guardar cambios</strong> para aplicarlos de forma permanente.
          </p>
        </section>

        {mensaje && (
          <p className={`configuracion__mensaje configuracion__mensaje--${mensaje.tipo}`}>
            {mensaje.texto}
          </p>
        )}

        <Button type="submit" loading={guardando}>Guardar cambios</Button>
      </form>

      {/* PUNTO DE REGISTRO FIJO */}
      <section className="configuracion__seccion">
        <h2>Punto de registro fijo (kiosko)</h2>
        <p className="configuracion__nota">
          Enlace permanente para un único dispositivo de la sede (p. ej. una tablet en la entrada).
          A diferencia del QR de Horarios, este enlace no expira ni rota.{' '}
          <strong>Nunca lo compartas con los miembros.</strong>
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
              {enlaceCopiado ? 'Copiado ✓' : 'Copiar enlace'}
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

      {/* AUDITORÍA */}
      <section className="configuracion__seccion">
        <h2>Auditoría</h2>
        <AuditLog registros={auditoria} cargando={cargandoAuditoria} />
      </section>

      {/* BD MANAGEMENT — solo super admin (el backend también lo verifica) */}
      {usuario?.rol === 'ADMIN' && <SeccionBD />}

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
