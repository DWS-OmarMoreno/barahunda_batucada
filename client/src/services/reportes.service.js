import api from './api';

const ENDPOINTS = {
  mensualidades: '/reportes/mensualidades',
  pendientes: '/reportes/pendientes',
  alDia: '/reportes/al-dia',
  multas: '/reportes/multas',
  asistenciaMiembro: '/reportes/asistencia-miembro',
  asistenciaNivel: '/reportes/asistencia-nivel',
  asistenciasMes: '/reportes/asistencias-mes',
};

export async function obtenerDashboard() {
  const { data } = await api.get('/reportes/dashboard');
  return data;
}

export async function listarReporte(clave, params = {}) {
  const { data } = await api.get(ENDPOINTS[clave], { params });
  return data;
}

// Descarga el reporte como archivo (Excel o PDF) y dispara la descarga en el navegador.
export async function exportarReporte(clave, params = {}, formato = 'excel') {
  const respuesta = await api.get(ENDPOINTS[clave], {
    params: { ...params, formato },
    responseType: 'blob',
  });

  const extension = formato === 'pdf' ? 'pdf' : 'xlsx';
  const url = window.URL.createObjectURL(respuesta.data);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${clave}.${extension}`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}
