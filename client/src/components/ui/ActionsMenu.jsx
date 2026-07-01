import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './ActionsMenu.css';

/**
 * Menú desplegable de acciones para filas de tabla.
 * Usa un React portal para escapar del overflow del DataTable.
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
  const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const listaRef = useRef(null);

  const recalcularPosicion = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosicion({
      top: rect.bottom + 4,
      left: rect.right,
      width: rect.width,
    });
  }, []);

  // Abrir / recalcular posición
  const toggleAbierto = () => {
    if (!abierto) recalcularPosicion();
    setAbierto((v) => !v);
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return undefined;
    function cerrar(e) {
      if (
        listaRef.current && !listaRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [abierto]);

  // Cerrar al hacer scroll (la posición quedaría desfasada)
  useEffect(() => {
    if (!abierto) return undefined;
    function cerrarEnScroll() { setAbierto(false); }
    window.addEventListener('scroll', cerrarEnScroll, true);
    return () => window.removeEventListener('scroll', cerrarEnScroll, true);
  }, [abierto]);

  const visibles = acciones.filter((a) => a.visible !== false);
  if (visibles.length === 0) return null;

  const lista = abierto
    ? createPortal(
        <ul
          ref={listaRef}
          className="actions-menu__lista"
          role="menu"
          style={{
            position: 'fixed',
            top: posicion.top,
            left: posicion.left,
            transform: 'translateX(-100%)',
          }}
        >
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
        </ul>,
        document.body
      )
    : null;

  return (
    <div className="actions-menu">
      <button
        ref={triggerRef}
        type="button"
        className="actions-menu__trigger"
        onClick={toggleAbierto}
        aria-haspopup="true"
        aria-expanded={abierto}
      >
        Acciones <span className="actions-menu__chevron">{abierto ? '▴' : '▾'}</span>
      </button>
      {lista}
    </div>
  );
}
