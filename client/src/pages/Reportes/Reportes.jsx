import { useState, useEffect, useMemo } from 'react';
import { listarReporte, exportarReporte } from '../../services/reportes.service';
import { listarNiveles } from '../../services/niveles.service';
import { listarMiembros } from '../../services/miembros.service';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import ExportButton from '../../components/ui/ExportButton';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatearMoneda, formatearFecha, formatearHora, NOMBRES_MES } from '../../utils/formato';
import './Reportes.css';

const ETIQUETAS_ESTADO_MENSUALIDAD = { PAGADO: 'Pagado', PARCIAL: 'Parcial', PENDIENTE: 'Pendiente' };
const VARIANTES_ESTADO_MENSUALIDAD = { PAGADO: 'success', PARCIAL: 'warning', PENDIENTE: 'danger' };
const ETIQUETAS_TIPO_MULTA = { TARDANZA: 'Tardanza', OTRA: 'Otra' };
const ETIQUETAS_ESTADO_MULTA = { PENDIENTE: 'Pendiente', PAGADA: 'Pagada', CONDONADA: 'Condonada' };
const VARIANTES_ESTADO_MULTA = { PENDIENTE: 'danger', PAGADA: 'success', CONDONADA: 'secondary' };
const ETIQUETAS_ESTADO_ASISTENCIA = { A_TIEMPO: 'A tiempo', TARDE: 'Tarde', AUSENTE: 'Ausente' };

const SEMAFORO_COLOR = { verde: '#22c55e', amarillo: '#f59e0b', rojo: '#ef4444' };
const SEMAFORO_BG = { verde: '#f0fdf4', amarillo: '#fffbeb', rojo: '#fef2f2' };

function SemaforoBadge({ valor }) {
  const color = SEMAFORO_COLOR[valor] || '#9ca3af';
  const bg = SEMAFORO_BG[valor] || '#f3f4f6';
  const etiqueta = valor === 'verde' ? 'Verde' : valor === 'amarillo' ? 'Amarillo' : 'Rojo';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: bg, color, border: `1px solid ${color}`,
      borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {etiqueta}
    </span>
  );
}

