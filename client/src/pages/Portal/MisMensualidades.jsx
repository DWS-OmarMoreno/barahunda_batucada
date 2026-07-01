import { useState, useEffect } from 'react';
import { obtenerMisMensualidades } from '../../services/portal.service';
import { formatearFecha, formatearMoneda, NOMBRES_MES } from '../../utils/formato';
import './Portal.css';

export default function MisMensualidades() {
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerMisMensualidades()
      .then((r) => setPagos(r.data))
      .catch(() => setPagos([]))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="portal__seccion">
      <h1>Mis pagos</h1>
      <p className="portal__nota">Historial de mensualidades registradas por la escuela.</p>

      {cargando ? (
        <p className="portal__cargando">Cargando...</p>
      ) : pagos.length === 0 ? (
        <p className="portal__vacio">No hay pagos registrados aún.</p>
      ) : (
        <div className="portal__tabla-wrapper">
          <table className="portal__tabla">
            <thead>
              <tr><th>Período</th><th>Valor</th><th>Fecha de pago</th><th>Observaciones</th></tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id}>
                  <td>{NOMBRES_MES[(p.mes_correspondiente || 1) - 1]} {p.anio_correspondiente}</td>
                  <td>{formatearMoneda(p.valor)}</td>
                  <td>{formatearFecha(p.fecha_pago)}</td>
                  <td>{p.observaciones || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
