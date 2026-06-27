import './DataTable.css';

/**
 * Tabla genérica con búsqueda, filtros, paginación server-side y acciones por fila.
 *
 * columnas: [{ clave, titulo, ancho?, render?(fila) }]
 * busqueda: { valor, onChange(valor), placeholder? }
 * filtros: nodo opcional (selects, etc.) renderizado junto a la búsqueda
 * paginacion: { pagina, totalPaginas, total?, onCambiarPagina(pagina) }
 * acciones: (fila) => nodo con los botones de la fila
 */
export default function DataTable({
  columnas,
  datos = [],
  cargando = false,
  claveFila = (fila) => fila.id,
  busqueda,
  filtros,
  paginacion,
  acciones,
  vacioTexto = 'No hay registros para mostrar.',
}) {
  const colSpan = columnas.length + (acciones ? 1 : 0);

  return (
    <div className="data-table">
      {(busqueda || filtros) && (
        <div className="data-table__barra">
          {busqueda && (
            <input
              type="search"
              className="data-table__busqueda"
              placeholder={busqueda.placeholder || 'Buscar...'}
              value={busqueda.valor}
              onChange={(e) => busqueda.onChange(e.target.value)}
            />
          )}
          {filtros && <div className="data-table__filtros">{filtros}</div>}
        </div>
      )}

      <div className="data-table__scroll">
        <table className="data-table__tabla">
          <thead>
            <tr>
              {columnas.map((col) => (
                <th key={col.clave} style={col.ancho ? { width: col.ancho } : undefined}>
                  {col.titulo}
                </th>
              ))}
              {acciones && <th className="data-table__th-acciones">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={colSpan} className="data-table__estado">Cargando...</td>
              </tr>
            ) : datos.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table__estado">{vacioTexto}</td>
              </tr>
            ) : (
              datos.map((fila) => (
                <tr key={claveFila(fila)}>
                  {columnas.map((col) => (
                    <td key={col.clave}>{col.render ? col.render(fila) : fila[col.clave]}</td>
                  ))}
                  {acciones && <td className="data-table__acciones">{acciones(fila)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {paginacion && paginacion.totalPaginas > 1 && (
        <div className="data-table__paginacion">
          <button
            type="button"
            className="data-table__pag-btn"
            disabled={paginacion.pagina <= 1}
            onClick={() => paginacion.onCambiarPagina(paginacion.pagina - 1)}
          >
            ← Anterior
          </button>
          <span className="data-table__pag-info">
            Página {paginacion.pagina} de {paginacion.totalPaginas}
            {typeof paginacion.total === 'number' && ` · ${paginacion.total} registros`}
          </span>
          <button
            type="button"
            className="data-table__pag-btn"
            disabled={paginacion.pagina >= paginacion.totalPaginas}
            onClick={() => paginacion.onCambiarPagina(paginacion.pagina + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
