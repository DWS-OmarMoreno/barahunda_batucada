import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { obtenerPerfil, actualizarPerfil } from '../../services/portal.service';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { formatearFecha } from '../../utils/formato';
import './Portal.css';

const ACCESOS = [
  { ruta: '/portal/asistencias',   icono: '📅', titulo: 'Asistencias',  desc: 'Consulta tu historial de asistencia' },
  { ruta: '/portal/mensualidades', icono: '💳', titulo: 'Mis pagos',     desc: 'Revisa tus mensualidades y pagos' },
  { ruta: '/portal/guias',         icono: '📚', titulo: 'Guías',         desc: 'Recursos y materiales de tu nivel' },
  { ruta: '/portal/tareas',        icono: '📝', titulo: 'Tareas',        desc: 'Tareas asignadas y entregas pendientes' },
];

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PortalInicio() {
  const { usuario } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState(false);
  const [formPerfil, setFormPerfil] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [exitoPerfil, setExitoPerfil] = useState('');

  useEffect(() => {
    obtenerPerfil()
      .then((r) => setPerfil(r.data))
      .catch(() => setPerfil(null))
      .finally(() => setCargando(false));
  }, []);

  function abrirEdicion() {
    if (!perfil) return;
    setFormPerfil({
      nombres_completos: perfil.nombres_completos || '',
      whatsapp: perfil.whatsapp || '',
      email: perfil.email || '',
      fecha_nacimiento: perfil.fecha_nacimiento ? String(perfil.fecha_nacimiento).slice(0, 10) : '',
      direccion: perfil.direccion || '',
      tipo_sangre: perfil.tipo_sangre || '',
      eps: perfil.eps || '',
      padece_enfermedad: perfil.padece_enfermedad || '',
    });
    setErrorPerfil('');
    setExitoPerfil('');
    setEditando(true);
  }

  function cambiarCampo(campo, valor) {
    setFormPerfil((p) => ({ ...p, [campo]: valor }));
  }

  async function guardarPerfil(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorPerfil('');
    setExitoPerfil('');
    try {
      const r = await actualizarPerfil(formPerfil);
      setPerfil(r.data);
      setExitoPerfil('Perfil actualizado correctamente.');
      setTimeout(() => { setEditando(false); setExitoPerfil(''); }, 1400);
    } catch (err) {
      setErrorPerfil(err.response?.data?.message || 'No se pudo actualizar el perfil');
    } finally {
      setGuardando(false);
    }
  }

  const inicial = (usuario?.nombre || 'E')[0].toUpperCase();
  const niveles = perfil?.niveles_nombres
    ? perfil.niveles_nombres.split(',').map((n) => n.trim()).filter(Boolean)
    : [];

  if (cargando) return <p className="portal__cargando">Cargando perfil...</p>;
  if (!perfil) return <p className="portal__error">No se pudo cargar el perfil.</p>;

  return (
    <div className="portal__inicio">
      {/* Banner de bienvenida */}
      <div className="portal__bienvenida">
        <div className="portal__avatar">{inicial}</div>
        <div className="portal__bienvenida-texto">
          <h1>Hola, {usuario?.nombre} 👋</h1>
          <p>Bienvenido/a a tu portal de estudiante.</p>
          {niveles.length > 0 && (
            <div className="portal__niveles-pills">
              {niveles.map((n) => (
                <span key={n} className="portal__nivel-pill">{n}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="portal__accesos-rapidos">
        {ACCESOS.map((a) => (
          <Link key={a.ruta} to={a.ruta} className="portal__acceso-card">
            <span className="portal__acceso-icono">{a.icono}</span>
            <span className="portal__acceso-titulo">{a.titulo}</span>
            <span className="portal__acceso-desc">{a.desc}</span>
          </Link>
        ))}
      </div>

      {/* Información personal */}
      <div className="portal__perfil-card">
        <div className="portal__perfil-card-header">
          <h2>Tu información</h2>
          {!editando && (
            <button type="button" className="portal__editar-btn" onClick={abrirEdicion}>
              Editar perfil
            </button>
          )}
        </div>

        {editando ? (
          <form onSubmit={guardarPerfil} className="portal__perfil-form">
            {/* Campos no editables */}
            <div className="portal__perfil-form-bloqueados">
              <p>Datos administrados por la escuela</p>
              <div className="portal__perfil-form-bloqueados-grid">
                <div className="portal__perfil-form-bloqueado-item">
                  <span>Documento</span>
                  <strong>{perfil.tipo_documento} {perfil.numero_documento}</strong>
                </div>
                <div className="portal__perfil-form-bloqueado-item">
                  <span>Correo institucional</span>
                  <strong>{perfil.correo_institucional || '—'}</strong>
                </div>
                <div className="portal__perfil-form-bloqueado-item">
                  <span>Nivel(es)</span>
                  <strong>{perfil.niveles_nombres || '—'}</strong>
                </div>
                {perfil.exento_pago ? (
                  <div className="portal__perfil-form-bloqueado-item">
                    <span>Pago</span>
                    <strong>Exento</strong>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Campos editables */}
            <div className="portal__perfil-form-campos">
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-nombre">Nombre completo</label>
                <input
                  id="pf-nombre"
                  type="text"
                  value={formPerfil.nombres_completos}
                  onChange={(e) => cambiarCampo('nombres_completos', e.target.value)}
                />
              </div>
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-whatsapp">WhatsApp</label>
                <input
                  id="pf-whatsapp"
                  type="tel"
                  value={formPerfil.whatsapp}
                  onChange={(e) => cambiarCampo('whatsapp', e.target.value)}
                  placeholder="Ej: 3001234567"
                />
              </div>
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-email">Email personal</label>
                <input
                  id="pf-email"
                  type="email"
                  value={formPerfil.email}
                  onChange={(e) => cambiarCampo('email', e.target.value)}
                />
              </div>
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-nacimiento">Fecha de nacimiento</label>
                <input
                  id="pf-nacimiento"
                  type="date"
                  value={formPerfil.fecha_nacimiento}
                  onChange={(e) => cambiarCampo('fecha_nacimiento', e.target.value)}
                />
              </div>
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-direccion">Dirección</label>
                <input
                  id="pf-direccion"
                  type="text"
                  value={formPerfil.direccion}
                  onChange={(e) => cambiarCampo('direccion', e.target.value)}
                />
              </div>
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-sangre">Tipo de sangre</label>
                <select
                  id="pf-sangre"
                  value={formPerfil.tipo_sangre}
                  onChange={(e) => cambiarCampo('tipo_sangre', e.target.value)}
                >
                  <option value="">— Selecciona —</option>
                  {TIPOS_SANGRE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-eps">EPS</label>
                <input
                  id="pf-eps"
                  type="text"
                  value={formPerfil.eps}
                  onChange={(e) => cambiarCampo('eps', e.target.value)}
                />
              </div>
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-enfermedad">Condición médica relevante</label>
                <input
                  id="pf-enfermedad"
                  type="text"
                  value={formPerfil.padece_enfermedad}
                  onChange={(e) => cambiarCampo('padece_enfermedad', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {errorPerfil && <p className="portal__error">{errorPerfil}</p>}
            {exitoPerfil && <p className="portal__exito">{exitoPerfil}</p>}

            <div className="portal__perfil-form-acciones">
              <Button type="button" variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
              <Button type="submit" loading={guardando}>Guardar cambios</Button>
            </div>
          </form>
        ) : (
          <div className="portal__perfil-campos">
            <div>
              <span>Nombre completo</span>
              <strong>{perfil.nombres_completos}</strong>
            </div>
            <div>
              <span>Documento</span>
              <strong>{perfil.tipo_documento} {perfil.numero_documento}</strong>
            </div>
            <div>
              <span>WhatsApp</span>
              <strong>{perfil.whatsapp || '—'}</strong>
            </div>
            <div>
              <span>Email personal</span>
              <strong>{perfil.email || '—'}</strong>
            </div>
            <div>
              <span>Correo institucional</span>
              <strong>{perfil.correo_institucional || '—'}</strong>
            </div>
            <div>
              <span>Estado</span>
              <StatusBadge
                texto={perfil.activo ? 'Activo' : 'Inactivo'}
                variant={perfil.activo ? 'success' : 'secondary'}
              />
            </div>
            <div>
              <span>Nivel(es)</span>
              <strong>{perfil.niveles_nombres || '—'}</strong>
            </div>
            {perfil.exento_pago ? (
              <div>
                <span>Pago</span>
                <StatusBadge texto="Exento de pago" variant="info" />
              </div>
            ) : null}
            {perfil.fecha_nacimiento ? (
              <div>
                <span>Fecha de nacimiento</span>
                <strong>{formatearFecha(perfil.fecha_nacimiento)}</strong>
              </div>
            ) : null}
            {perfil.fecha_ingreso ? (
              <div>
                <span>Fecha de ingreso</span>
                <strong>{formatearFecha(perfil.fecha_ingreso)}</strong>
              </div>
            ) : null}
            {perfil.eps ? (
              <div>
                <span>EPS</span>
                <strong>{perfil.eps}</strong>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
