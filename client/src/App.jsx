import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Configuracion from './pages/Configuracion/Configuracion';
import Niveles from './pages/Niveles/Niveles';
import Horarios from './pages/Horarios/Horarios';
import Miembros from './pages/Miembros/Miembros';
import MiembroDetalle from './pages/Miembros/MiembroDetalle';
import Asistencias from './pages/Asistencias/Asistencias';
import Asistencia from './pages/Asistencia/Asistencia';
import Mensualidades from './pages/Mensualidades/Mensualidades';
import Multas from './pages/Multas/Multas';
import Eventos from './pages/Eventos/Eventos';
import Comunicaciones from './pages/Comunicaciones/Comunicaciones';
import Reportes from './pages/Reportes/Reportes';
import ImportacionExportacion from './pages/ImportacionExportacion/ImportacionExportacion';
import Usuarios from './pages/Usuarios/Usuarios';
import Escuela from './pages/Escuela/Escuela';
import PlantillasCorreo from './pages/PlantillasCorreo/PlantillasCorreo';
import PortalLayout from './pages/Portal/PortalLayout';
import PortalInicio from './pages/Portal/PortalInicio';
import MisAsistencias from './pages/Portal/MisAsistencias';
import MisMensualidades from './pages/Portal/MisMensualidades';
import MisTareas from './pages/Portal/MisTareas';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* Portal público de autoregistro de asistencia, sin login (kiosco/tablet). */}
            <Route path="/asistencia" element={<Asistencia />} />

            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="niveles" element={<Niveles />} />
              <Route path="horarios" element={<Horarios />} />
              <Route path="miembros" element={<Miembros />} />
              <Route path="miembros/:id" element={<MiembroDetalle />} />
              <Route path="asistencias" element={<Asistencias />} />
              <Route path="mensualidades" element={<Mensualidades />} />
              <Route path="multas" element={<Multas />} />
              <Route path="eventos" element={<Eventos />} />
              <Route path="comunicaciones" element={<Comunicaciones />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="importacion-exportacion" element={<ImportacionExportacion />} />
              <Route path="escuela" element={<Escuela />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="plantillas-correo" element={<PlantillasCorreo />} />
            </Route>

            {/* Portal del miembro — layout y guard propios */}
            <Route
              path="/portal"
              element={
                <PrivateRoute>
                  <PortalLayout />
                </PrivateRoute>
              }
            >
              <Route index element={<PortalInicio />} />
              <Route path="asistencias" element={<MisAsistencias />} />
              <Route path="mensualidades" element={<MisMensualidades />} />
              <Route path="tareas" element={<MisTareas />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
