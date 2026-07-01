import { useState, useEffect } from 'react';
import { obtenerMisTareas, enviarEntrega } from '../../services/portal.service';
import { formatearFecha } from '../../utils/formato';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import './Portal.css';

export default function MisTareas() {
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modalEntrega, setModalEntrega] = useState(null);
  const [formEntrega, setFormEntrega] = useState({ url_evidencia: '', observaciones: '' });
  const [enviando, setEnviando] = useState(false);
  const [errorEntrega, setErrorEntrega] = useState('');
  const [exito, setExito] = useState('');

  const cargar = () => {
    setCargando(true);
    obtenerMisTareas()
      .then((r) => setTareas(r.data))
      .catch(() => setTareas([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  function abrirEntrega(tarea) {
    setModalEntrega(tarea);
    setFormEntrega({
      url_evidencia: tarea.url_evidencia || '',
      observaciones: tarea.entrega_observaciones || '',
    });
    setErrorEntrega('');
    setExito('');
  }

  async function guardarEntrega(e) {
    e.preventDefault();
    setEnviando(true);
    setErrorEntrega('');
    try {
      await enviarEntrega({
        tarea_id: modalEntrega.id,
        url_evidencia: formEntrega.url_evidencia,
        observaciones: formEntrega.observaciones,
      });
      setExito('Entrega registrada correctamente.');
      cargar();
      setTimeout(() => setModalEntrega(null), 1500);
    } catch (err) {
      setErrorEntrega(err.response?.data?.message || 'No se pudo registrar la entrega');
    } finally { setEnviando(false); }
  }

  function estadoTarea(t) {
    if (t.calificacion !== null && t.calificacion !== undefined) return { texto: `Calificada: ${t.calificacion}/100`, variant: 'success' };
    if (t.entrega_id) return { texto: 'Entregada', variant: 'info' };
    if (t.fecha_limite && new Date(t.fecha_limite) < new Date()) return { texto: 'Vencida', variant: 'danger' };
    return { texto: 'Pendiente', variant: 'warning' };
  }

  return (
    <div className="portal__seccion">
      <h1>Tareas y guías</h1>

      {cargando ? (
        <p className="portal__cargando">Cargando...</p>
      ) : tareas.length === 0 ? (
        <p className="portal__vacio">No hay tareas asignadas a tu nivel.</p>
      ) : (
        <div className="portal__tareas-lista">
          {tareas.map((t) => {
            const estado = estadoTarea(t);
            return (
              <div key={t.id} className="portal__tarea-card">
                <div className="portal__tarea-header">
                  <div>
                    <h3 className="portal__tarea-titulo">{t.titulo}</h3>
                    <span className="portal__tarea-nivel">{t.nivel_nombre}</span>
                  </div>
                  <StatusBadge texto={estado.texto} variant={estado.variant} />
                </div>
                {t.descripcion && <p className="portal__tarea-desc">{t.descripcion}</p>}
                <div className="portal__tarea-footer">
                  <span className="portal__tarea-fecha">
                    {t.fecha_limite ? `Límite: ${formatearFecha(t.fecha_limite)}` : 'Sin fecha límite'}
                  </span>
                  {t.retroalimentacion && (
                    <p className="portal__tarea-feedback">
                      <strong>Comentario:</strong> {t.retroalimentacion}
                    </p>
                  )}
                  <Button variant="secondary" onClick={() => abrirEntrega(t)}>
                    {t.entrega_id ? 'Actualizar entrega' : 'Entregar'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        abierto={!!modalEntrega}
        titulo={`Entregar: ${modalEntrega?.titulo}`}
        onClose={() => setModalEntrega(null)}
        ancho="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalEntrega(null)}>Cancelar</Button>
            <Button onClick={guardarEntrega} loading={enviando}>Enviar entrega</Button>
          </>
        }
      >
        {modalEntrega && (
          <form onSubmit={guardarEntrega} className="portal__form">
            <FormField
              label="Enlace de evidencia (Google Drive, YouTube, etc.)"
              name="url_evidencia"
              type="url"
              placeholder="https://drive.google.com/..."
              value={formEntrega.url_evidencia}
              onChange={(e) => setFormEntrega((p) => ({ ...p, url_evidencia: e.target.value }))}
              helpText="Comparte el enlace de tu trabajo. Asegúrate de que sea accesible para quien lo revise."
            />
            <FormField
              label="Observaciones (opcional)"
              name="observaciones"
              type="textarea"
              value={formEntrega.observaciones}
              onChange={(e) => setFormEntrega((p) => ({ ...p, observaciones: e.target.value }))}
            />
            {errorEntrega && <p className="portal__error">{errorEntrega}</p>}
            {exito && <p className="portal__exito">{exito}</p>}
          </form>
        )}
      </Modal>
    </div>
  );
}
