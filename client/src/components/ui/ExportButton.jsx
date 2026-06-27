import { useState } from 'react';
import Button from './Button';
import './ExportButton.css';

/**
 * Par de botones para exportar un reporte en Excel o PDF.
 * onExportar(formato) debe llamar al service (reportes.service.js -> exportarReporte)
 * y devolver una promesa; este componente solo maneja el estado de carga.
 */
export default function ExportButton({ onExportar, disabled = false }) {
  const [exportando, setExportando] = useState(null); // null | 'excel' | 'pdf'
  const [error, setError] = useState('');

  async function manejarExportar(formato) {
    setExportando(formato);
    setError('');
    try {
      await onExportar(formato);
    } catch {
      setError('No se pudo generar el archivo.');
    } finally {
      setExportando(null);
    }
  }

  return (
    <div className="export-button">
      <div className="export-button__botones">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !!exportando}
          loading={exportando === 'excel'}
          onClick={() => manejarExportar('excel')}
        >
          Excel
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !!exportando}
          loading={exportando === 'pdf'}
          onClick={() => manejarExportar('pdf')}
        >
          PDF
        </Button>
      </div>
      {error && <span className="export-button__error">{error}</span>}
    </div>
  );
}