function AsistenciaMesCards({ datos }) {
  if (!datos?.length) return <p style={{ color: 'var(--color-secondary)', fontSize: 13 }}>No hay registros para estos filtros.</p>;
  return (
    <div className="reportes__cards-grid">
      {datos.map((f) => (
        <div key={f.miembro_id} className="reportes__asistencia-card">
          <div className="reportes__asistencia-card-header">
            <div>
              <strong>{f.nombres_completos}</strong>
              <span className="reportes__asistencia-card-doc">{f.numero_documento}</span>
            </div>
            <SemaforoBadge valor={f.semaforo} />
          </div>
          <div className="reportes__asistencia-card-niveles">{f.niveles_nombres}</div>
          <div className="reportes__asistencia-card-stats">
            <div><span>Clases del mes</span><strong>{f.clases_mes}</strong></div>
            <div><span>Ausencias del mes</span><strong>{f.ausencias_mes}</strong></div>
            <div><span>Ausencias consecutivas</span><strong>{f.ausencias_consecutivas}</strong></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Catálogo de los 6 reportes exportables del Módulo 10, con sus filtros y
// columnas de vista previa. `campos` usa directamente el nombre del parámetro
// que espera la API (mes, anio, nivel_id, miembro_id, estado, fecha_desde, fecha_hasta).
const REPORTES = [
  {
    clave: 'mensualidades',
    titulo: 'Mensualidades pagadas',
    descripcion: 'Miembros con la mensualidad del mes seleccionado totalmente pagada.',
    campos: ['mes', 'anio', 'nivel_id'],
    columnas: [
      { clave: 'nombres_completos', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'nivel_nombre', titulo: 'Nivel', render: (f) => f.nivel_nombre || '—' },
      { clave: 'valor_mensualidad', titulo: 'Valor mensualidad', render: (f) => formatearMoneda(f.valor_mensualidad) },
      { clave: 'total_pagado', titulo: 'Total pagado', render: (f) => formatearMoneda(f.total_pagado) },
    ],
  },
  {
    clave: 'pendientes',
    titulo: 'Miembros con pagos pendientes',
    descripcion: 'Miembros cuya mensualidad del mes seleccionado está parcial o sin pagar.',
    campos: ['mes', 'anio'],
    columnas: [
      { clave: 'nombres_completos', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'nivel_nombre', titulo: 'Nivel', render: (f) => f.nivel_nombre || '—' },
      { clave: 'total_pagado', titulo: 'Total pagado', render: (f) => formatearMoneda(f.total_pagado) },
      {
        clave: 'estado',
        titulo: 'Estado',
        render: (f) => <StatusBadge texto={ETIQUETAS_ESTADO_MENSUALIDAD[f.estado] || f.estado} variant={VARIANTES_ESTADO_MENSUALIDAD[f.estado] || 'secondary'} />,
      },
    ],
  },
  {
    clave: 'alDia',
    titulo: 'Miembros al día',
    descripcion: 'Miembros con la mensualidad del mes seleccionado completamente pagada.',
    campos: ['mes', 'anio'],
    columnas: [
      { clave: 'nombres_completos', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'nivel_nombre', titulo: 'Nivel', render: (f) => f.nivel_nombre || '—' },
      { clave: 'valor_mensualidad', titulo: 'Valor mensualidad', render: (f) => formatearMoneda(f.valor_mensualidad) },
    ],
  },
  {
    clave: 'multas',
    titulo: 'Historial de multas',
    descripcion: 'Multas generadas, filtrables por miembro, estado y rango de fechas.',
    campos: ['miembro_id', 'estado', 'fecha_desde', 'fecha_hasta'],
    columnas: [
      { clave: 'miembro_nombre', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'tipo', titulo: 'Tipo', render: (f) => ETIQUETAS_TIPO_MULTA[f.tipo] || f.tipo },
      { clave: 'valor', titulo: 'Valor', render: (f) => formatearMoneda(f.valor) },
      {
        clave: 'estado',
        titulo: 'Estado',
        render: (f) => <StatusBadge texto={ETIQUETAS_ESTADO_MULTA[f.estado] || f.estado} variant={VARIANTES_ESTADO_MULTA[f.estado] || 'secondary'} />,
      },
      { clave: 'fecha_generada', titulo: 'Fecha generada', render: (f) => formatearFecha(f.fecha_generada) },
      { clave: 'fecha_pago', titulo: 'Fecha pago', render: (f) => (f.fecha_pago ? formatearFecha(f.fecha_pago) : '—') },
    ],
  },
  {
    clave: 'asistenciaMiembro',
    titulo: 'Asistencia por miembro',
    descripcion: 'Historial de asistencia de un miembro en un rango de fechas.',
    campos: ['miembro_id', 'fecha_desde', 'fecha_hasta'],
    columnas: [
      { clave: 'miembro_nombre', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'nivel_nombre', titulo: 'Nivel' },
      { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha) },
      { clave: 'hora', titulo: 'Hora', render: (f) => formatearHora(f.hora) },
      { clave: 'estado', titulo: 'Estado', render: (f) => ETIQUETAS_ESTADO_ASISTENCIA[f.estado] || f.estado },
      { clave: 'minutos_retraso', titulo: 'Min. retraso' },
    ],
  },
  {
    clave: 'asistenciaNivel',
    titulo: 'Asistencia por nivel',
    descripcion: 'Historial de asistencia de un nivel completo en un rango de fechas.',
    campos: ['nivel_id', 'fecha_desde', 'fecha_hasta'],
    columnas: [
      { clave: 'nivel_nombre', titulo: 'Nivel' },
      { clave: 'miembro_nombre', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'fecha', titulo: 'Fecha', render: (f) => formatearFecha(f.fecha) },
      { clave: 'hora', titulo: 'Hora', render: (f) => formatearHora(f.hora) },
      { clave: 'estado', titulo: 'Estado', render: (f) => ETIQUETAS_ESTADO_ASISTENCIA[f.estado] || f.estado },
    ],
  },
  {
    clave: 'asistenciasMes',
    titulo: 'Asistencias por mes',
    descripcion: 'Por cada miembro activo: clases del mes, ausencias del mes y racha de ausencias consecutivas con semáforo. Ordenado por mayor riesgo.',
    campos: ['mes', 'anio'],
    renderPreview: (datos) => <AsistenciaMesCards datos={datos} />,
    columnas: [
      { clave: 'nombres_completos', titulo: 'Miembro' },
      { clave: 'numero_documento', titulo: 'Documento' },
      { clave: 'niveles_nombres', titulo: 'Niveles' },
      { clave: 'clases_mes', titulo: 'Clases del mes' },
      { clave: 'ausencias_mes', titulo: 'Ausencias del mes' },
      { clave: 'ausencias_consecutivas', titulo: 'Ausencias consecutivas' },
      { clave: 'semaforo', titulo: 'Semáforo', render: (f) => <SemaforoBadge valor={f.semaforo} /> },
    ],
  },
];

const CAMPO_CONFIG = {
  mes: { etiqueta: 'Mes', tipo: 'mes' },
  anio: { etiqueta: 'Año', tipo: 'anio' },
  nivel_id: { etiqueta: 'Nivel', tipo: 'nivel' },
  miembro_id: { etiqueta: 'Miembro', tipo: 'miembro' },
  estado: { etiqueta: 'Estado', tipo: 'estado-multa' },
  fecha_desde: { etiqueta: 'Desde', tipo: 'fecha' },
  fecha_hasta: { etiqueta: 'Hasta', tipo: 'fecha' },
};

function CampoFiltro({ campo, valor, onChange, niveles, miembros }) {
  const config = CAMPO_CONFIG[campo];

  if (config.tipo === 'mes') {
    return (
      <select className="reportes__select" value={valor} onChange={(e) => onChange(e.target.value)} title="Mes">
        {NOMBRES_MES.map((nombre, i) => (
          <option key={nombre} value={i + 1}>{nombre}</option>
        ))}
      </select>
    );
  }
  if (config.tipo === 'anio') {
    return (
      <input
        type="number"
        className="reportes__select reportes__select--anio"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        title="Año"
      />
    );
  }
  if (config.tipo === 'nivel') {
    return (
      <select className="reportes__select" value={valor} onChange={(e) => onChange(e.target.value)} title="Nivel">
        <option value="">Todos los niveles</option>
        {niveles.map((n) => (
          <option key={n.id} value={n.id}>{n.nombre}</option>
        ))}
      </select>
    );
  }
  if (config.tipo === 'miembro') {
    return (
      <select className="reportes__select" value={valor} onChange={(e) => onChange(e.target.value)} title="Miembro">
        <option value="">Todos los miembros</option>
        {miembros.map((m) => (
          <option key={m.id} value={m.id}>{m.nombres_completos}</option>
        ))}
      </select>
    );
  }
  if (config.tipo === 'estado-multa') {
    return (
      <select className="reportes__select" value={valor} onChange={(e) => onChange(e.target.value)} title="Estado">
        <option value="">Todos los estados</option>
        <option value="PENDIENTE">Pendiente</option>
        <option value="PAGADA">Pagada</option>
        <option value="CONDONADA">Condonada</option>
      </select>
    );
  }
  return (
    <input
      type="date"
      className="reportes__select"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      title={config.etiqueta}
    />
  );
}

function ReportCard({ reporte, niveles, miembros }) {
  const valoresIniciales = useMemo(() => {
    const ahora = new Date();
    const base = {};
    reporte.campos.forEach((campo) => {
      if (campo === 'mes') base.mes = String(ahora.getMonth() + 1);
      else if (campo === 'anio') base.anio = String(ahora.getFullYear());
      else base[campo] = '';
    });
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filtros, setFiltros] = useState(valoresIniciales);
  const [resultados, setResultados] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  function actualizar(campo, valor) {
    setFiltros((p) => ({ ...p, [campo]: valor }));
  }

  async function cargarPreview() {
    setCargando(true);
    setError('');
    setMostrarPreview(true);
    try {
      const respuesta = await listarReporte(reporte.clave, filtros);
      setResultados(respuesta.data);
    } catch {
      setError('No se pudo cargar la vista previa de este reporte.');
      setResultados([]);
    } finally {
      setCargando(false);
    }
  }

  async function exportar(formato) {
    await exportarReporte(reporte.clave, filtros, formato);
  }

  return (
    <div className="reportes__card">
      <div className="reportes__card-header">
        <div>
          <h2>{reporte.titulo}</h2>
          <p className="reportes__card-descripcion">{reporte.descripcion}</p>
        </div>
        <ExportButton onExportar={exportar} />
      </div>

      <div className="reportes__filtros">
        {reporte.campos.map((campo) => (
          <CampoFiltro
            key={campo}
            campo={campo}
            valor={filtros[campo]}
            onChange={(valor) => actualizar(campo, valor)}
            niveles={niveles}
            miembros={miembros}
          />
        ))}
        <Button type="button" variant="secondary" onClick={cargarPreview} loading={cargando}>
          Vista previa
        </Button>
      </div>

      {mostrarPreview && (
        error ? (
          <p className="reportes__error">{error}</p>
        ) : reporte.renderPreview ? (
          cargando ? <p style={{ fontSize: 13, color: 'var(--color-secondary)' }}>Cargando...</p> : reporte.renderPreview(resultados || [])
        ) : (
          <div className="reportes__tabla-scroll">
            <DataTable
              cargando={cargando}
              datos={resultados || []}
              columnas={reporte.columnas}
              vacioTexto="No hay registros para estos filtros."
            />
          </div>
        )
      )}
    </div>
  );
}

export default function Reportes() {
  const [niveles, setNiveles] = useState([]);
  const [miembros, setMiembros] = useState([]);

  useEffect(() => {
    listarNiveles({ activo: '1', limit: 200 }).then((r) => setNiveles(r.data)).catch(() => setNiveles([]));
    listarMiembros({ activo: '1', limit: 500 }).then((r) => setMiembros(r.data)).catch(() => setMiembros([]));
  }, []);

  return (
    <div className="reportes">
      <div>
        <h1>Reportes</h1>
        <p className="reportes__descripcion">Filtra, previsualiza y exporta cada reporte en Excel o PDF.</p>
      </div>

      {REPORTES.map((reporte) => (
        <ReportCard key={reporte.clave} reporte={reporte} niveles={niveles} miembros={miembros} />
      ))}
    </div>
  );
}
