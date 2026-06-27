import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

// Mapa completo de los 12 módulos del sistema. `listo: true` indica que el
// módulo ya está implementado en esta fase; el resto se muestra deshabilitado
// como referencia de lo que viene en las siguientes fases del proyecto.
const MODULOS = [
  { ruta: '/', etiqueta: 'Dashboard', listo: true },
  { ruta: '/miembros', etiqueta: 'Miembros', listo: true },
  { ruta: '/niveles', etiqueta: 'Niveles', listo: true },
  { ruta: '/horarios', etiqueta: 'Horarios', listo: true },
  { ruta: '/asistencias', etiqueta: 'Asistencias', listo: true },
  { ruta: '/mensualidades', etiqueta: 'Mensualidades', listo: true },
  { ruta: '/multas', etiqueta: 'Multas', listo: true },
  { ruta: '/eventos', etiqueta: 'Eventos', listo: true },
  { ruta: '/comunicaciones', etiqueta: 'Comunicaciones', listo: true },
  { ruta: '/reportes', etiqueta: 'Reportes', listo: true },
  { ruta: '/importacion-exportacion', etiqueta: 'Importar / Exportar', listo: true },
  { ruta: '/configuracion', etiqueta: 'Configuración', listo: true },
  { ruta: '/usuarios', etiqueta: 'Administradores', listo: true },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { config } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="layout">
      <header className="layout__header">
        <button
          className="layout__menu-btn"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto((v) => !v)}
        >
          ☰
        </button>
        <div className="layout__marca">
          {config?.escuela_logo && (
            <img src={config.escuela_logo} alt="Logo" className="layout__logo" />
          )}
          <span className="layout__nombre-escuela">{config?.escuela_nombre || 'Escuela de Música'}</span>
        </div>
        <div className="layout__usuario">
          <span className="layout__usuario-nombre">{usuario?.nombre}</span>
          <button className="layout__logout-btn" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className="layout__cuerpo">
        <nav className={`layout__sidebar ${menuAbierto ? 'layout__sidebar--abierto' : ''}`}>
          {MODULOS.map((m) =>
            m.listo ? (
              <NavLink
                key={m.ruta}
                to={m.ruta}
                end={m.ruta === '/'}
                className={({ isActive }) => `layout__nav-link ${isActive ? 'layout__nav-link--activo' : ''}`}
                onClick={() => setMenuAbierto(false)}
              >
                {m.etiqueta}
              </NavLink>
            ) : (
              <span key={m.ruta} className="layout__nav-link layout__nav-link--deshabilitado" title="Próximamente">
                {m.etiqueta}
                <small>pronto</small>
              </span>
            )
          )}
        </nav>

        <main className="layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
