import './Button.css';

/**
 * Botón base reutilizable.
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 */
export default function Button({ variant = 'primary', loading = false, children, className = '', disabled, ...props }) {
  return (
    <button
      className={`btn btn--${variant} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Cargando...' : children}
    </button>
  );
}
