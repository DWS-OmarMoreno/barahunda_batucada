// Modelo de Reportes / Dashboard: combina datos de varios módulos
// (miembros, pagos, asistencias, multas) para los KPI del dashboard,
// las gráficas y los reportes exportables del Módulo 10.
const { pool } = require('../config/db');
const pagosModel = require('./pagos.model');
const asistenciasModel = require('./asistencias.model');
const multasModel = require('./multas.model');
const horariosModel = require('./horarios.model');
const miembroNivelesModel = require('./miembroNiveles.model');
const configuracionModel = require('./configuracion.model');
const { calcularAusentes } = require('../utils/calcularAusentes');

const NOMBRES_MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function fechaLocalIso(fecha) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

function addDias(fechaIso, dias) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  return fechaLocalIso(new Date(anio, mes - 1, dia + dias));
}

function diasEntre(fechaDesdeIso, fechaHastaIso) {
  const [a1, m1, d1] = fechaDesdeIso.split('-').map(Number);
  const [a2, m2, d2] = fechaHastaIso.split('-').map(Number);
  const ms = new Date(a2, m2 - 1, d2) - new Date(a1, m1 - 1, d1);
  return Math.round(ms / 86400000);
}

// Lista de { mes, anio } de los últimos `cantidad` meses, en orden cronológico
// ascendente (el más antiguo primero), incluyendo el mes actual.
function ultimosMeses(cantidad) {
  const ahora = new Date();
  const meses = [];
  for (let i = cantidad - 1; i >= 0; i -= 1) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push({ mes: fecha.getMonth() + 1, anio: fecha.getFullYear() });
  }
  return meses;
}

// Rangos [lunes, domingo] de las últimas `cantidad` semanas, en orden
// cronológico ascendente (la más antigua primero), incluyendo la semana actual.
function ultimasSemanas(cantidad) {
  const ahora = new Date();
  const diaSemana = ahora.getDay(); // 0 = domingo
  const offsetLunesActual = diaSemana === 0 ? 6 : diaSemana - 1;
  const lunesActual = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - offsetLunesActual);

  const semanas = [];
  for (let i = cantidad - 1; i >= 0; i -= 1) {
    const lunes = new Date(lunesActual.getFullYear(), lunesActual.getMonth(), lunesActual.getDate() - i * 7);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    semanas.push({ desde: fechaLocalIso(lunes), hasta: fechaLocalIso(domingo), lunes, domingo });
  }
  return semanas;
}

// ---------- KPIs del dashboard ----------

async function kpis() {
  const ahora = new Date();
  const mes = ahora.getMonth() + 1;
  const anio = ahora.getFullYear();

  const [[{ miembros_activos }]] = await pool.query('SELECT COUNT(*) AS miembros_activos FROM miembros WHERE activo = 1');

  const [[{ pagos_mes_esperado }]] = await pool.query(
    `SELECT COALESCE(SUM(me.valor_mensualidad), 0) AS pagos_mes_esperado
     FROM miembros m
     JOIN mensualidades me ON me.miembro_id = m.id
     WHERE m.activo = 1 AND m.exento_pago = 0`
  );

  const pagosMesRecaudado = await pagosModel.totalRecaudadoMes(mes, anio);

  const primerDiaMes = `${anio}-${pad(mes)}-01`;
  const hoyIso = fechaLocalIso(ahora);
  const contadoresAsistencia = await asistenciasModel.contarPorEstado({ fechaDesde: primerDiaMes, fechaHasta: hoyIso });
  const asistenciaPromedioPct = contadoresAsistencia.total > 0
    ? Math.round(((contadoresAsistencia.A_TIEMPO + contadoresAsistencia.TARDE) / contadoresAsistencia.total) * 100)
    : 0;

  const resumenMultas = await multasModel.resumen({ estado: 'PENDIENTE' });

  return {
    miembros_activos: Number(miembros_activos),
    pagos_mes_recaudado: pagosMesRecaudado,
    pagos_mes_esperado: Number(pagos_mes_esperado),
    asistencia_promedio_pct: asistenciaPromedioPct,
    multas_pendientes_total: resumenMultas.total_pendiente,
    multas_pendientes_cantidad: resumenMultas.cantidad_pendientes,
  };
}

// ---------- Gráfico de barras: pagos por mes (últimos N meses) ----------

