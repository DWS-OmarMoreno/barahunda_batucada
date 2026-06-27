import './StatusBadge.css';

/**
 * Badge de estado con colores configurables.
 * variant: 'success' | 'danger' | 'warning' | 'secondary' | 'info'
 */
export default function StatusBadge({ texto, variant = 'secondary' }) {
  return <span className={`status-badge status-badge--${variant}`}>{texto}</span>;
}
