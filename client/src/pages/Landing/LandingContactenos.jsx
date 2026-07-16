import { useState } from 'react';
import { CONTENT } from './landingContent';
import { enviarFormularioContacto } from '../../services/contacto.service';

const { contactenos, escuela } = CONTENT;

export default function LandingContactenos() {
  const { hero, tiposEvento, mapaEmbedUrl, whatsappMensaje } = contactenos;

  const [form, setForm] = useState({
    nombre: '', email: '', telefono: '', tipoEvento: '', mensaje: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [exito,    setExito]    = useState(false);
  const [error,    setError]    = useState('');

  function actualizar(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await enviarFormularioContacto(form);
      setExito(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'No se pudo enviar el mensaje. Por favor escríbenos directamente por WhatsApp.'
      );
    } finally {
      setEnviando(false);
    }
  }

  // WhatsApp siempre disponible — número se agrega en landingContent.js
  const hayWa = escuela.whatsapp && escuela.whatsapp !== '57XXXXXXXXXX';
  const waUrl = hayWa
    ? `https://wa.me/${escuela.whatsapp}?text=${encodeURIComponent(whatsappMensaje)}`
    : null;

  return (
    <>
      {/* ═══════ HERO ══════════════════════════════════════════════════════ */}
      <section className="l-hero l-hero--inner">
        <div className="l-hero__bg" />
        <div className="l-hero__overlay" />
        <div className="l-hero__accent" />
        <div className="l-hero__glow" />
        <div className="l-hero__content">
          <div className="l-hero__pretitulo">Hablemos</div>
          <h1 className="l-hero__titulo">{hero.titulo}</h1>
          <p className="l-hero__subtitulo">{hero.subtitulo}</p>
        </div>
      </section>

      {/* ═══════ FORMULARIO + INFO ═════════════════════════════════════════ */}
      <section className="l-section">
        <div className="l-container">
          <div className="l-contacto__grid">

            {/* ── Formulario ──────────────────────────────────────────────── */}
            <div>
              <span className="l-label">Cuéntanos</span>
              <h2 className="l-h2" style={{ marginBottom: 8 }}>Tu evento</h2>
              <div className="l-rule" style={{ marginBottom: 32 }} />

              {exito ? (
                <div className="l-form__exito">
                  <div className="l-form__exito-icon">✅</div>
                  <h3 className="l-h3">¡Mensaje enviado!</h3>
                  <p style={{ color: 'var(--l-text2)', fontSize: 14 }}>
                    Recibimos tu consulta y nos pondremos en contacto pronto.<br />
                    También puedes escribirnos directamente por WhatsApp.
                  </p>
                  {hayWa && (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="l-btn l-btn--primary">
                      💬 Ir a WhatsApp
                    </a>
                  )}
                  <button
                    className="l-btn l-btn--ghost"
                    onClick={() => {
                      setForm({ nombre:'', email:'', telefono:'', tipoEvento:'', mensaje:'' });
                      setExito(false);
                    }}
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <form onSubmit={enviar} className="l-form">
                  <div className="l-form__row">
                    <div className="l-field">
                      <label className="l-field__label">Nombre *</label>
                      <input
                        className="l-field__input"
                        name="nombre"
                        value={form.nombre}
                        onChange={actualizar}
                        required
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div className="l-field">
                      <label className="l-field__label">Correo electrónico</label>
                      <input
                        className="l-field__input"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={actualizar}
                        placeholder="tu@correo.com"
                      />
                    </div>
                  </div>

                  <div className="l-form__row">
                    <div className="l-field">
                      <label className="l-field__label">Teléfono / WhatsApp</label>
                      <input
                        className="l-field__input"
                        name="telefono"
                        value={form.telefono}
                        onChange={actualizar}
                        placeholder="3XX XXX XXXX"
                      />
                    </div>
                    <div className="l-field">
                      <label className="l-field__label">Tipo de evento</label>
                      <select
                        className="l-field__select"
                        name="tipoEvento"
                        value={form.tipoEvento}
                        onChange={actualizar}
                      >
                        <option value="">Selecciona una opción</option>
                        {tiposEvento.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="l-field">
                    <label className="l-field__label">Cuéntanos más *</label>
                    <textarea
                      className="l-field__textarea"
                      name="mensaje"
                      value={form.mensaje}
                      onChange={actualizar}
                      required
                      placeholder="Fecha aproximada, lugar, número de asistentes, qué tipo de show necesitas..."
                      rows={5}
                    />
                  </div>

                  {error && (
                    <p style={{ fontSize: 13, color: '#e74c3c', background: 'rgba(231,76,60,0.08)', padding: '10px 14px', borderRadius: 3 }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="l-btn l-btn--primary"
                    style={{ alignSelf: 'flex-start' }}
                    disabled={enviando}
                  >
                    {enviando ? 'Enviando...' : 'Enviar mensaje →'}
                  </button>
                </form>
              )}
            </div>

            {/* ── Información de contacto ──────────────────────────────── */}
            <div className="l-contacto__info">
              <div>
                <span className="l-label">Encuéntranos</span>
                <h2 className="l-h2" style={{ marginBottom: 8 }}>Contacto</h2>
                <div className="l-rule" />
              </div>

              {/* WhatsApp — siempre visible, número se agrega en landingContent.js */}
              <div className="l-contacto__item">
                <div className="l-contacto__item-icon">💬</div>
                <div>
                  <div className="l-contacto__item-titulo">WhatsApp</div>
                  <div className="l-contacto__item-valor">
                    {hayWa ? (
                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        Escríbenos ahora →
                      </a>
                    ) : (
                      <span style={{ color: 'var(--l-muted)', fontSize: 13 }}>
                        Número próximamente disponible
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {escuela.email && (
                <div className="l-contacto__item">
                  <div className="l-contacto__item-icon">✉️</div>
                  <div>
                    <div className="l-contacto__item-titulo">Correo electrónico</div>
                    <div className="l-contacto__item-valor">
                      <a href={`mailto:${escuela.email}`}>{escuela.email}</a>
                    </div>
                  </div>
                </div>
              )}

              <div className="l-contacto__item">
                <div className="l-contacto__item-icon">📍</div>
                <div>
                  <div className="l-contacto__item-titulo">Ubicación</div>
                  <div className="l-contacto__item-valor">{escuela.ciudad}</div>
                </div>
              </div>

              {/* Redes sociales */}
              <div>
                <div className="l-contacto__item-titulo" style={{ marginBottom: 12 }}>
                  Síguenos
                </div>
                <div className="l-contacto__redes">
                  {escuela.redes.instagram && (
                    <a href={escuela.redes.instagram} target="_blank" rel="noopener noreferrer" className="l-contacto__red">
                      📸 Instagram
                    </a>
                  )}
                  {escuela.redes.facebook && (
                    <a href={escuela.redes.facebook} target="_blank" rel="noopener noreferrer" className="l-contacto__red">
                      📘 Facebook
                    </a>
                  )}
                  {escuela.redes.youtube && (
                    <a href={escuela.redes.youtube} target="_blank" rel="noopener noreferrer" className="l-contacto__red">
                      ▶️ YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Mapa ──────────────────────────────────────────────────────── */}
          <div className="l-mapa">
            <iframe
              src={mapaEmbedUrl}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Barahúnda Batucada"
            />
          </div>
        </div>
      </section>
    </>
  );
}
