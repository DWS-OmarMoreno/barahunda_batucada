// Configuración de Multer para subida de archivos (logo de la escuela,
// soportes de pago, plantillas de importación, etc.)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

function crearUploader({ carpeta, tiposPermitidos, maxSizeMB = 5 }) {
  const destino = path.join(__dirname, '..', 'uploads', carpeta);
  if (!fs.existsSync(destino)) fs.mkdirSync(destino, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destino),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const nombre = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, nombre);
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!tiposPermitidos || tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
      }
    },
  });
}

const uploadLogo = crearUploader({
  carpeta: 'logos',
  tiposPermitidos: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
  maxSizeMB: 3,
});

const uploadSoporte = crearUploader({
  carpeta: 'soportes',
  tiposPermitidos: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
  maxSizeMB: 5,
});

const uploadImportacion = crearUploader({
  carpeta: 'importaciones',
  tiposPermitidos: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ],
  maxSizeMB: 10,
});

module.exports = { uploadLogo, uploadSoporte, uploadImportacion };