async function pagosPorMes(cantidad = 6) {
  const meses = ultimosMeses(cantidad);
  const resultados = [];
  for (const { mes, anio } of meses) {
    const total = await pagosModel.totalRecaudadoMes(mes, anio);
    resultados.push({ mes, anio, etiqueta: `${NOMBRES_MES_CORTO[mes - 1]} ${anio}`, total });
  }
  return resultados;
}

// ---------- Gráfico de dona: miembros por nivel ----------

async function miembrosPorNivel() {
  const [filas] = await pool.query(
    `SELECT n.id AS nivel_id, n.nombre AS nivel_nombre,
            (SELECT COUNT(DISTINCT mn.miembro_id)
             FROM miembro_niveles mn
             JOIN miembros m ON m.id = mn.miembro_id AND m.activo = 1
             WHERE mn.nivel_id = n.id AND mn.activo = 1) AS total
     FROM niveles n
     WHERE n.activo = 1
     ORDER BY n.nombre ASC`
  );
  return filas.map((f) => ({ ...f, total: Number(f.total) }));
}

// ---------- Gráfico de línea: asistencia por semana (últimas N semanas) ----------

async function asistenciaPorSemana(cantidad = 4) {
  const semanas = ultimasSemanas(cantidad);
  const resultados = [];
  for (const { desde, hasta, lunes } of semanas) {
    const contadores = await asistenciasModel.contarPorEstado({ fechaDesde: desde, fechaHasta: hasta });
    const porcentaje = contadores.total > 0
      ? Math.round(((contadores.A_TIEMPO + contadores.TARDE) / contadores.total) * 100)
      : 0;
    resultados.push({
      desde,
      hasta,
      etiqueta: `${pad(lunes.getDate())}/${pad(lunes.getMonth() + 1)}`,
      porcentaje,
      total_registros: contadores.total,
    });
  }
  return resultados;
}

// ---------- Asistencias reales + sintéticas "AUSENTE" ----------

const DIAS_POR_DEFECTO_AUSENTES = 30;
const MAX_DIAS_AUSENTES = 180;

// Agrega filas sintéticas "AUSENTE" a un conjunto de asistencias reales ya
// obtenido (de asistenciasModel.listar/listarTodas), para los miembros
// inscritos que no registraron asistencia en una clase que les correspondía.
// Se usa en los reportes de asistencia (por miembro/nivel) y en el listado
// administrativo de Asistencias. El Dashboard (kpis/asistenciaPorSemana) NO
// usa esta función y sigue contando solo asistencias reales.
async function combinarConAusentes({ filas, fechaDesde, fechaHasta, miembroId, nivelId }) {
  const hoyIso = fechaLocalIso(new Date());
  const hasta = fechaHasta || hoyIso;
  let desde = fechaDesde || addDias(hasta, -(DIAS_POR_DEFECTO_AUSENTES - 1));
  if (diasEntre(desde, hasta) > MAX_DIAS_AUSENTES) {
    desde = addDias(hasta, -(MAX_DIAS_AUSENTES - 1));
  }

  // Nunca se generan ausencias anteriores a la fecha de "Go Live" de la
  // escuela (configuracion.fecha_go_live): antes de esa fecha el sistema
  // no estaba en uso, así que no hay clases "perdidas" que contar.
  const configuracion = await configuracionModel.obtener();
  const fechaGoLive = configuracion?.fecha_go_live || null;
  if (fechaGoLive && fechaGoLive > desde) {
    desde = fechaGoLive;
  }
  // Si el Go Live es posterior al rango solicitado, no hay nada que calcular.
  if (fechaGoLive && fechaGoLive > hasta) {
    return [...filas].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
      return String(b.hora).localeCompare(String(a.hora));
    });
  }

  const [horarios, inscripciones] = await Promise.all([
    horariosModel.listarActivosTodos(nivelId),
    miembroNivelesModel.listarActivosTodos({ miembroId, nivelId }),
  ]);

  const ausentes = calcularAusentes({
    horarios,
    inscripciones,
    asistenciasReales: filas,
    fechaDesde: desde,
    fechaHasta: hasta,
  });

  return [...filas, ...ausentes].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
    return String(b.hora).localeCompare(String(a.hora));
  });
}

// ---------- Tabla de alertas ----------

