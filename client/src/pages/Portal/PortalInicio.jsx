import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { obtenerPerfil, actualizarPerfil } from '../../services/portal.service';
import { obtenerMiPlan } from '../../services/planesEstudio.service';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { formatearFecha } from '../../utils/formato';
import './Portal.css';

const ACCESOS = [
  { ruta: '/portal/asistencias',   icono: '📅', titulo: 'Asistencias',  desc: 'Consulta tu historial de asistencia' },
  { ruta: '/portal/mensualidades', icono: '💳', titulo: 'Mis pagos',     desc: 'Revisa tus mensualidades y pagos' },
  { ruta: '/portal/guias',         icono: '📚', titulo: 'Guías',         desc: 'Recursos y materiales de tu nivel' },
  { ruta: '/portal/tareas',        icono: '📋', titulo: 'Plan de estudios', desc: 'Actividades y exámenes de tu plan' },
];

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function perfil2form(p) {
  return {
    nombres_completos:  p.nombres_completos  || '',
    whatsapp:           p.whatsapp           || '',
    email:              p.email              || '',
    fecha_nacimiento:   p.fecha_nacimiento   ? String(p.fecha_nacimiento).slice(0, 10) : '',
    direccion:          p.direccion          || '',
    tipo_sangre:        p.tipo_sangre        || '',
    eps:                p.eps                || '',
    // Booleanos → número 0/1 para que el backend acepte TINYINT(1)
    padece_enfermedad:  p.padece_enfermedad  ? 1 : 0,
    enfermedad_cual:    p.enfermedad_cual    || '',
    sufre_alergia:      p.sufre_alergia      ? 1 : 0,
    alergia_cual:       p.alergia_cual       || '',
    toma_medicamentos:  p.toma_medicamentos  ? 1 : 0,
    medicamentos_cuales: p.medicamentos_cuales || '',
    restricciones_fisicas: p.restricciones_fisicas || '',
  };
}

function CampoTexto({ label, id, value, onChange, required, placeholder, helpText }) {
  return (
    <div className="portal__perfil-form-campo">
      <label htmlFor={id}>{label}{required ? ' *' : ''}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
      />
      {helpText && <small style={{ color: 'var(--color-secondary)', fontSize: 11 }}>{helpText}</small>}
    </div>
  );
}

function CampoSiNo({ label, id, value, onChange }) {
  return (
    <div className="portal__perfil-form-campo">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={onChange}>
        <option value={0}>No</option>
        <option value={1}>Sí</option>
      </select>
    </div>
  );
}

// ── Dashboard pendientes ──────────────────────────────────────────────────────

function DashboardPendientes({ planes }) {
  // Recolectar items pendientes desbloqueados de todos los planes
  const pendientes = [];
  for (const plan of planes) {
    for (const sec of (plan.secciones ?? [])) {
      for (const item of (sec.items ?? [])) {
        if (!item.entrega && item.desbloqueado !== false) {
          pendientes.push({ ...item, plan_nombre: plan.nombre, nivel_nombre: plan.nivel_nombre });
        }
      }
    }
  }

  if (pendientes.length === 0) return null;

  const visibles = pendientes.slice(0, 3);
  const hayMas = pendientes.length > 3;

  return (
    <div className="portal__dashboard-pendientes">
      <div className="portal__dash-header">
        <h2 className="portal__dash-titulo">📌 Pendientes</h2>
        {hayMas && (
          <Link to="/portal/tareas" className="portal__dash-ver-mas">
            Ver todos ({pendientes.length}) →
          </Link>
        )}
      </div>
      <div className="portal__dash-lista">
        {visibles.map((item) => (
          <div key={item.id} className="portal__dash-item">
            <span className="portal__dash-icono">{item.tipo === 'EXAMEN' ? '📝' : '🔵'}</span>
            <div className="portal__dash-item-info">
              <span className="portal__dash-item-titulo">{item.titulo}</span>
              <span className="portal__dash-item-meta">
                {item.nivel_nombre}
                {item.fecha_limite && (
                  <span className="portal__dash-fecha"> · límite {String(item.fecha_limite).slice(0, 10)}</span>
                )}
              </span>
            </div>
            {item.tipo === 'EXAMEN' && (
              <StatusBadge texto="Examen" variant="danger" />
            )}
          </div>
        ))}
      </div>
      {hayMas && (
        <Link to="/portal/tareas" className="portal__dash-ver-mas-btn">
          Ver plan completo →
        </Link>
      )}
    </div>
  );
}

