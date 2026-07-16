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
import PlanesEstudio from './pages/PlanesEstudio/PlanesEstudio';
import PlanDetalle from './pages/PlanesEstudio/PlanDetalle';
import PortalLayout from './pages/Portal/PortalLayout';
import PortalInicio from './pages/Portal/PortalInicio';
import MisAsistencias from './pages/Portal/MisAsistencias';
import MisMensualidades from './pages/Portal/MisMensualidades';
import MisTareas from './pages/Portal/MisTareas';
import MisGuias from './pages/Portal/MisGuias';

// Landing — sitio web informativo (rutas públicas)
import LandingLayout from './pages/Landing/LandingLayout';
import LandingInicio from './pages/Landing/LandingInicio';
import LandingNosotros from './pages/Landing/LandingNosotros';
import LandingGaleria from './pages/Landing/LandingGaleria';
import LandingContactenos from './pages/Landing/LandingContactenos';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>

            {/* ── Sitio web informativo — rutas públicas ────────────────── */}
            <Route path="/" element={<LandingLayout />}>
              <Route index          element={<LandingInicio />}     />
              <Route path="nosotros"    element={<LandingNosotros />}   />
              <Route path="galeria"     element={<LandingGaleria />}    />
              <Route path="contactenos" element={<LandingContactenos />} />
            </Route>

            {/* ── Autenticación ─────────────────────────────────────────── */}
            <Route path="/login" element={<Login />} />

            {/* ── Punto de registro de asistencia (kiosco/tablet, sin login) */}
            <Route path="/asistencia" element={<Asistencia />} />

            {/* ── Panel de administración ───────────────────────────────── */}
            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="niveles"                element={<Niveles />}                />
              <Route path="horarios"               element={<Horarios />}               />
              <Route path="miembros"               element={<Miembros />}               />
              <Route path="miembros/:id"           element={<MiembroDetalle />}         />
              <Route path="asistencias"            element={<Asistencias />}            />
              <Route path="mensualidades"          element={<Mensualidades />}          />
              <Route path="multas"                 element={<Multas />}                 />
              <Route path="eventos"                element={<Eventos />}                />
              <Route path="comunicaciones"         element={<Comunicaciones />}         />
              <Route path="reportes"               element={<Reportes />}               />
              <Route path="importacion-exportacion"element={<ImportacionExportacion />} />
              <Route path="escuela"                element={<Escuela />}                />
              <Route path="configuracion"          element={<Configuracion />}          />
              <Route path="usuarios"               element={<Usuarios />}               />
              <Route path="plantillas-correo"      element={<PlantillasCorreo />}       />
              <Route path="planes-estudio"         element={<PlanesEstudio />}          />
              <Route path="planes-estudio/:id"     element={<PlanDetalle />}            />
            </Route>

            {/* ── Portal del miembro ────────────────────────────────────── */}
            <Route
              path="/portal"
              element={
                <PrivateRoute>
                  <PortalLayout />
                </PrivateRoute>
              }
            >
              <Route index              element={<PortalInicio />}      />
              <Route path="asistencias" element={<MisAsistencias />}   />
              <Route path="mensualidades" element={<MisMensualidades />} />
              <Route path="guias"       element={<MisGuias />}         />
              <Route path="tareas"      element={<MisTareas />}        />
            </Route>

          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