async function alertas() {
  const ahora = new Date();
  const actual = { mes: ahora.getMonth() + 1, anio: ahora.getFullYear() };
  const fechaAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const anterior = { mes: fechaAnterior.getMonth() + 1, anio: fechaAnterior.getFullYear() };

  const [estadoActual, estadoAnterior] = await Promise.all([
    mensualidadesPorEstado({ mes: actual.mes, anio: actual.anio }),
    mensualidadesPorEstado({ mes: anterior.mes, anio: anterior.anio }),
  ]);

  const mapaAnterior = new Map(estadoAnterior.map((f) => [f.miembro_id, f]));
  // Los miembros exentos de pago (estado EXENTO) nunca cuentan como "meses
  // pendientes": no se les cobra la mensualidad, así que no acumulan deuda.
  const miembrosConDosOMasMesesPendientes = estadoActual
    .filter((f) => f.estado !== 'PAGADO' && f.estado !== 'EXENTO')
    .filter((f) => {
      const previo = mapaAnterior.get(f.miembro_id);
      return previo && previo.estado !== 'PAGADO' && previo.estado !== 'EXENTO';
    })
    .map((f) => ({
      miembro_id: f.miembro_id,
      nombres_completos: f.nombres_completos,
      numero_documento: f.numero_documento,
      whatsapp: f.whatsapp,
      nivel_nombre: f.nivel_nombre,
      estado_mes_actual: f.estado,
    }));

  const { filas: multasSinPagar } = await multasModel.listar({ estado: 'PENDIENTE', limite: 200, offset: 0 });

  // Asistencia obligatoria: miembros marcados manualmente (m.asistencia_obligatoria)
  // y/o que llevan 2+ meses sin pagar la mensualidad sin estar exentos de pago
  // (ya excluidos de miembrosConDosOMasMesesPendientes). Se fusionan en un solo
  // listado con un arreglo `motivos` que explica por qué cada uno aplica.
  const [manualmenteObligatorios] = await pool.query(
    `SELECT id AS miembro_id, nombres_completos, numero_documento, whatsapp
     FROM miembros
     WHERE activo = 1 AND asistencia_obligatoria = 1`
  );

  const mapaObligatorios = new Map();
  manualmenteObligatorios.forEach((m) => {
    mapaObligatorios.set(m.miembro_id, {
      miembro_id: m.miembro_id,
      nombres_completos: m.nombres_completos,
      numero_documento: m.numero_documento,
      whatsapp: m.whatsapp,
      motivos: ['Marcado como asistencia obligatoria'],
    });
  });
  miembrosConDosOMasMesesPendientes.forEach((m) => {
    const existente = mapaObligatorios.get(m.miembro_id);
    if (existente) {
      existente.motivos.push('2 o más meses sin pagar la mensualidad');
    } else {
      mapaObligatorios.set(m.miembro_id, {
        miembro_id: m.miembro_id,
        nombres_completos: m.nombres_completos,
        numero_documento: m.numero_documento,
        whatsapp: m.whatsapp,
        nivel_nombre: m.nivel_nombre,
        motivos: ['2 o más meses sin pagar la mensualidad'],
      });
    }
  });
  const miembrosAsistenciaObligatoria = [...mapaObligatorios.values()];

  return {
    miembros_dos_mas_meses_pendientes: miembrosConDosOMasMesesPendientes,
    multas_sin_pagar: multasSinPagar,
    miembros_asistencia_obligatoria: miembrosAsistenciaObligatoria,
  };
}

// ---------- Reportes exportables: estado de mensualidades ----------

