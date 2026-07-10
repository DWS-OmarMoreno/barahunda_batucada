import { useState, useEffect, useCallback } from 'react';
import { obtenerMisAsistencias } from '../../services/portal.service';
import './Portal.css';

function primerDiaMesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function ultimoDiaMesActual() {
  const d = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MisAsistencias() {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ fecha_desde: primerDiaMesActual(), fecha_hasta: ultimoDiaMesActual() });

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

      <div className="portal__filtros">
        <input type="date" value={filtros.fecha_desde} onChange={(e) => setFiltros((p) => ({ ...p, fecha_desde: e.target.value }))} className="portal__input" title="Desde" />
        <input type="date" value={filtros.fecha_hasta} onChange={(e) => setFiltros((p) => ({ ...p, fecha_hasta: e.target.value }))} className="portal__input" title="Hasta" />
      </div>

      {cargando ? (
        <p className="portal__cargando">Cargando...</p>
      ) : (
        <div className="portal__indicadores">
          <div className="portal__indicador"><span>{resumen.total}</span><small>Total</small></div>
          <div className="portal__indicador portal__indicador--success"><span>{resumen.A_TIEMPO}</span><small>A tiempo</small></div>
          <div className="portal__indicador portal__indicador--warning"><span>{resumen.TARDE}</span><small>Tarde</small></div>
          <div className="portal__indicador portal__indicador--danger"><span>{resumen.AUSENTE}</span><small>Ausentes</small></div>
        </div>
      )}
    </div>
  );
}