export default function PortalInicio() {
  const { usuario } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [planes, setPlanes] = useState([]);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [exitoPerfil, setExitoPerfil] = useState('');

  useEffect(() => {
    Promise.all([
      obtenerPerfil().then((r) => r.data).catch(() => null),
      obtenerMiPlan().then((r) => {
        const d = r?.data ?? r;
        return Array.isArray(d) ? d : [];
      }).catch(() => []),
    ]).then(([perfilData, planesData]) => {
      setPerfil(perfilData);
      setPlanes(planesData);
    }).finally(() => setCargando(false));
  }, []);

  function abrirEdicion() {
    if (!perfil) return;
    setForm(perfil2form(perfil));
    setErrorPerfil('');
    setExitoPerfil('');
    setEditando(true);
  }

  function set(campo) {
    return (e) => {
      const val = e.target.type === 'select-one' && (campo === 'padece_enfermedad' || campo === 'sufre_alergia' || campo === 'toma_medicamentos')
        ? Number(e.target.value)
        : e.target.value;
      setForm((p) => ({ ...p, [campo]: val }));
    };
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorPerfil('');
    setExitoPerfil('');
    try {
      const r = await actualizarPerfil(form);
      setPerfil(r.data);
      setExitoPerfil('Perfil actualizado correctamente.');
      setTimeout(() => { setEditando(false); setExitoPerfil(''); }, 1400);
    } catch (err) {
      setErrorPerfil(err.response?.data?.message || 'No se pudo actualizar el perfil');
    } finally {
      setGuardando(false);
    }
  }

  const inicial = (usuario?.nombre || 'E')[0].toUpperCase();
  const niveles = perfil?.niveles_nombres
    ? perfil.niveles_nombres.split(',').map((n) => n.trim()).filter(Boolean)
    : [];

  if (cargando) return <p className="portal__cargando">Cargando perfil...</p>;
  if (!perfil) return <p className="portal__error">No se pudo cargar el perfil.</p>;

  // Alerta perfil incompleto
  const perfilIncompleto = perfil && (!perfil.email || !perfil.fecha_nacimiento);
  const camposFaltantes = perfil
    ? [!perfil.email && 'correo electrónico', !perfil.fecha_nacimiento && 'fecha de nacimiento'].filter(Boolean)
    : [];

  return (
    <div className="portal__inicio">
      {/* Alerta perfil incompleto */}
      {perfilIncompleto && !editando && (
        <div className="portal__alerta-perfil">
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div className="portal__alerta-perfil-texto">
            <strong>Completa tu perfil</strong>
            Falta tu {camposFaltantes.join(' y ')}. Necesitamos esta información para enviarte comunicados.
          </div>
          <button type="button" className="portal__alerta-completar-btn" onClick={abrirEdicion}>
            Completar ahora
          </button>
        </div>
      )}

      {/* Banner de bienvenida */}
      <div className="portal__bienvenida">
        <div className="portal__avatar">{inicial}</div>
        <div className="portal__bienvenida-texto">
          <h1>Hola, {usuario?.nombre} 👋</h1>
          <p>Bienvenido/a a tu portal de estudiante.</p>
          {niveles.length > 0 && (
            <div className="portal__niveles-pills">
              {niveles.map((n) => <span key={n} className="portal__nivel-pill">{n}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="portal__accesos-rapidos">
        {ACCESOS.map((a) => (
          <Link key={a.ruta} to={a.ruta} className="portal__acceso-card">
            <span className="portal__acceso-icono">{a.icono}</span>
            <span className="portal__acceso-titulo">{a.titulo}</span>
            <span className="portal__acceso-desc">{a.desc}</span>
          </Link>
        ))}
      </div>

      {/* Dashboard de pendientes */}
      <DashboardPendientes planes={planes} />

      {/* Información personal */}
      <div className="portal__perfil-card">
        <div className="portal__perfil-card-header">
          <h2>Tu información</h2>
          {!editando && (
            <button type="button" className="portal__editar-btn" onClick={abrirEdicion}>
              Editar perfil
            </button>
          )}
        </div>

        {editando ? (
          <form onSubmit={guardar} className="portal__perfil-form">
            {/* Datos no editables (gestionados por la escuela) */}
            <div className="portal__perfil-form-bloqueados">
              <p>Datos gestionados por la escuela</p>
              <div className="portal__perfil-form-bloqueados-grid">
                <div className="portal__perfil-form-bloqueado-item">
                  <span>Documento</span>
                  <strong>{perfil.tipo_documento} {perfil.numero_documento}</strong>
                </div>
                {perfil.correo_institucional && (
                  <div className="portal__perfil-form-bloqueado-item">
                    <span>Correo institucional</span>
                    <strong>{perfil.correo_institucional}</strong>
                  </div>
                )}
                <div className="portal__perfil-form-bloqueado-item">
                  <span>Nivel(es)</span>
                  <strong>{perfil.niveles_nombres || '—'}</strong>
                </div>
              </div>
            </div>

            {/* ── Datos personales ── */}
            <p className="portal__perfil-form-seccion">Datos personales</p>
            <div className="portal__perfil-form-campos">
              <CampoTexto
                label="Nombre completo" id="pf-nombre"
                value={form.nombres_completos} onChange={set('nombres_completos')} required
              />
              <CampoTexto
                label="WhatsApp" id="pf-whatsapp"
                value={form.whatsapp} onChange={set('whatsapp')} required
                placeholder="Ej: 3001234567"
              />
              <CampoTexto
                label="Email personal" id="pf-email"
                value={form.email} onChange={set('email')}
              />
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-nacimiento">Fecha de nacimiento</label>
                <input id="pf-nacimiento" type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')} />
              </div>
              <CampoTexto
                label="Dirección" id="pf-direccion"
                value={form.direccion} onChange={set('direccion')}
              />
              <div className="portal__perfil-form-campo">
                <label htmlFor="pf-sangre">Tipo de sangre</label>
                <select id="pf-sangre" value={form.tipo_sangre} onChange={set('tipo_sangre')}>
                  <option value="">— Selecciona —</option>
                  {TIPOS_SANGRE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <CampoTexto
                label="EPS" id="pf-eps"
                value={form.eps} onChange={set('eps')}
              />
            </div>

            {/* ── Información médica ── */}
            <p className="portal__perfil-form-seccion">Información médica</p>
            <div className="portal__perfil-form-campos">
              <CampoSiNo
                label="¿Padece alguna enfermedad?" id="pf-enf"
                value={form.padece_enfermedad} onChange={set('padece_enfermedad')}
              />
              {form.padece_enfermedad ? (
                <CampoTexto
                  label="¿Cuál enfermedad?" id="pf-enf-cual"
                  value={form.enfermedad_cual} onChange={set('enfermedad_cual')}
                  placeholder="Describe brevemente"
                />
              ) : <div />}

              <CampoSiNo
                label="¿Sufre de alguna alergia?" id="pf-alergia"
                value={form.sufre_alergia} onChange={set('sufre_alergia')}
              />
              {form.sufre_alergia ? (
                <CampoTexto
                  label="¿A qué alergia?" id="pf-alergia-cual"
                  value={form.alergia_cual} onChange={set('alergia_cual')}
                  placeholder="Describe brevemente"
                />
              ) : <div />}

              <CampoSiNo
                label="¿Toma medicamentos regularmente?" id="pf-meds"
                value={form.toma_medicamentos} onChange={set('toma_medicamentos')}
              />
              {form.toma_medicamentos ? (
                <CampoTexto
                  label="¿Cuáles medicamentos?" id="pf-meds-cual"
                  value={form.medicamentos_cuales} onChange={set('medicamentos_cuales')}
                  placeholder="Describe brevemente"
                />
              ) : <div />}

              <div className="portal__perfil-form-campo" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="pf-restricciones">Restricciones físicas</label>
                <textarea
                  id="pf-restricciones"
                  rows={3}
                  value={form.restricciones_fisicas}
                  onChange={set('restricciones_fisicas')}
                  placeholder="Describe cualquier limitación física relevante para las clases (opcional)"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {errorPerfil && <p className="portal__error">{errorPerfil}</p>}
            {exitoPerfil && <p className="portal__exito">{exitoPerfil}</p>}

            <div className="portal__perfil-form-acciones">
              <Button type="button" variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
              <Button type="submit" loading={guardando}>Guardar cambios</Button>
            </div>
          </form>
        ) : (
          <div className="portal__perfil-campos">
            <div><span>Nombre completo</span><strong>{perfil.nombres_completos}</strong></div>
            <div><span>Documento</span><strong>{perfil.tipo_documento} {perfil.numero_documento}</strong></div>
            <div><span>WhatsApp</span><strong>{perfil.whatsapp || '—'}</strong></div>
            <div><span>Email personal</span><strong>{perfil.email || '—'}</strong></div>
            {perfil.correo_institucional && (
              <div><span>Correo institucional</span><strong>{perfil.correo_institucional}</strong></div>
            )}
            <div>
              <span>Estado</span>
              <StatusBadge texto={perfil.activo ? 'Activo' : 'Inactivo'} variant={perfil.activo ? 'success' : 'secondary'} />
            </div>
            <div><span>Nivel(es)</span><strong>{perfil.niveles_nombres || '—'}</strong></div>
            {perfil.exento_pago ? (
              <div><span>Pago</span><StatusBadge texto="Exento de pago" variant="info" /></div>
            ) : null}
            {perfil.fecha_nacimiento && (
              <div><span>Fecha de nacimiento</span><strong>{formatearFecha(perfil.fecha_nacimiento)}</strong></div>
            )}
            {perfil.eps && <div><span>EPS</span><strong>{perfil.eps}</strong></div>}
            {perfil.tipo_sangre && <div><span>Tipo de sangre</span><strong>{perfil.tipo_sangre}</strong></div>}
            {perfil.padece_enfermedad ? (
              <div><span>Enfermedad</span><strong>{perfil.enfermedad_cual || 'Sí'}</strong></div>
            ) : null}
            {perfil.sufre_alergia ? (
              <div><span>Alergia</span><strong>{perfil.alergia_cual || 'Sí'}</strong></div>
            ) : null}
            {perfil.toma_medicamentos ? (
              <div><span>Medicamentos</span><strong>{perfil.medicamentos_cuales || 'Sí'}</strong></div>
            ) : null}
            {perfil.restricciones_fisicas && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span>Restricciones físicas</span>
                <strong>{perfil.restricciones_fisicas}</strong>
              </div>
            )}
            {perfil.fecha_ingreso && (
              <div><span>Fecha de ingreso</span><strong>{formatearFecha(perfil.fecha_ingreso)}</strong></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
