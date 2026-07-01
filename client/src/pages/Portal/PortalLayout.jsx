import { useState } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './PortalLayout.css';

const MODULOS = [
  { ruta: '/portal', etiqueta: 'Inicio', end: true },
  { ruta: '/portal/asistencias', etiqueta: 'Mis asistencias' },
  { ruta: '/portal/mensualidades', etiqueta: 'Mis pagos' },
  { ruta: '/portal/tareas', etiqueta: 'Tareas y guías' },
];

export default function PortalLayout() {
  const { usuario, logout, isAuthenticated, cargando } = useAuth();
  const { config } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (cargando) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.rol !== 'MIEMBRO') return <Navigate to="/" replace />;

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
          {config?.escuela_logo && (
            <img src={config.escuela_logo} alt="Logo" className="portal-layout__logo" />
          )}
          <span className="portal-layout__nombre">{config?.escuela_nombre || 'Escuela de Música'}</span>
        </div>
        <div className="portal-layout__usuario">
          <span>{usuario?.nombre}</span>
          <button className="portal-layout__logout-btn" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className="portal-layout__cuerpo">
        <nav className={`portal-layout__sidebar ${menuAbierto ? 'portal-layout__sidebar--abierto' : ''}`}>
          <p className="portal-layout__rol-badge">Portal del estudiante</p>
          {MODULOS.map((m) => (
            <NavLink
              key={m.ruta}
              to={m.ruta}
              end={m.end}
              className={({ isActive }) =>
                `portal-layout__nav-link ${isActive ? 'portal-layout__nav-link--activo' : ''}`
              }
              onClick={() => setMenuAbierto(false)}
            >
              {m.etiqueta}
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
