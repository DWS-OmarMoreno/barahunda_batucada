import { useState, useEffect, useCallback } from 'react';
import { obtenerMisAsistencias } from '../../services/portal.service';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatearFecha, formatearHora } from '../../utils/formato';
import './Portal.css';

const ETIQUETAS = { A_TIEMPO: 'A tiempo', TARDE: 'Tarde', AUSENTE: 'Ausente' };
const VARIANTES = { A_TIEMPO: 'success', TARDE: 'warning', AUSENTE: 'danger' };

export default function MisAsistencias() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ fecha_desde: '', fecha_hasta: '', estado: '' });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await obtenerMisAsistencias(filtros);
      setRegistros(r.data);
    } catch { setRegistros([]); }
    finally { setCargando(false); }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  const resumen = registros.reduce(
    (acc, f) => { acc[f.estado] = (acc[f.estado] || 0) + 1; acc.total += 1; return acc; },
    { A_TIEMPO: 0, TARDE: 0, AUSENTE: 0, total: 0 }
  );

  return (
    <div className="portal__seccion">
      <h1>Mis asistencias</h1>

      <div className="portal__indicadores">
        <div className="portal__indicador"><span>{resumen.total}</span><small>Total</small></div>
        <div className="portal__indicador portal__indicador--success"><span>{resumen.A_TIEMPO}</span><small>A tiempo</small></div>
        <div className="portal__indicador portal__indicador--warning"><span>{resumen.TARDE}</span><small>Tarde</small></div>
        <div className="portal__indicador portal__indicador--danger"><span>{resumen.AUSENTE}</span><small>Ausentes</small></div>
      </div>

      <div className="portal__filtros">
        <input type="date" value={filtros.fecha_desde} onChange={(e) => setFiltros((p) => ({ ...p, fecha_desde: e.target.value }))} className="portal__input" title="Desde" />
        <input type="date" value={filtros.fecha_hasta} onChange={(e) => setFiltros((p) => ({ ...p, fecha_hasta: e.target.value }))} className="portal__input" title="Hasta" />
        <select value={filtros.estado} onChange={(e) => setFiltros((p) => ({ ...p, estado: e.target.value }))} className="portal__input">
          <option value="">Todos los estados</option>
          <option value="A_TIEMPO">A tiempo</option>
          <option value="TARDE">Tarde</option>
          <option value="AUSENTE">Ausente</option>
        </select>
      </div>

      {cargando ? (
        <p className="portal__cargando">Cargando...</p>
      ) : registros.length === 0 ? (
        <p className="portal__vacio">No hay registros con estos filtros.</p>
      ) : (
        <div className="portal__tabla-wrapper">
          <table className="portal__tabla">
            <thead>
              <tr><th>Fecha</th><th>Hora</th><th>Nivel</th><th>Estado</th><th>Retraso</th></tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{formatearFecha(r.fecha)}</td>
                  <td>{formatearHora(r.hora)}</td>
                  <td>{r.nivel_nombre}</td>
                  <td>
                    <StatusBadge texto={ETIQUETAS[r.estado] || r.estado} variant={VARIANTES[r.estado] || 'secondary'} />
                    {r.modificado_manualmente ? <span className="portal__badge-manual"> ✎</span> : null}
                  </td>
                  <td>{r.minutos_retraso > 0 ? `${r.minutos_retraso} min` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
