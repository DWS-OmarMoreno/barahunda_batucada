import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { urlArchivo } from '../../services/api';
import { registrarAsistenciaPublica, registrarAsistenciaPuntoFijo } from '../../services/asistencias.service';
import FormField from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import './Asistencia.css';

/**
 * Portal público (sin login) para que los miembros registren su propia
 * asistencia ingresando su número de documento. Soporta dos enlaces:
 *
 * 1. QR rotativo por salón: la URL trae horario_id + token, generados desde
 *    Horarios. El token rota cada pocos minutos para evitar que alguien
 *    registre asistencia sin estar presente (ver server/utils/asistenciaToken.js).
 * 2. Enlace fijo de un único punto de registro de la sede (p. ej. una
 *    tablet en la entrada): la URL trae solo token (sin horario_id) y NO
 *    rota — el horario/nivel del miembro se resuelve automáticamente según
 *    la hora actual (ver server/models/puntoRegistro.model.js). Este
 *    enlace nunca debe entregarse a los miembros, solo al dispositivo fijo.
 */
export default function Asistencia() {
  const { config } = useTheme();
  const [searchParams] = useSearchParams();
  const horarioId = searchParams.get('horario_id');
  const token = searchParams.get('token');
  const modoFijo = !!token && !horarioId;
  const enlaceValido = modoFijo ? true : !!horarioId && !!token;

  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  async function manejarSubmit(e) {
    e.preventDefault();
    if (!numeroDocumento.trim() || !enlaceValido) return;

    setEnviando(true);
    setError('');
    setResultado(null);
    try {
      const respuesta = modoFijo
        ? await registrarAsistenciaPuntoFijo({ numeroDocumento: numeroDocumento.trim(), token })
        : await registrarAsistenciaPublica({ numeroDocumento: numeroDocumento.trim(), horarioId, token });
      setResultado({ ...respuesta.data, mensaje: respuesta.message });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo registrar la asistencia. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  function registrarOtra() {
    setNumeroDocumento('');
    setResultado(null);
    setError('');
  }

  return (
    <div className="asistencia">
      <div className="asistencia__card">
        {config?.escuela_logo && (
          <img src={urlArchivo(config.escuela_logo)} alt="Logo" className="asistencia__logo" />
        )}
        <h1 className="asistencia__titulo">{config?.escuela_nombre || 'Escuela de Música'}</h1>
        <p className="asistencia__subtitulo">Registro de asistencia</p>

        {!enlaceValido ? (
          <div className="asistencia__enlace-invalido">
            <p className="asistencia__resultado-titulo">Este enlace no es válido</p>
            <p>
              Escanea el código QR vigente del salón para registrar tu asistencia. Los códigos cambian
              cada pocos minutos, así que un enlace guardado o reenviado deja de funcionar. Si estás en
              el punto de registro de la sede, verifica que el enlace esté completo.
            </p>
          </div>
        ) : resultado ? (
          <div className={`asistencia__resultado asistencia__resultado--${resultado.estado === 'TARDE' ? 'tarde' : 'a-tiempo'}`}>
            {resultado.ya_registrada ? (
              <>
                <p className="asistencia__resultado-titulo">Ya registraste tu asistencia hoy</p>
                <p>{resultado.miembro} · {resultado.nivel}</p>
                <p>Hora registrada: {String(resultado.hora).slice(0, 5)}</p>
              </>
            ) : (
              <>
                <p className="asistencia__resultado-titulo">
                  {resultado.estado === 'TARDE' ? 'Asistencia registrada (Tarde)' : '¡Asistencia registrada a tiempo!'}
                </p>
                <p>{resultado.miembro} · {resultado.nivel}</p>
                <p>Hora: {String(resultado.hora).slice(0, 5)}</p>
                {resultado.estado === 'TARDE' && (
                  <p className="asistencia__aviso-multa">
                    Llegaste {resultado.minutos_retraso} minutos tarde.
                    {resultado.multa_generada && resultado.valor_multa
                      ? ` Se generó una multa de ${Number(resultado.valor_multa).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}.`
                      : ''}
                  </p>
                )}
              </>
            )}
            <Button variant="secondary" onClick={registrarOtra} className="asistencia__boton-otra">
              Registrar otra asistencia
            </Button>
          </div>
        ) : (
          <form className="asistencia__form" onSubmit={manejarSubmit}>
            <FormField
              label="Número de documento"
              name="numero_documento"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="Ingresa tu cédula"
              autoFocus
              required
            />
            {error && <p className="asistencia__error">{error}</p>}
            <Button type="submit" loading={enviando} className="asistencia__boton">
              Registrar Asistencia
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
