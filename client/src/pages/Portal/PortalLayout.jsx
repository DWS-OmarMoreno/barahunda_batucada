import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './PortalLayout.css';

const MODULOS = [
  { ruta: '/portal',               etiqueta: 'Inicio',       icono: '🏠', end: true },
  { ruta: '/portal/asistencias',   etiqueta: 'Asistencias',  icono: '📅' },
  { ruta: '/portal/mensualidades', etiqueta: 'Mis pagos',    icono: '💳' },
  { ruta: '/portal/guias',         etiqueta: 'Guías',        icono: '📚' },
  { ruta: '/portal/tareas',        etiqueta: 'Plan de estudios', icono: '📋' },
];

export default function PortalLayout() {
  const { usuario, logout, isAuthenticated, cargando } = useAuth();
  const { config } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (cargando) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.rol !== 'MIEMBRO') return <Navigate to="/" replace />;

  const inicial = (usuario?.nombre || 'E')[0].toUpperCase();
  const cerrarMenu = () => setMenuAbierto(false);

  return (
    <div className="portal-layout">
      <header className="portal-layout__header">
        <button
          className="portal-layout__menu-btn"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto((v) => !v)}
        >
          ☰
        </button>
        <div className="portal-layout__marca">
          {config?.escuela_logo
            ? <img src={config.escuela_logo} alt="Logo" className="portal-layout__logo" />
            : <div className="portal-layout__logo-placeholder">🎵</div>
          }
          <span className="portal-layout__nombre">{config?.escuela_nombre || 'Escuela de Música'}</span>
        </div>
        <div className="portal-layout__usuario">
          <div className="portal-layout__avatar">{inicial}</div>
          <span className="portal-layout__usuario-nombre">{usuario?.nombre}</span>
          <button className="portal-layout__logout-btn" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className="portal-layout__cuerpo">
        {menuAbierto && (
          <div className="portal-layout__overlay" onClick={cerrarMenu} />
        )}

        <nav className={`portal-layout__sidebar ${menuAbierto ? 'portal-layout__sidebar--abierto' : ''}`}>
          <div className="portal-layout__sidebar-header">
            <span className="portal-layout__sidebar-label">Portal del estudiante</span>
          </div>
          {MODULOS.map((m) => (
            <NavLink
              key={m.ruta}
              to={m.ruta}
              end={m.end}
              className={({ isActive }) =>
                `portal-layout__nav-link ${isActive ? 'portal-layout__nav-link--activo' : ''}`
              }
              onClick={cerrarMenu}
            >
              <span className="portal-layout__nav-icono">{m.icono}</span>
              <span>{m.etiqueta}</span>
            </NavLink>
          ))}
        </nav>

        <main className="portal-layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
