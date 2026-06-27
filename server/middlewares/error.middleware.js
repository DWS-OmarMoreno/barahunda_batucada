// Manejo global de errores — siempre responde en español y con la
// estructura estándar { success, data, message }
function notFound(req, res) {
  res.status(404).json({ success: false, data: null, message: 'Recurso no encontrado' });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  // Errores conocidos de Multer (subida de archivos)
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ success: false, data: null, message: `Error al subir el archivo: ${err.message}` });
  }

  // Errores de duplicado en MySQL (unique constraint)
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, data: null, message: 'Ya existe un registro con esos datos' });
  }

  const status = err.status || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor';
  res.status(status).json({ success: false, data: null, message });
}

module.exports = { notFound, errorHandler };
