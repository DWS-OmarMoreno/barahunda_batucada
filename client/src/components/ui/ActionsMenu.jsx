import { useState, useRef, useEffect } from 'react';
import './ActionsMenu.css';

/**
 * Menú desplegable de acciones para filas de tabla.
 *
 * Props:
 *   acciones: Array<{
 *     etiqueta: string,
 *     onClick: () => void,
 *     variant?: 'default' | 'danger',
 *     disabled?: boolean,
 *     visible?: boolean,   // si false, la acción no aparece
 *   }>
 */
export default function ActionsMenu({ acciones = [] }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return undefined;
    function cerrar(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  const visibles = acciones.filter((a) => a.visible !== false);
  if (visibles.length === 0) return null;

  return (
    <div className="actions-menu" ref={ref}>
      <button
        type="button"
        className="actions-menu__trigger"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="true"
        aria-expanded={abierto}
      >
        Acciones <span className="actions-menu__chevron">{abierto ? '▴' : '▾'}</span>
      </button>

      {abierto && (
        <ul className="actions-menu__lista" role="menu">
          {visibles.map((accion) => (
            <li key={accion.etiqueta} role="none">
              <button
                type="button"
                role="menuitem"
                className={`actions-menu__item ${accion.variant === 'danger' ? 'actions-menu__item--danger' : ''}`}
                disabled={accion.disabled}
                onClick={() => {
                  setAbierto(false);
                  accion.onClick();
                }}
              >
                {accion.etiqueta}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
