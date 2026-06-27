import './AuditLog.css';

const ETIQUETAS_ACCION = {
  CREATE: 'Creación',
  UPDATE: 'Edición',
  DELETE: 'Eliminación',
  LOGIN: 'Inicio de sesión',
  IMPORT: 'Importación',
  EXPORT: 'Exportación',
};

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  const fecha = new Date(fechaIso);
  return fecha.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Sublista de auditoría reutilizable: fecha, acción, campo, valor
 * anterior, valor nuevo y usuario. Se usa en el detalle de cada módulo.
 */
export default function AuditLog({ registros = [], cargando = false }) {
  if (cargando) return <p className="audit-log__estado">Cargando auditoría...</p>;

  if (!registros.length) {
    return <p className="audit-log__estado">Aún no hay movimientos registrados.</p>;
  }

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
          {registros.map((r) => (
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
    </div>
  );
}
