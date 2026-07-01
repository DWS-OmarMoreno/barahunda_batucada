import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { obtenerPerfil } from '../../services/portal.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatearFecha } from '../../utils/formato';
import './Portal.css';

const ACCESOS = [
  { ruta: '/portal/asistencias',   icono: '📅', titulo: 'Asistencias',  desc: 'Consulta tu historial de asistencia' },
  { ruta: '/portal/mensualidades', icono: '💳', titulo: 'Mis pagos',     desc: 'Revisa tus mensualidades y pagos' },
  { ruta: '/portal/guias',         icono: '📚', titulo: 'Guías',         desc: 'Recursos y materiales de tu nivel' },
  { ruta: '/portal/tareas',        icono: '📝', titulo: 'Tareas',        desc: 'Tareas asignadas y entregas pendientes' },
];

export default function PortalInicio() {
  const { usuario } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerPerfil()
      .then((r) => setPerfil(r.data))
      .catch(() => setPerfil(null))
      .finally(() => setCargando(false));
  }, []);

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
        <h2>Tu información</h2>
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
          {perfil.fecha_ingreso ? (
            <div>
              <span>Fecha de ingreso</span>
              <strong>{formatearFecha(perfil.fecha_ingreso)}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
