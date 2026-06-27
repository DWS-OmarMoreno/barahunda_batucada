import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protege las rutas del panel admin: si no hay sesión activa, redirige a /login
export default function PrivateRoute({ children }) {
  const { isAuthenticated, cargando } = useAuth();

  if (cargando) return null; // evita parpadeo mientras se restaura la sesión

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children;
}
