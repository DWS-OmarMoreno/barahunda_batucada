import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { obtenerConfiguracion } from '../services/configuracion.service';

const ThemeContext = createContext(null);

// Mapa entre los campos de la API (snake_case en español) y las
// variables CSS que se usan en toda la app.
const MAPA_COLORES = {
  color_primario: '--color-primary',
  color_secundario: '--color-secondary',
  color_acento: '--color-accent',
  color_texto: '--color-text',
  color_fondo: '--color-background',
};

export const COLORES_POR_DEFECTO = {
  color_primario: '#2563eb',
  color_secundario: '#64748b',
  color_acento: '#f59e0b',
  color_texto: '#1e293b',
  color_fondo: '#f8fafc',
};

function aplicarColores(colores) {
  const root = document.documentElement;
  Object.entries(MAPA_COLORES).forEach(([campo, variable]) => {
    if (colores && colores[campo]) {
      root.style.setProperty(variable, colores[campo]);
    }
  });
}

export function ThemeProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarConfiguracion = useCallback(async () => {
    try {
      const respuesta = await obtenerConfiguracion();
      setConfig(respuesta.data);
      aplicarColores(respuesta.data);
    } catch (err) {
      console.error('No se pudo cargar la configuración del sistema:', err.message);
      aplicarColores(COLORES_POR_DEFECTO);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarConfiguracion();
  }, [cargarConfiguracion]);

  // Permite previsualizar colores en tiempo real (p.ej. en el color picker
  // de Configuración) sin necesidad de guardar todavía en el servidor.
  const previsualizarColores = useCallback((colores) => {
    aplicarColores(colores);
  }, []);

  const restablecerColores = useCallback(() => {
    aplicarColores(COLORES_POR_DEFECTO);
  }, []);

  const value = {
    config,
    cargando,
    recargarConfiguracion: cargarConfiguracion,
    previsualizarColores,
    restablecerColores,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
