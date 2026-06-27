import './SubList.css';

/**
 * Contenedor estándar para sublistas dentro de un registro
 * (niveles de un miembro, contactos, pagos, participantes de un evento, etc.)
 */
export default function SubList({ titulo, accion, children, vacio = false, vacioTexto = 'No hay registros.' }) {
  return (
    <div className="sublist">
      {(titulo || accion) && (
        <div className="sublist__header">
          {titulo && <h3 className="sublist__titulo">{titulo}</h3>}
          {accion}
        </div>
      )}
      {vacio ? <p className="sublist__vacio">{vacioTexto}</p> : <div className="sublist__contenido">{children}</div>}
    </div>
  );
}
