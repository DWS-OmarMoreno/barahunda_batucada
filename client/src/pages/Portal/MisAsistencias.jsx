import { useState, useEffect, useCallback } from 'react';
import { obtenerMisAsistenciasFull } from '../../services/portal.service';
import './Portal.css';

const ESTADO_LABELS = {
  A_TIEMPO: { texto: 'A tiempo', cls: 'portal__badge--success' },
  TARDE:    { texto: 'Tarde',    cls: 'portal__badge--warning' },
  AUSENTE:  { texto: 'Ausente',  cls: 'portal__badge--danger'  },
};

function EstadoBadge({ estado }) {
  const info = ESTADO_LABELS[estado] || { texto: estado, cls: '' };
  return <span className={`portal__badge ${info.cls}`}>{info.texto}</span>;
}

export default function MisAsistencias() {
  const [contadores, setContadores]   = useState({ A_TIEMPO: 0, TARDE: 0, AUSENTE: 0, total: 0 });
  const [registros, setRegistros]     = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [pagina, setPagina]           = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalReg, setTotalReg]       = useState(0);
  const LIMITE = 20;

  const cargar = useCallback(async (pag = 1) => {
    setCargando(true);
    try {
      const r = await obtenerMisAsistenciasFull({ pagina: pag, limite: LIMITE });
      const data = r.data ?? r;
      setContadores(data.contadores ?? { A_TIEMPO: 0, TARDE: 0, AUSENTE: 0, total: 0 });
      setRegistros(data.registros ?? []);
      const paginacion = r.pagination ?? {};
      setTotalPaginas(paginacion.pages ?? 1);
      setTotalReg(paginacion.total ?? (data.registros?.length ?? 0));
    } catch {
      setRegistros([]);
      setContadores({ A_TIEMPO: 0, TARDE: 0, AUSENTE: 0, total: 0 });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(pagina); }, [cargar, pagina]);

  function cambiarPagina(nueva) {
    if (nueva < 1 || nueva > totalPaginas) return;
    setPagina(nueva);
  }

  return (
    <div className="portal__seccion">
      <h1>Mis asistencias</h1>

      {/* Contadores */}
      <div className="portal__indicadores">
        <div className="portal__indicador">
          <span>{contadores.total}</span>
          <small>Total</small>
        </div>
        <div className="portal__indicador portal__indicador--success">
          <span>{contadores.A_TIEMPO ?? 0}</span>
          <small>A tiempo</small>
        </div>
        <div className="portal__indicador portal__indicador--warning">
          <span>{contadores.TARDE ?? 0}</span>
          <small>Tarde</small>
        </div>
        <div className="portal__indicador portal__indicador--danger">
          <span>{contadores.AUSENTE ?? 0}</span>
          <small>Ausentes</small>
        </div>
      </div>

      {/* Tabla de historial */}
      <div className="portal__tabla-wrap">
        {cargando ? (
          <p className="portal__cargando">Cargando...</p>
        ) : registros.length === 0 ? (
          <p className="portal__vacio">No hay registros de asistencia aún.</p>
        ) : (
          <table className="portal__tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nivel</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => (
                <tr key={`${r.fecha}_${r.nivel_id}_${i}`} className={r.sintetico ? 'portal__fila--sintetica' : ''}>
                  <td>{String(r.fecha).slice(0, 10)}</td>
                  <td>{r.nivel_nombre}</td>
                  <td><EstadoBadge estado={r.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="portal__paginacion">
          <button
            className="portal__pag-btn"
            onClick={() => cambiarPagina(pagina - 1)}
            disabled={pagina <= 1}
          >
            ← Anterior
          </button>
          <span className="portal__pag-info">
            Página {pagina} de {totalPaginas} ({totalReg} registros)
          </span>
          <button
            className="portal__pag-btn"
            onClick={() => cambiarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
