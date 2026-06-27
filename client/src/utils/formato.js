// Helpers de formato compartidos por toda la app (Reglas generales #3 y #4):
// fechas en formato colombiano DD/MM/YYYY en el frontend, moneda en COP.

export function formatearMoneda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

export function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  // Las fechas DATE llegan como 'YYYY-MM-DD' (dateStrings:true en mysql2);
  // se parsean manualmente para evitar desfaces de zona horaria.
  const soloFecha = String(fechaIso).slice(0, 10);
  const [anio, mes, dia] = soloFecha.split('-');
  if (!anio || !mes || !dia) return fechaIso;
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaHora(fechaIso) {
  if (!fechaIso) return '—';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return fechaIso;
  return fecha.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatearHora(horaSql) {
  if (!horaSql) return '—';
  // Las horas TIME llegan como 'HH:MM:SS'
  return String(horaSql).slice(0, 5);
}

export const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

export const ETIQUETAS_DIA_SEMANA = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};
