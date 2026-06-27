import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import './Login.css';

export default function Login() {
  const { isAuthenticated, login, cargando: cargandoSesion } = useAuth();
  const { config } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Si ya hay una sesión activa, redirige automáticamente al panel
  if (!cargandoSesion && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function actualizarCampo(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Por favor completa usuario y contraseña');
      return;
    }

    setEnviando(true);
    try {
      await login(form.email, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      const mensaje = err.response?.data?.message || 'No se pudo iniciar sesión. Intenta de nuevo.';
      setError(mensaje);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={manejarSubmit}>
        {config?.escuela_logo && (
          <img src={config.escuela_logo} alt="Logo" className="login__logo" />
        )}
        <h1 className="login__titulo">{config?.escuela_nombre || 'Escuela de Música'}</h1>
        <p className="login__subtitulo">Panel de administración</p>

        <FormField
          label="Correo electrónico"
          type="email"
          name="email"
          value={form.email}
          onChange={actualizarCampo}
          autoComplete="username"
          required
        />
        <FormField
          label="Contraseña"
          type="password"
          name="password"
          value={form.password}
          onChange={actualizarCampo}
          autoComplete="current-password"
          required
        />

        {error && <p className="login__error">{error}</p>}

        <Button type="submit" loading={enviando} className="login__boton">
          Iniciar sesión
        </Button>
      </form>
    </div>
  );
}
