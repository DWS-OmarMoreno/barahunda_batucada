import './Tabs.css';

/**
 * Pestañas simples para vistas de detalle (Miembros, Eventos, etc.)
 * pestanas: [{ clave, titulo }]
 */
export default function Tabs({ pestanas, activa, onChange }) {
  return (
    <div className="tabs">
      <div className="tabs__lista" role="tablist">
        {pestanas.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={activa === p.clave}
            className={`tabs__boton ${activa === p.clave ? 'tabs__boton--activo' : ''}`}
            onClick={() => onChange(p.clave)}
          >
            {p.titulo}
          </button>
        ))}
      </div>
    </div>
  );
}
