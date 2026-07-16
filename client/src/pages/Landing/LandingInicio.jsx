import { Link } from 'react-router-dom';
import { CONTENT } from './landingContent';

const { inicio, escuela } = CONTENT;

/* ── Helper: imagen o placeholder ─────────────────────────────────────────── */
function Img({ src, alt, className, style }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

function ImgBox({ src, alt, className }) {
  return (
    <div className={className} style={{ position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => {
          e.currentTarget.parentElement.innerHTML = `
            <div class="l-img-placeholder">
              <div class="l-img-placeholder__icon">📷</div>
              <span>Imagen próximamente</span>
            </div>`;
        }}
      />
    </div>
  );
}

export default function LandingInicio() {
  const { hero, servicios, stats, sobrePreview, galeriaPreview } = inicio;

  /* ── WhatsApp CTA ─────────────────────────────────────────────────────── */
  const waUrl = escuela.whatsapp && escuela.whatsapp !== '57XXXXXXXXXX'
    ? `https://wa.me/${escuela.whatsapp}?text=${encodeURIComponent('¡Hola! Quiero saber más sobre Barahúnda Batucada.')}`
    : null;

  return (
    <>
      {/* ═══════ HERO ══════════════════════════════════════════════════════ */}
      <section className="l-hero">
        {/* Fondo: patrón de cuadrícula */}
        <div className="l-hero__bg" />

        {/* Imagen de fondo cuando existe */}
        <div
          className="l-hero__bg-img"
          style={{ backgroundImage: `url(${hero.imagen})` }}
        />

        <div className="l-hero__overlay" />
        <div className="l-hero__accent" />
        <div className="l-hero__glow" />

        <div className="l-hero__content">
          <div className="l-hero__pretitulo">
            Bogotá, Colombia
          </div>

          <h1 className="l-hero__titulo">
            {hero.titulo[0]}<br />
            <em>{hero.titulo[1]}</em>
          </h1>

          <p className="l-hero__subtitulo">{hero.subtitulo}</p>

          <div className="l-hero__ctas">
            <Link to="/contactenos" className="l-btn l-btn--primary">
              {hero.cta} →
            </Link>
            <Link to="/nosotros" className="l-btn l-btn--ghost">
              Conoce más
            </Link>
          </div>
        </div>

        <div className="l-hero__scroll">
          <span>↓</span>
          <span>Scroll</span>
        </div>
      </section>

      {/* ═══════ SERVICIOS ═════════════════════════════════════════════════ */}
      <section className="l-section">
        <div className="l-container">
          <div className="l-servicios__header">
            <span className="l-label">Lo que hacemos</span>
            <h2 className="l-h2">Ritmo para cada<br />escenario</h2>
            <div className="l-rule l-rule--center" />
          </div>

          <div className="l-servicios__grid">
            {servicios.map((s) => (
              <div key={s.titulo} className="l-servicio-card">
                <div className="l-servicio-card__icono">{s.icono}</div>
                <h3 className="l-servicio-card__titulo">{s.titulo}</h3>
                <p className="l-servicio-card__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ STATS ═════════════════════════════════════════════════════ */}
      <div className="l-stats">
        <div className="l-container">
          <div className="l-stats__grid">
            {stats.map((s) => (
              <div key={s.etiqueta} className="l-stat">
                <div className="l-stat__valor">{s.valor}</div>
                <div className="l-stat__etiqueta">{s.etiqueta}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════ SOBRE NOSOTROS (preview) ══════════════════════════════════ */}
      <section className="l-section l-section--dark">
        <div className="l-container">
          <div className="l-sobre-split">

            <div className="l-sobre-split__texto">
              <span className="l-label">Quiénes somos</span>
              <h2 className="l-h2" style={{ whiteSpace: 'pre-line' }}>
                {sobrePreview.titulo}
              </h2>
              <div className="l-rule" />
              <p className="l-sobre-split__body">{sobrePreview.texto}</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                <Link to="/nosotros" className="l-btn l-btn--primary">
                  {sobrePreview.cta} →
                </Link>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="l-btn l-btn--outline">
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>

            <ImgBox
              src={sobrePreview.imagen}
              alt="Barahúnda Batucada"
              className="l-sobre-split__imagen"
            />
          </div>
        </div>
      </section>

      {/* ═══════ PREVIEW GALERÍA ═══════════════════════════════════════════ */}
      <section className="l-section">
        <div className="l-container">
          <div className="l-galeria-preview__header">
            <div>
              <span className="l-label">Nuestros momentos</span>
              <h2 className="l-h2">Galería</h2>
            </div>
            <Link to="/galeria" className="l-btn l-btn--ghost">
              Ver todo →
            </Link>
          </div>

          <div className="l-galeria-preview__grid">
            {galeriaPreview.map((src, i) => (
              <Link to="/galeria" key={i} className="l-galeria-preview__item">
                <img
                  src={src}
                  alt={`Foto ${i + 1}`}
                  onError={(e) => {
                    e.currentTarget.parentElement.style.background = 'var(--l-surface3)';
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA FINAL ═════════════════════════════════════════════════ */}
      <section className="l-section l-section--dark">
        <div className="l-container">
          <div className="l-cta-banner">
            <div className="l-cta-banner__inner">
              <span className="l-label l-label--gold">¿Tienes un evento?</span>
              <h2 className="l-h2">Hagamos algo<br /><em style={{ color: 'var(--l-red)' }}>épico</em> juntos</h2>
              <p style={{ color: 'var(--l-text2)', fontSize: 16, maxWidth: 480, lineHeight: 1.6 }}>
                Desde shows en vivo hasta talleres comunitarios. Llevamos el ritmo de Barahúnda a donde lo necesites.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/contactenos" className="l-btn l-btn--primary">
                  Contáctenos →
                </Link>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" className="l-btn l-btn--outline">
                    💬 Escríbenos por WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
