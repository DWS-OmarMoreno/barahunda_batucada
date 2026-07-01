import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

const SECCIONES = [
  {
    etiqueta: null,
    modulos: [
      { ruta: '/', etiqueta: 'Dashboard', icono: '📊' },
    ],
  },
  {
    etiqueta: 'Miembros',
    modulos: [
      { ruta: '/miembros', etiqueta: 'Miembros', icono: '👥' },
      { ruta: '/niveles', etiqueta: 'Niveles', icono: '🎼' },
    ],
  },
  {
    etiqueta: 'Operaciones',
    modulos: [
      { ruta: '/horarios', etiqueta: 'Horarios', icono: '📅' },
      { ruta: '/asistencias', etiqueta: 'Asistencias', icono: '✅' },
      { ruta: '/mensualidades', etiqueta: 'Mensualidades', icono: '💰' },
      { ruta: '/multas', etiqueta: 'Multas', icono: '⚠️' },
    ],
  },
  {
    etiqueta: 'Escuela',
    modulos: [
      { ruta: '/escuela', etiqueta: 'Escuela', icono: '🎓' },
    ],
  },
  {
    etiqueta: 'Comunicaciones',
    modulos: [
      { ruta: '/eventos', etiqueta: 'Eventos', icono: '🎉' },
      { ruta: '/comunicaciones', etiqueta: 'Comunicaciones', icono: '📢' },
    ],
  },
  {
    etiqueta: 'Reportes',
    modulos: [
      { ruta: '/reportes', etiqueta: 'Reportes', icono: '📈' },
      { ruta: '/importacion-exportacion', etiqueta: 'Importar / Exportar', icono: '📦' },
    ],
  },
  {
    etiqueta: 'Configuración',
    modulos: [
      { ruta: '/configuracion', etiqueta: 'Configuración', icono: '⚙️' },
      { ruta: '/usuarios', etiqueta: 'Administradores', icono: '🔑' },
      { ruta: '/plantillas-correo', etiqueta: 'Plantillas de correo', icono: '✉️' },
    ],
  },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { config } = useTheme();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const inicial = (usuario?.nombre || 'A')[0].toUpperCase();

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
          {config?.escuela_logo
            ? <img src={config.escuela_logo} alt="Logo" className="layout__logo" />
            : <div className="layout__logo-placeholder">🎵</div>
          }
          <span className="layout__nombre-escuela">{config?.escuela_nombre || 'Escuela de Música'}</span>
        </div>
        <div className="layout__usuario">
          <div className="layout__avatar">{inicial}</div>
          <span className="layout__usuario-nombre">{usuario?.nombre}</span>
          <button className="layout__logout-btn" onClick={logout}>Salir</button>
        </div>
      </header>

      <div className="layout__cuerpo">
        <nav className={`layout__sidebar ${menuAbierto ? 'layout__sidebar--abierto' : ''}`}>
          {SECCIONES.map((seccion) => (
            <div key={seccion.etiqueta || '__inicio'} className="layout__seccion">
              {seccion.etiqueta && (
                <p className="layout__seccion-titulo">{seccion.etiqueta}</p>
              )}
              {seccion.modulos.map((m) => (
                <NavLink
                  key={m.ruta}
                  to={m.ruta}
                  end={m.ruta === '/'}
                  className={({ isActive }) => `layout__nav-link ${isActive ? 'layout__nav-link--activo' : ''}`}
                  onClick={() => setMenuAbierto(false)}
                >
                  <span className="layout__nav-icono">{m.icono}</span>
                  <span>{m.etiqueta}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {menuAbierto && (
          <div className="layout__overlay" onClick={() => setMenuAbierto(false)} />
        )}

        <main className="layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