// Estado de pago de mensualidad por miembro para un mes/año, con nivel opcional
// como filtro y siempre incluyendo el nombre del nivel principal del miembro
// (igual al usado para sustituir la variable {nivel} en comunicaciones).
async function mensualidadesPorEstado({ mes, anio, nivelId }) {
  let nivelJoin = '';
  const valores = [mes, anio];
  if (nivelId) {
    nivelJoin = 'JOIN miembro_niveles mnf ON mnf.miembro_id = m.id AND mnf.nivel_id = ? AND mnf.activo = 1';
  }

  const [rows] = await pool.query(
    `SELECT m.id AS miembro_id, m.nombres_completos, m.numero_documento, m.whatsapp, m.exento_pago,
            COALESCE(me.valor_mensualidad, 0) AS valor_mensualidad,
            COALESCE(SUM(p.valor), 0) AS total_pagado,
            (SELECT n.nombre FROM miembro_niveles mn2
             JOIN niveles n ON n.id = mn2.nivel_id
             WHERE mn2.miembro_id = m.id AND mn2.activo = 1
             ORDER BY mn2.created_at DESC LIMIT 1) AS nivel_nombre
     FROM miembros m
     LEFT JOIN mensualidades me ON me.miembro_id = m.id
     LEFT JOIN pagos p ON p.miembro_id = m.id
       AND p.mes_correspondiente = ? AND p.anio_correspondiente = ? AND p.activo = 1
     ${nivelJoin}
     WHERE m.activo = 1
     GROUP BY m.id, m.nombres_completos, m.numero_documento, m.whatsapp, m.exento_pago, me.valor_mensualidad
     ORDER BY m.nombres_completos ASC`,
    nivelId ? [...valores, nivelId] : valores
  );

  // Los miembros exentos de pago quedan en estado EXENTO sin importar lo
  // pagado: no se les cobra la mensualidad (ver miembros.exento_pago).
  return rows.map((r) => {
    const valorMensualidad = Number(r.valor_mensualidad);
    const totalPagado = Number(r.total_pagado);
    let estado = 'PENDIENTE';
    if (valorMensualidad > 0 && totalPagado >= valorMensualidad) estado = 'PAGADO';
    else if (totalPagado > 0) estado = 'PARCIAL';
    if (r.exento_pago) estado = 'EXENTO';
    return { ...r, valor_mensualidad: valorMensualidad, total_pagado: totalPagado, estado };
  });
}

// ---------- Reportes exportables: historial de multas ----------

async function multasHistorial({ miembroId, estado, fechaDesde, fechaHasta }) {
  const condiciones = ['mu.activo = 1'];
  const valores = [];
  if (miembroId) { condiciones.push('mu.miembro_id = ?'); valores.push(miembroId); }
  if (estado) { condiciones.push('mu.estado = ?'); valores.push(estado); }
  if (fechaDesde) { condiciones.push('mu.fecha_generada >= ?'); valores.push(fechaDesde); }
  if (fechaHasta) { condiciones.push('mu.fecha_generada <= ?'); valores.push(fechaHasta); }
  const whereSql = `WHERE ${condiciones.join(' AND ')}`;

  const [filas] = await pool.query(
    `SELECT mu.*, m.nombres_completos AS miembro_nombre, m.numero_documento, n.nombre AS nivel_nombre
     FROM multas mu
     JOIN miembros m ON m.id = mu.miembro_id
     LEFT JOIN asistencias a ON a.id = mu.asistencia_id
     LEFT JOIN niveles n ON n.id = a.nivel_id
     ${whereSql}
     ORDER BY mu.fecha_generada DESC
     LIMIT 5000`,
    valores
  );
  return filas;
}

