import { useState, useRef } from 'react';
import './UploadField.css';

/**
 * Campo de upload con drag & drop y previsualización (imágenes) o nombre
 * de archivo (PDF/Excel).
 */
export default function UploadField({ label, accept, previewUrl, onFileSelected, error, helpText }) {
  const [arrastrando, setArrastrando] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const inputRef = useRef(null);

  function manejarArchivo(file) {
    if (!file) return;
    setNombreArchivo(file.name);
    onFileSelected?.(file);
  }

  return (
    <div className="upload-field">
      {label && <label className="upload-field__label">{label}</label>}
      <div
        className={`upload-field__zona ${arrastrando ? 'upload-field__zona--activa' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastrando(false);
          manejarArchivo(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Previsualización" className="upload-field__preview" />
        ) : (
          <div className="upload-field__placeholder">
            <span>📎 Arrastra un archivo aquí o haz clic para seleccionar</span>
            {nombreArchivo && <strong>{nombreArchivo}</strong>}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="upload-field__input"
          onChange={(e) => manejarArchivo(e.target.files?.[0])}
        />
      </div>
      {helpText && !error && <span className="upload-field__help">{helpText}</span>}
      {error && <span className="upload-field__error">{error}</span>}
    </div>
  );
}
