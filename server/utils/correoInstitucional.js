// Genera un correo institucional a partir del nombre completo + dominio configurado.
// Ej: "María Álvarez García" + "barahunda.com" → "maria.alvarez@barahunda.com"
// Reglas: solo a-z, 0-9 y puntos; máximo dos segmentos (primer nombre + primer apellido).

function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // solo letras, números y espacios
    .trim();
}

function generarCorreo(nombresCompletos, dominio) {
  if (!nombresCompletos || !dominio) return null;
  const partes = normalizar(nombresCompletos).split(/\s+/).filter(Boolean);
  if (partes.length === 0) return null;
  // Tomar primer nombre y primer apellido (si existen)
  const usuario = partes.length >= 2
    ? `${partes[0]}.${partes[1]}`
    : partes[0];
  return `${usuario}@${dominio.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
}

module.exports = { generarCorreo };
