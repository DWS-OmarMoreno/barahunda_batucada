import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { obtenerDashboard } from '../../services/reportes.service';
import KPICard from '../../components/ui/KPICard';
import SubList from '../../components/ui/SubList';
import StatusBadge from '../../components/ui/StatusBadge';
import WhatsAppButton from '../../components/ui/WhatsAppButton';
import { formatearMoneda, formatearFecha } from '../../utils/formato';
import './Dashboard.css';

// Paleta fija para la gráfica de dona (independiente del tema, ya que el
// número de niveles es variable y el tema solo define unos pocos colores).
const PALETA_NIVELES = ['#2563eb', '#f59e0b', '#16a34a', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

function formatearMonedaCorta(valor) {
  const numero = Number(valor || 0);
  if (Math.abs(numero) >= 1000000) return `$${(numero / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(numero) >= 1000) return `$${Math.round(numero / 1000)}K`;
  return formatearMoneda(numero);
}

// ---------- Gráfico de barras: pagos por mes ----------
function GraficoBarras({ datos }) {
  const ancho = 560;
  const alto = 220;
  const margenInferior = 28;
  const margenSuperior = 24;
  const alturaDisponible = alto - margenInferior - margenSuperior;
  const max = Math.max(1, ...datos.map((d) => d.total));
  const anchoBarraSlot = ancho / datos.length;
  const anchoBarra = anchoBarraSlot * 0.5;

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="dashboard__grafico-svg" role="img" aria-label="Pagos por mes">
      {datos.map((d, i) => {
        const alturaBarra = d.total > 0 ? (d.total / max) * alturaDisponible : 0;
        const x = i * anchoBarraSlot + (anchoBarraSlot - anchoBarra) / 2;
        const y = margenSuperior + (alturaDisponible - alturaBarra);
        return (
          <g key={`${d.mes}-${d.anio}`}>
            <rect x={x} y={y} width={anchoBarra} height={Math.max(alturaBarra, 1)} rx="3" fill="var(--color-primary)" />
            <text x={x + anchoBarra / 2} y={y - 6} textAnchor="middle" className="dashboard__grafico-valor">
              {formatearMonedaCorta(d.total)}
            </text>
            <text x={x + anchoBarra / 2} y={alto - margenInferior + 16} textAnchor="middle" className="dashboard__grafico-etiqueta">
              {d.etiqueta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- Gráfico de dona: miembros por nivel ----------
function GraficoDona({ datos }) {
  const total = datos.reduce((acc, d) => acc + d.total, 0);
  const radio = 70;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;

  if (total === 0) {
    return <p className="dashboard__grafico-vacio">No hay miembros activos asignados a un nivel.</p>;
  }

  return (
    <div className="dashboard__dona-contenedor">
      <svg viewBox="0 0 180 180" className="dashboard__grafico-svg dashboard__grafico-svg--dona" role="img" aria-label="Miembros por nivel">
        <g transform="rotate(-90 90 90)">
          {datos.map((d, i) => {
            const proporcion = d.total / total;
            const largo = proporcion * circunferencia;
            const offset = acumulado;
            acumulado += largo;
            if (d.total === 0) return null;
            return (
              <circle
                key={d.nivel_id}
                cx="90"
                cy="90"
                r={radio}
                fill="none"
                stroke={PALETA_NIVELES[i % PALETA_NIVELES.length]}
                strokeWidth="26"
                strokeDasharray={`${largo} ${circunferencia - largo}`}
                strokeDashoffset={-offset}
              />
            );
          })}
        </g>
        <text x="90" y="84" textAnchor="middle" className="dashboard__dona-total-valor">{total}</text>
        <text x="90" y="102" textAnchor="middle" className="dashboard__dona-total-etiqueta">miembros</text>
      </svg>
      <ul className="dashboard__dona-leyenda">
        {datos.map((d, i) => (
          <li key={d.nivel_id}>
            <span className="dashboard__dona-color" style={{ background: PALETA_NIVELES[i % PALETA_NIVELES.length] }} />
            {d.nivel_nombre} ({d.total})
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Gráfico de línea: asistencia por semana ----------
function GraficoLinea({ datos }) {
  const ancho = 560;
  const alto = 200;
  const margen = { top: 24, bottom: 30, left: 12, right: 12 };
  const alturaDisponible = alto - margen.top - margen.bottom;
  const anchoDisponible = ancho - margen.left - margen.right;
  const paso = datos.length > 1 ? anchoDisponible / (datos.length - 1) : 0;

  const puntos = datos.map((d, i) => ({
    ...d,
    x: margen.left + i * paso,
    y: margen.top + alturaDisponible - (d.porcentaje / 100) * alturaDisponible,
  }));

  const lineaPath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="dashboard__grafico-svg" role="img" aria-label="Asistencia por semana">
      {[0, 50, 100].map((marca) => {
        const y = margen.top + alturaDisponible - (marca / 100) * alturaDisponible;
        return <line key={marca} x1={margen.left} x2={ancho - margen.right} y1={y} y2={y} className="dashboard__grafico-grilla" />;
      })}
      <path d={lineaPath} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
      {puntos.map((p) => (
        <g key={p.desde}>
          <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="dashboard__grafico-valor">{p.porcentaje}%</text>
          <text x={p.x} y={alto - margen.bottom + 16} textAnchor="middle" className="dashboard__grafico-etiqueta">{p.etiqueta}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const respuesta = await obtenerDashboard();
      setDatos(respuesta.data);
    } catch {
      setError('No se pudieron cargar los indicadores del dashboard.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="dashboard">
        <p className="dashboard__estado">Cargando indicadores...</p>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="dashboard">
        <p className="dashboard__estado dashboard__estado--error">{error || 'No hay datos disponibles.'}</p>
      </div>
    );
  }

  const { kpis, pagos_por_mes, miembros_por_nivel, asistencia_por_semana, alertas } = datos;
  const porcentajeRecaudo = kpis.pagos_mes_esperado > 0
    ? Math.round((kpis.pagos_mes_recaudado / kpis.pagos_mes_esperado) * 100)
    : 0;

  return (
    <div className="dashboard">
      <h1>Hola, {usuario?.nombre} 👋</h1>

      <div className="dashboard__kpis">
        <KPICard titulo="Miembros activos" valor={kpis.miembros_activos} variant="info" />
        <KPICard
          titulo="Pagos del mes"
          valor={formatearMoneda(kpis.pagos_mes_recaudado)}
          subtitulo={`${porcentajeRecaudo}% de ${formatearMoneda(kpis.pagos_mes_esperado)} esperado`}
          variant="success"
        />
        <KPICard
          titulo="Asistencia promedio"
          valor={`${kpis.asistencia_promedio_pct}%`}
          subtitulo="Mes en curso"
          variant={kpis.asistencia_promedio_pct >= 80 ? 'success' : 'warning'}
        />
        <KPICard
          titulo="Multas pendientes"
          valor={formatearMoneda(kpis.multas_pendientes_total)}
          subtitulo={`${kpis.multas_pendientes_cantidad} multa(s)`}
          variant={kpis.multas_pendientes_cantidad > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="dashboard__graficos">
        <div className="dashboard__grafico-card">
          <h2>Pagos por mes</h2>
          {pagos_por_mes.every((d) => d.total === 0) ? (
            <p className="dashboard__grafico-vacio">No hay pagos registrados en los últimos meses.</p>
          ) : (
            <GraficoBarras datos={pagos_por_mes} />
          )}
        </div>

        <div className="dashboard__grafico-card">
          <h2>Miembros por nivel</h2>
          <GraficoDona datos={miembros_por_nivel} />
        </div>

        <div className="dashboard__grafico-card dashboard__grafico-card--ancho">
          <h2>Asistencia por semana</h2>
          <GraficoLinea datos={asistencia_por_semana} />
        </div>
      </div>

      <div className="dashboard__alertas">
        <SubList
          titulo={`Miembros con 2+ meses pendientes (${alertas.miembros_dos_mas_meses_pendientes.length})`}
          vacio={alertas.miembros_dos_mas_meses_pendientes.length === 0}
          vacioTexto="No hay miembros con dos o más meses pendientes."
        >
          <ul className="dashboard__lista-alerta">
            {alertas.miembros_dos_mas_meses_pendientes.map((m) => (
              <li key={m.miembro_id}>
                <div>
                  <strong>{m.nombres_completos}</strong>
                  <span className="dashboard__lista-alerta-sub">{m.nivel_nombre || 'Sin nivel'} · {m.numero_documento}</span>
                </div>
                {m.whatsapp ? (
                  <WhatsAppButton
                    numero={m.whatsapp}
                    mensaje={`Hola ${m.nombres_completos}, te recordamos que tienes mensualidades pendientes por pagar.`}
                  >
                    WhatsApp
                  </WhatsAppButton>
                ) : (
                  <StatusBadge texto="Sin WhatsApp" variant="secondary" />
                )}
              </li>
            ))}
          </ul>
        </SubList>

        <SubList
          titulo={`Multas sin pagar (${alertas.multas_sin_pagar.length})`}
          vacio={alertas.multas_sin_pagar.length === 0}
          vacioTexto="No hay multas pendientes de pago."
        >
          <ul className="dashboard__lista-alerta">
            {alertas.multas_sin_pagar.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.miembro_nombre}</strong>
                  <span className="dashboard__lista-alerta-sub">{formatearFecha(m.fecha_generada)} · {formatearMoneda(m.valor)}</span>
                </div>
                <StatusBadge texto="Pendiente" variant="danger" />
              </li>
            ))}
          </ul>
        </SubList>

        <SubList
          titulo={`Asistencia obligatoria (${alertas.miembros_asistencia_obligatoria.length})`}
          vacio={alertas.miembros_asistencia_obligatoria.length === 0}
          vacioTexto="No hay miembros con asistencia obligatoria activa."
        >
          <ul className="dashboard__lista-alerta">
            {alertas.miembros_asistencia_obligatoria.map((m) => (
              <li key={m.miembro_id}>
                <div>
                  <strong>{m.nombres_completos}</strong>
                  <span className="dashboard__lista-alerta-sub">
                    {m.nivel_nombre ? `${m.nivel_nombre} · ` : ''}{m.numero_documento}
                  </span>
                  <span className="dashboard__lista-alerta-sub">{m.motivos.join(' · ')}</span>
                </div>
                {m.whatsapp ? (
                  <WhatsAppButton
                    numero={m.whatsapp}
                    mensaje={`Hola ${m.nombres_completos}, te recordamos que tu asistencia a las clases es obligatoria.`}
                  >
                    WhatsApp
                  </WhatsAppButton>
                ) : (
                  <StatusBadge texto="Sin WhatsApp" variant="secondary" />
                )}
              </li>
            ))}
          </ul>
        </SubList>
      </div>
    </div>
  );
}
