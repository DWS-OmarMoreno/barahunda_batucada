// Helpers de formato compartidos en el backend (usados al construir
// mensajes de WhatsApp dinámicos: recordatorios de mensualidad, multas, etc.)

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatearMoneda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

module.exports = { NOMBRES_MES, formatearMoneda };
