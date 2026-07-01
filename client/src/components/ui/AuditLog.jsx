import { useState } from 'react';
import './AuditLog.css';

const ETIQUETAS_ACCION = {
  CREATE: 'Creación',
  UPDATE: 'Edición',
  DELETE: 'Eliminación',
  LOGIN: 'Inicio de sesión',
  IMPORT: 'Importación',
  EXPORT: 'Exportación',
};

const POR_PAGINA = 15;

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  const fecha = new Date(fechaIso);
  return fecha.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Sublista de auditoría reutilizable con paginación cliente (15 por página).
 */
export default function AuditLog({ registros = [], cargando = false }) {
  const [pagina, setPagina] = useState(1);

  if (cargando) return <p className="audit-log__estado">Cargando auditoría...</p>;
  if (!registros.length) return <p className="audit-log__estado">Aún no hay movimientos registrados.</p>;

  const totalPaginas = Math.ceil(registros.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const slice = registros.slice(inicio, inicio + POR_PAGINA);

  return (
    <div className="audit-log">
      <table className="audit-log__tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Campo</th>
            <th>Valor anterior</th>
            <th>Valor nuevo</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((r) => (
            <tr key={r.id}>
              <td>{formatearFecha(r.fecha_hora)}</td>
              <td>{ETIQUETAS_ACCION[r.accion] || r.accion}</td>
              <td>{r.campo_modificado || '—'}</td>
              <td className="audit-log__valor">{r.valor_anterior ?? '—'}</td>
              <td className="audit-log__valor">{r.valor_nuevo ?? '—'}</td>
              <td>{r.usuario_nombre || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="audit-log__paginacion">
          <button
            className="audit-log__pag-btn"
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            ‹ Anterior
          </button>
          <span className="audit-log__pag-info">
            Página {pagina} de {totalPaginas}
            <span className="audit-log__pag-total"> · {registros.length} registros</span>
          </span>
          <button
            className="audit-log__pag-btn"
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}
