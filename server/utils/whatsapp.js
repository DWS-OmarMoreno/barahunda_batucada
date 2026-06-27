// Helpers para construir mensajes de WhatsApp dinámicos a partir de
// plantillas configurables (tabla `plantillas_whatsapp`) y para armar la
// URL final https://wa.me/57{numero}?text={mensaje}.
// Variables soportadas: {nombre} {nivel} {valor_mensualidad} {mes_pendiente} {valor_multa} {fecha_evento}

function reemplazarVariables(plantilla, variables = {}) {
  return String(plantilla || '').replace(/\{(\w+)\}/g, (coincidencia, clave) => {
    const valor = variables[clave];
    return valor !== undefined && valor !== null ? String(valor) : coincidencia;
  });
}

function construirUrlWhatsApp(numero, mensaje) {
  const soloDigitos = String(numero || '').replace(/\D/g, '');
  const numeroConIndicativo = soloDigitos.startsWith('57') ? soloDigitos : `57${soloDigitos}`;
  return `https://wa.me/${numeroConIndicativo}?text=${encodeURIComponent(mensaje || '')}`;
}

module.exports = { reemplazarVariables, construirUrlWhatsApp };