// ---------- Reporte: asistencias por mes con ausencias consecutivas ----------
//
// Por cada miembro activo con horarios asignados, calcula:
//   - clases_mes:            clases programadas en el mes seleccionado
//   - ausencias_mes:         clases sin registro A_TIEMPO/TARDE en ese mes
//   - ausencias_consecutivas: racha actual de ausencias seguidas hasta hoy
//                             (puede venir arrastrándose de meses anteriores)
//   - semaforo:              'verde' (0-1), 'amarillo' (2), 'rojo' (3+)
//
// Para calcular la racha se mira hasta 6 meses atrás respecto al mes
// seleccionado, o desde fecha_go_live si es posterior.
async function asistenciasPorMes({ mes, anio }) {
  const config = await configuracionModel.obtener();
  const tz = config?.zona_horaria || 'America/Bogota';

  // Hoy en la zona horaria configurada
  const hoyEnTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  const mesNum = Number(mes);
  const anioNum = Number(anio);
  const primerDia = `${anioNum}-${pad(mesNum)}-01`;
  const ultimoDia = (() => {
    const d = new Date(anioNum, mesNum, 0);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  // Rango extendido para calcular consecutivas (6 meses antes del mes seleccionado)
  const fechaDesdeConsecutivas = (() => {
    const d = new Date(anioNum, mesNum - 1 - 6, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  })();

  let fechaInicio = fechaDesdeConsecutivas;
  if (config?.fecha_go_live && config.fecha_go_live > fechaInicio) {
    fechaInicio = config.fecha_go_live;
  }

  // No miramos fechas futuras
  const hasteFecha = ultimoDia < hoyEnTz ? ultimoDia : hoyEnTz;

  const [miembros] = await pool.query(
    `SELECT m.id, m.nombres_completos, m.numero_documento
     FROM miembros m WHERE m.activo = 1 ORDER BY m.nombres_completos ASC`
  );

  const todosHorarios = await horariosModel.listarActivosTodos();
  const DIA_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

  function generarFechasParaDia(desde, hasta, diaSemana) {
    const fechas = [];
    const [a1, m1, d1] = desde.split('-').map(Number);
    const [a2, m2, d2] = hasta.split('-').map(Number);
    const curr = new Date(a1, m1 - 1, d1);
    const fin = new Date(a2, m2 - 1, d2);
    while (curr <= fin) {
      if (DIA_JS[curr.getDay()] === diaSemana) {
        fechas.push(`${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`);
      }
      curr.setDate(curr.getDate() + 1);
    }
    return fechas;
  }

  const resultado = [];

  for (const miembro of miembros) {
    // eslint-disable-next-line no-await-in-loop
    const inscripciones = await miembroNivelesModel.listarActivosPorMiembro(miembro.id);
    if (inscripciones.length === 0) continue;

    const nivelIds = new Set(inscripciones.map((i) => i.nivel_id));
    const niveles_nombres = inscripciones.map((i) => i.nivel_nombre).join(', ');
    const horariosDelMiembro = todosHorarios.filter((h) => nivelIds.has(h.nivel_id));
    if (horariosDelMiembro.length === 0) continue;

    const todasFechasSet = new Set();
    const fechasMesSet = new Set();

    for (const h of horariosDelMiembro) {
      generarFechasParaDia(fechaInicio, hasteFecha, h.dia_semana).forEach((f) => {
        todasFechasSet.add(f);
        if (f >= primerDia && f <= ultimoDia) fechasMesSet.add(f);
      });
    }

    if (fechasMesSet.size === 0) continue;

    const todasFechas = [...todasFechasSet].sort();

    // eslint-disable-next-line no-await-in-loop
    const [asistencias] = await pool.query(
      `SELECT fecha, estado FROM asistencias
       WHERE miembro_id = ? AND fecha >= ? AND fecha <= ? AND activo = 1`,
      [miembro.id, fechaInicio, hasteFecha]
    );

    const porFecha = new Map(asistencias.map((a) => [String(a.fecha).slice(0, 10), a.estado]));

    let ausenciasMes = 0;
    for (const f of fechasMesSet) {
      const est = porFecha.get(f);
      if (!est || est === 'AUSENTE') ausenciasMes++;
    }

    let consecutivas = 0;
    for (let i = todasFechas.length - 1; i >= 0; i--) {
      const est = porFecha.get(todasFechas[i]);
      if (!est || est === 'AUSENTE') { consecutivas++; } else { break; }
    }

    let semaforo = 'verde';
    if (consecutivas >= 3) semaforo = 'rojo';
    else if (consecutivas === 2) semaforo = 'amarillo';

    resultado.push({
      miembro_id: miembro.id,
      nombres_completos: miembro.nombres_completos,
      numero_documento: miembro.numero_documento,
      niveles_nombres,
      clases_mes: fechasMesSet.size,
      ausencias_mes: ausenciasMes,
      ausencias_consecutivas: consecutivas,
      semaforo,
    });
  }

  const PRIO = { rojo: 0, amarillo: 1, verde: 2 };
  resultado.sort((a, b) => {
    const pa = PRIO[a.semaforo] ?? 3;
    const pb = PRIO[b.semaforo] ?? 3;
    if (pa !== pb) return pa - pb;
    return b.ausencias_consecutivas - a.ausencias_consecutivas;
  });

  return resultado;
}

module.exports = {
  kpis,
  pagosPorMes,
  miembrosPorNivel,
  asistenciaPorSemana,
  combinarConAusentes,
  alertas,
  mensualidadesPorEstado,
  multasHistorial,
  asistenciasPorMes,
};
