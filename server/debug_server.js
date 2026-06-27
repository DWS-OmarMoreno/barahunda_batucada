const fs = require('fs');
function log(m) { fs.appendFileSync('/tmp/dbg.log', m + '\n'); }
process.on('exit', (code) => log('PROCESS EXIT code=' + code));
process.on('uncaughtException', (e) => log('UNCAUGHT: ' + (e.stack || e)));
process.on('unhandledRejection', (e) => log('UNHANDLED REJECTION: ' + (e && e.stack || e)));
log('start');

require('dotenv').config();
log('after dotenv');
const express = require('express');
log('after express');
const cors = require('cors');
log('after cors');
const morgan = require('morgan');
log('after morgan');
const path = require('path');
log('after path');

const { probarConexion } = require('./config/db');
log('after config/db');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
log('after error.middleware');

const authRoutes = require('./routes/auth.routes');
log('after auth.routes');
const configuracionRoutes = require('./routes/configuracion.routes');
log('after configuracion.routes');
const nivelesRoutes = require('./routes/niveles.routes');
log('after niveles.routes');
const horariosRoutes = require('./routes/horarios.routes');
log('after horarios.routes');
const instrumentosRoutes = require('./routes/instrumentos.routes');
log('after instrumentos.routes');
const miembrosRoutes = require('./routes/miembros.routes');
log('after miembros.routes');
const asistenciasRoutes = require('./routes/asistencias.routes');
log('after asistencias.routes');
const mensualidadesRoutes = require('./routes/mensualidades.routes');
log('after mensualidades.routes');
const multasRoutes = require('./routes/multas.routes');
log('after multas.routes');
const eventosRoutes = require('./routes/eventos.routes');
log('after eventos.routes');
const plantillasRoutes = require('./routes/plantillas.routes');
log('after plantillas.routes');
const comunicacionesRoutes = require('./routes/comunicaciones.routes');
log('after comunicaciones.routes');
const reportesRoutes = require('./routes/reportes.routes');
log('after reportes.routes');
const importacionRoutes = require('./routes/importacion.routes');
log('after importacion.routes');
const exportacionRoutes = require('./routes/exportacion.routes');
log('after exportacion.routes');

const app = express();
log('after express app created');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
log('after basic middleware');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
log('after static');

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api/configuracion', configuracionRoutes);
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
log('after all routes mounted');

app.use(notFound);
app.use(errorHandler);
log('after error handlers');

const PORT = process.env.PORT || 4000;
log('about to listen on port ' + PORT);

const server = app.listen(PORT, async () => {
  log('LISTEN CALLBACK FIRED');
  await probarConexion();
  log('after probarConexion');
});
server.on('error', (e) => log('SERVER ERROR EVENT: ' + (e.stack || e)));
log('listen() call returned');
