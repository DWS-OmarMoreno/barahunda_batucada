import './KPICard.css';

/**
 * Tarjeta de indicador (KPI) para el Dashboard.
 * variant: 'default' | 'success' | 'danger' | 'warning' | 'info'
 */
export default function KPICard({ titulo, valor, subtitulo, variant = 'default' }) {
  return (
    <div className={`kpi-card kpi-card--${variant}`}>
      <span className="kpi-card__titulo">{titulo}</span>
      <span className="kpi-card__valor">{valor}</span>
      {subtitulo && <span className="kpi-card__subtitulo">{subtitulo}</span>}
    </div>
  );
}
