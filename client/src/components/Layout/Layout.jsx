import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

const SECCIONES = [
  {
    etiqueta: null, // Sin encabezado de sección
    modulos: [
      { ruta: '/', etiqueta: 'Dashboard' },
    ],
  },
  {
    etiqueta: 'Miembros',
    modulos: [
      { ruta: '/miembros', etiqueta: 'Miembros' },
      { ruta: '/niveles', etiqueta: 'Niveles' },
    ],
  },
  {
    etiqueta: 'Operaciones',
    modulos: [
      { ruta: '/horarios', etiqueta: 'Horarios' },
      { ruta: '/asistencias', etiqueta: 'Asistencias' },
      { ruta: '/mensualidades', etiqueta: 'Mensualidades' },
      { ruta: '/multas', etiqueta: 'Multas' },
    ],
  },
  {
    etiqueta: 'Escuela',
    modulos: [
      { ruta: '/escuela', etiqueta: 'Escuela' },
    ],
  },
  {
    etiqueta: 'Comunicaciones',
    modulos: [
      { ruta: '/eventos', etiqueta: 'Eventos' },
      { ruta: '/comunicaciones', etiqueta: 'Comunicaciones' },
    ],
  },
  {
    etiqueta: 'Reportes',
    modulos: [
      { ruta: '/reportes', etiqueta: 'Reportes' },
      { ruta: '/importacion-exportacion', etiqueta: 'Importar / Exportar' },
    ],
  },
  {
    etiqueta: 'Configuración',
    modulos: [
      { ruta: '/configuracion', etiqueta: 'Configuración' },
      { ruta: '/usuarios', etiqueta: 'Administradores' },
      { ruta: '/plantillas-correo', etiqueta: 'Plantillas de correo' },
    ],
  },
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
                  {m.etiqueta}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <main className="layout__contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
