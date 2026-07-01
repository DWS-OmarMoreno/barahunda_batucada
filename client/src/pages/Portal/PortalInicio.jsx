import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { obtenerPerfil } from '../../services/portal.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatearFecha } from '../../utils/formato';
import './Portal.css';

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

  if (cargando) return <p className="portal__cargando">Cargando perfil...</p>;
  if (!perfil) return <p className="portal__error">No se pudo cargar el perfil.</p>;

  return (
    <div className="portal__inicio">
      <h1>Hola, {usuario?.nombre} 👋</h1>
      <p className="portal__subtitulo">Bienvenido/a a tu portal de estudiante.</p>

      <div className="portal__perfil-card">
        <h2>Tu información</h2>
        <div className="portal__perfil-campos">
          <div><span>Nombre</span><strong>{perfil.nombres_completos}</strong></div>
          <div><span>Documento</span><strong>{perfil.tipo_documento} {perfil.numero_documento}</strong></div>
          <div><span>WhatsApp</span><strong>{perfil.whatsapp || '—'}</strong></div>
          <div><span>Email personal</span><strong>{perfil.email || '—'}</strong></div>
          <div><span>Correo institucional</span><strong>{perfil.correo_institucional || '—'}</strong></div>
          <div>
            <span>Estado</span>
            <StatusBadge
              texto={perfil.activo ? 'Activo' : 'Inactivo'}
              variant={perfil.activo ? 'success' : 'secondary'}
            />
          </div>
          <div><span>Nivel(es)</span><strong>{perfil.niveles_nombres || '—'}</strong></div>
          {perfil.exento_pago ? (
            <div><span>Pago</span><StatusBadge texto="Exento de pago" variant="info" /></div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
