import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Adjunta el token JWT (si existe) a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expiró o es inválido, limpia la sesión y manda al login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Origen del backend (sin el sufijo /api) para resolver rutas relativas de
// archivos servidos estáticamente (/uploads/logos/..., /uploads/soportes/...).
export const ORIGEN_API = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

export function urlArchivo(ruta) {
  if (!ruta) return '';
  return ruta.startsWith('http') ? ruta : `${ORIGEN_API}${ruta}`;
}

export default api;
