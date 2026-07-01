import { useState, useEffect, useCallback } from 'react';
import { listarPlantillasCorreo, actualizarPlantillaCorreo } from '../../services/correo.service';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import FormField from '../../components/ui/FormField';
import StatusBadge from '../../components/ui/StatusBadge';
import './PlantillasCorreo.css';

export default function PlantillasCorreo() {
  const [plantillas, setPlantillas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', asunto: '', cuerpo: '', activo: true });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try { const r = await listarPlantillasCorreo(); setPlantillas(r.data); }
    catch { setPlantillas([]); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrir(p) {
    setEditando(p);
    setForm({ nombre: p.nombre, asunto: p.asunto, cuerpo: p.cuerpo, activo: !!p.activo });
    setError('');
    setExito('');
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setExito('');
    try {
      await actualizarPlantillaCorreo(editando.id, form);
      setExito('Plantilla actualizada correctamente.');
      cargar();
      setTimeout(() => setEditando(null), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo guardar');
    } finally { setGuardando(false); }
  }

  return (
    <div className="plantillas-correo">
      <h1>Plantillas de correo</h1>
      <p className="plantillas-correo__desc">
        Personaliza el contenido de los correos automáticos. Las variables entre llaves (como <code>{'{nombre}'}</code>) se reemplazan automáticamente al enviar.
      </p>

      {cargando ? (
        <p className="plantillas-correo__nota">Cargando plantillas...</p>
      ) : (
        <div className="plantillas-correo__lista">
          {plantillas.map((p) => (
            <div key={p.id} className="plantillas-correo__card">
              <div className="plantillas-correo__card-header">
                <div>
                  <h3>{p.nombre}</h3>
                  <code className="plantillas-correo__clave">{p.clave}</code>
                </div>
                <StatusBadge texto={p.activo ? 'Activa' : 'Inactiva'} variant={p.activo ? 'success' : 'secondary'} />
              </div>
              <p className="plantillas-correo__asunto"><strong>Asunto:</strong> {p.asunto}</p>
              {p.variables_disponibles && (
                <p className="plantillas-correo__vars">
                  <strong>Variables:</strong>{' '}
                  {p.variables_disponibles.split(',').map((v) => (
                    <code key={v} className="plantillas-correo__var-chip">{v.trim()}</code>
                  ))}
                </p>
              )}
              <div className="plantillas-correo__acciones">
                <Button variant="secondary" onClick={() => abrir(p)}>Editar plantilla</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        abierto={!!editando}
        titulo={`Editar: ${editando?.nombre}`}
        onClose={() => setEditando(null)}
        ancho="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}>Guardar cambios</Button>
          </>
        }
      >
        {editando && (
          <form onSubmit={guardar} className="plantillas-correo__form">
            <FormField label="Nombre de la plantilla" name="nombre" value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} required />
            <FormField label="Asunto del correo" name="asunto" value={form.asunto}
              onChange={(e) => setForm((p) => ({ ...p, asunto: e.target.value }))} required
              helpText="Usa variables como {nombre} o {escuela_nombre} para personalizarlo." />
            <FormField label="Cuerpo (HTML)" name="cuerpo" type="textarea" value={form.cuerpo}
              onChange={(e) => setForm((p) => ({ ...p, cuerpo: e.target.value }))}
              helpText={`Variables disponibles: ${editando.variables_disponibles || '—'}`} />
            <div className="form-field">
              <label className="form-field__label">
                <input type="checkbox" checked={form.activo}
                  onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
                  style={{ marginRight: '8px' }} />
                Plantilla activa (se usará para envíos automáticos)
              </label>
            </div>
            {error && <p style={{ color: 'var(--color-danger)', fontSize: '13px' }}>{error}</p>}
            {exito && <p style={{ color: 'var(--color-success)', fontSize: '13px' }}>{exito}</p>}

            {form.cuerpo && (
              <div className="plantillas-correo__preview">
                <p className="plantillas-correo__preview-label">Vista previa del cuerpo:</p>
                <div
                  className="plantillas-correo__preview-html"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: form.cuerpo }}
                />
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}
