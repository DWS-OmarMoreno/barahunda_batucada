import { useState } from 'react';
import { CONTENT } from './landingContent';

const { nosotros } = CONTENT;

/* ── Imagen con placeholder ────────────────────────────────────────────────── */
function ImgOrPlaceholder({ src, alt, className }) {
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

/* ── Modal de nivel ────────────────────────────────────────────────────────── */
function NivelModal({ nivel, onClose }) {
  if (!nivel) return null;

  return (
    <div className="l-modal-overlay" onClick={onClose}>
      <div className="l-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header con imagen */}
        <div className="l-modal__header">
          <img
            src={nivel.imagen}
            alt={nivel.nombre}
            className="l-modal__header-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.style.background = 'var(--l-surface3)';
            }}
          />
          <div className="l-modal__header-overlay">
            <div className="l-modal__subtitulo">{nivel.etiqueta}</div>
            <div className="l-modal__titulo">{nivel.nombre}</div>
          </div>
          <button className="l-modal__cerrar" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* Cuerpo */}
        <div className="l-modal__body">
          <p className="l-modal__desc">{nivel.descripcion}</p>

          <div>
            <div className="l-modal__detalle-titulo">En este nivel aprenderás</div>
            <ul className="l-modal__detalle-lista">
              {nivel.detalles.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Card de nivel ─────────────────────────────────────────────────────────── */
function NivelCard({ nivel, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="l-nivel-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>

      {imgError ? (
        <div className="l-nivel-card__placeholder">
          <span style={{ fontSize: 48, opacity: 0.3 }}>🥁</span>
          <span>{nivel.nombre}</span>
        </div>
      ) : (
        <img
          src={nivel.imagen}
          alt={nivel.nombre}
          className="l-nivel-card__img"
          onError={() => setImgError(true)}
        />
      )}

      <div className="l-nivel-card__overlay">
        <div className="l-nivel-card__romano">{nivel.romano}</div>
        <div className="l-nivel-card__nombre">{nivel.nombre}</div>
        <div className="l-nivel-card__nivel-tag">{nivel.etiqueta}</div>
        <div className="l-nivel-card__cta">Ver más →</div>
      </div>
    </div>
  );
}

/* ── Componente de miembro del equipo ──────────────────────────────────────── */
function MemberCard({ miembro }) {
  return (
    <div className="l-equipo-card">
      <div style={{ overflow: 'hidden', aspectRatio: '3/4', background: 'var(--l-surface2)' }}>
        <img
          src={miembro.foto}
          alt={miembro.nombre}
          className="l-equipo-card__foto"
          onError={(e) => {
            e.currentTarget.parentElement.innerHTML = `
              <div class="l-img-placeholder" style="height:100%">
                <div class="l-img-placeholder__icon">👤</div>
              </div>`;
          }}
        />
      </div>
      <div className="l-equipo-card__info">
        <div className="l-equipo-card__nombre">{miembro.nombre}</div>
        <div className="l-equipo-card__rol">{miembro.rol}</div>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────────────── */
export default function LandingNosotros() {
  const { hero, historia, mision, equipo, niveles, timeline } = nosotros;
  const [nivelSeleccionado, setNivelSeleccionado] = useState(null);

  return (
    <>
      {/* ═══════ HERO INTERIOR ═════════════════════════════════════════════ */}
      <section className="l-hero l-hero--inner">
        <div className="l-hero__bg" />
        <div
          className="l-hero__bg-img"
          style={{ backgroundImage: `url(${hero.imagen})` }}
        />
        <div className="l-hero__overlay" />
        <div className="l-hero__accent" />

        <div className="l-hero__content">
          <div className="l-hero__pretitulo">Sobre nosotros</div>
          <h1 className="l-hero__titulo">{hero.titulo}</h1>
          <p className="l-hero__subtitulo">{hero.subtitulo}</p>
        </div>
      </section>

      {/* ═══════ HISTORIA ══════════════════════════════════════════════════ */}
      <section className="l-section">
        <div className="l-container">
          <div className="l-historia">
            <ImgOrPlaceholder
              src={historia.imagen}
              alt="Historia de Barahúnda"
              className="l-historia__img"
            />
            <div className="l-historia__texto">
              <span className="l-label">Nuestros orígenes</span>
              <h2 className="l-h2">{historia.titulo}</h2>
              <div className="l-rule" />
              {historia.parrafos.map((p, i) => (
                <p key={i} className="l-historia__parrafo">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ MISIÓN / VISIÓN / VALORES ════════════════════════════════ */}
      <section className="l-section l-section--dark">
        <div className="l-container">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span className="l-label">Nuestro propósito</span>
            <h2 className="l-h2">El código<br />del guerrero</h2>
            <div className="l-rule l-rule--center" />
          </div>
          <div className="l-mision__grid">
            {mision.map((m) => (
              <div key={m.titulo} className="l-mision-card">
                <div className="l-mision-card__romano">{m.romano}</div>
                <h3 className="l-mision-card__titulo">{m.titulo}</h3>
                <p className="l-mision-card__texto">{m.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ EQUIPO ════════════════════════════════════════════════════ */}
      <section className="l-section">
        <div className="l-container">
          <div style={{ marginBottom: 48 }}>
            <span className="l-label">Las personas detrás del tambor</span>
            <h2 className="l-h2">Los guerreros</h2>
            <div className="l-rule" />
          </div>
          <div className="l-equipo__grid">
            {equipo.map((m, i) => (
              <MemberCard key={i} miembro={m} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ NIVELES DE FORMACIÓN ══════════════════════════════════════ */}
      <section className="l-section l-section--dark">
        <div className="l-container">
          <div style={{ marginBottom: 48 }}>
            <span className="l-label">Nuestro programa</span>
            <h2 className="l-h2">Niveles de formación</h2>
            <div className="l-rule" />
            <p style={{ color: 'var(--l-text2)', fontSize: 15, maxWidth: 560, lineHeight: 1.7, marginTop: 8 }}>
              Cada guerrero tiene su nivel. Da click en cada nivel para conocer el detalle del programa formativo.
            </p>
          </div>

          <div className="l-niveles__grid">
            {niveles.map((nivel) => (
              <NivelCard
                key={nivel.nombre}
                nivel={nivel}
                onClick={() => setNivelSeleccionado(nivel)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ TIMELINE ══════════════════════════════════════════════════ */}
      <section className="l-section">
        <div className="l-container">
          <div style={{ marginBottom: 16 }}>
            <span className="l-label">Nuestro camino</span>
            <h2 className="l-h2">Hitos de batalla</h2>
            <div className="l-rule" />
          </div>
          <div className="l-timeline">
            {timeline.map((t, i) => (
              <div key={i} className="l-timeline__item">
                <div className="l-timeline__anio">{t.año}</div>
                <div className="l-timeline__hito">{t.hito}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ MODAL NIVEL ═══════════════════════════════════════════════ */}
      <NivelModal
        nivel={nivelSeleccionado}
        onClose={() => setNivelSeleccionado(null)}
      />
    </>
  );
}
