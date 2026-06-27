// Sintetiza filas "AUSENTE" para los miembros que, estando inscritos y
// activos en el nivel de un horario cuyo día de la semana cae dentro del
// rango de fechas dado, no tienen ninguna asistencia real (activa)
// registrada para esa fecha + horario. Pura: no toca la base de datos,
// solo combina arreglos que ya se obtuvieron de los modelos.
// Se usa en los reportes de asistencia y en el listado administrativo de
// Asistencias — nunca en el Dashboard (sus KPIs/gráficas solo cuentan
// asistencias reales).
const DIAS_SEMANA_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatearFechaLocal(fecha) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

function* fechasEnRango(fechaDesde, fechaHasta) {
  const actual = new Date(`${fechaDesde}T00:00:00`);
  const fin = new Date(`${fechaHasta}T00:00:00`);
  while (actual <= fin) {
    yield formatearFechaLocal(actual);
    actual.setDate(actual.getDate() + 1);
  }
}

// horarios: filas activas { id, nivel_id, nivel_nombre, dia_semana, hora_inicio }
// inscripciones: filas activas { miembro_id, nivel_id, fecha_inicio, miembro_nombre, numero_documento }
// asistenciasReales: filas ya obtenidas de asistencias (activo = 1)
function calcularAusentes({ horarios, inscripciones, asistenciasReales, fechaDesde, fechaHasta }) {
  const hoyIso = formatearFechaLocal(new Date());

  const registradas = new Set(
    (asistenciasReales || []).map((a) => `${a.miembro_id}|${a.horario_id}|${String(a.fecha).slice(0, 10)}`)
  );

  const inscripcionesPorNivel = new Map();
  (inscripciones || []).forEach((insc) => {
    const lista = inscripcionesPorNivel.get(insc.nivel_id) || [];
    lista.push(insc);
    inscripcionesPorNivel.set(insc.nivel_id, lista);
  });

  const horariosPorDia = new Map();
  (horarios || []).forEach((h) => {
    const lista = horariosPorDia.get(h.dia_semana) || [];
    lista.push(h);
    horariosPorDia.set(h.dia_semana, lista);
  });

  const ausentes = [];
  for (const fecha of fechasEnRango(fechaDesde, fechaHasta)) {
    if (fecha > hoyIso) break; // no se marcan ausentes sesiones futuras

    const diaSemana = DIAS_SEMANA_JS[new Date(`${fecha}T00:00:00`).getDay()];
    const horariosDelDia = horariosPorDia.get(diaSemana) || [];

    horariosDelDia.forEach((horario) => {
      const inscritos = inscripcionesPorNivel.get(horario.nivel_id) || [];
      inscritos.forEach((insc) => {
        if (insc.fecha_inicio && String(insc.fecha_inicio).slice(0, 10) > fecha) return; // aún no inscrito esa fecha
        const clave = `${insc.miembro_id}|${horario.id}|${fecha}`;
        if (registradas.has(clave)) return;

        ausentes.push({
          id: null,
          miembro_id: insc.miembro_id,
          miembro_nombre: insc.miembro_nombre,
          numero_documento: insc.numero_documento,
          nivel_id: horario.nivel_id,
          nivel_nombre: horario.nivel_nombre,
          horario_id: horario.id,
          fecha,
          hora: horario.hora_inicio,
          estado: 'AUSENTE',
          minutos_retraso: 0,
          activo: 1,
          sintetico: true,
        });
      });
    });
  }
  return ausentes;
}

module.exports = { calcularAusentes };
