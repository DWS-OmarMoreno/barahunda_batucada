import './Modal.css';

/**
 * Modal genérico: título, contenido y footer de acciones.
 */
export default function Modal({ abierto, titulo, onClose, children, footer, ancho = 'md' }) {
  if (!abierto) return null;

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className={`modal modal--${ancho}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__header">
          <h2 className="modal__titulo">{titulo}</h2>
          <button className="modal__cerrar" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal__contenido">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
