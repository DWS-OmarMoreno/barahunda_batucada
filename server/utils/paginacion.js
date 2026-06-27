// Helper para paginación server-side consistente (Regla general #5).
// Lee `page` y `limit` de la query string y devuelve también el objeto
// `pagination` que se incluye en la respuesta { success, data, pagination }.

function obtenerParametros(query = {}, { limitPorDefecto = 20, limitMaximo = 100 } = {}) {
  let pagina = parseInt(query.page, 10);
  let limite = parseInt(query.limit, 10);

  if (!Number.isFinite(pagina) || pagina < 1) pagina = 1;
  if (!Number.isFinite(limite) || limite < 1) limite = limitPorDefecto;
  if (limite > limitMaximo) limite = limitMaximo;

  const offset = (pagina - 1) * limite;
  return { pagina, limite, offset };
}

function construirPaginacion({ pagina, limite, total }) {
  return {
    page: pagina,
    limit: limite,
    total,
    totalPages: limite > 0 ? Math.max(1, Math.ceil(total / limite)) : 1,
  };
}

module.exports = { obtenerParametros, construirPaginacion };
