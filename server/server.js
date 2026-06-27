require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { probarConexion } = require('./config/db');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const configuracionRoutes = require('./routes/configuracion.routes');
const puntoRegistroRoutes = require('./routes/puntoRegistro.routes');
const nivelesRoutes = require('./routes/niveles.routes');
const horariosRoutes = require('./routes/horarios.routes');
const instrumentosRoutes = require('./routes/instrumentos.routes');
const miembrosRoutes = require('./routes/miembros.routes');
const asistenciasRoutes = require('./routes/asistencias.routes');
const mensualidadesRoutes = require('./routes/mensualidades.routes');
const multasRoutes = require('./routes/multas.routes');
const eventosRoutes = require('./routes/eventos.routes');
const plantillasRoutes = require('./routes/plantillas.routes');
const comunicacionesRoutes = require('./routes/comunicaciones.routes');
const reportesRoutes = require('./routes/reportes.routes');
const importacionRoutes = require('./routes/importacion.routes');
const exportacionRoutes = require('./routes/exportacion.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Archivos estáticos servidos (logos, soportes de pago, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' }, message: 'API en línea' }));

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/punto-registro', puntoRegistroRoutes);
app.use('/api/niveles', nivelesRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/instrumentos', instrumentosRoutes);
app.use('/api/miembros', miembrosRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/mensualidades', mensualidadesRoutes);
app.use('/api/multas', multasRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/plantillas', plantillasRoutes);
app.use('/api/comunicaciones', comunicacionesRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/importacion', importacionRoutes);
app.use('/api/exportacion', exportacionRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  await probarConexion();
});

module.exports = app;
