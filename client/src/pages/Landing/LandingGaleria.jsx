import { useState } from 'react';
import { CONTENT } from './landingContent';

const { galeria } = CONTENT;

/* ── Lightbox ─────────────────────────────────────────────────────────────── */
function Lightbox({ imagenes, indice, onClose, onPrev, onNext }) {
  if (indice === null) return null;
  const img = imagenes[indice];

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft')  onPrev();
    if (e.key === 'ArrowRight') onNext();
    if (e.key === 'Escape')     onClose();
  }

  return (
    <div
      className="l-lightbox"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={(el) => el?.focus()}
    >
      <button className="l-lightbox__cerrar" onClick={onClose}>✕</button>

      {indice > 0 && (
        <button
          className="l-lightbox__nav l-lightbox__nav--prev"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
        >
          ‹
        </button>
      )}

      <img
        src={img.src}
        alt={img.alt}
        className="l-lightbox__img"
        onClick={(e) => e.stopPropagation()}
      />

      {indice < imagenes.length - 1 && (
        <button
          className="l-lightbox__nav l-lightbox__nav--next"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
        >
          ›
        </button>
      )}
    </div>
  );
}

export default function LandingGaleria() {
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [lightboxIdx, setLightboxIdx]         = useState(null);

  const imagenesVisibles = galeria.imagenes.filter(
    (img) => categoriaActiva === 'Todos' || img.categoria === categoriaActiva
  );

  return (
    <>
      {/* ═══════ HERO ══════════════════════════════════════════════════════ */}
      <section className="l-hero l-hero--inner">
        <div className="l-hero__bg" />
        <div className="l-hero__overlay" />
        <div className="l-hero__accent" />

        <div className="l-hero__content">
          <div className="l-hero__pretitulo">Nuestros momentos</div>
          <h1 className="l-hero__titulo">Galería</h1>
          <p className="l-hero__subtitulo">
            Cada foto cuenta una batalla ganada
          </p>
        </div>
      </section>

      {/* ═══════ GALERÍA ═══════════════════════════════════════════════════ */}
      <section className="l-section">
        <div className="l-container">

          {/* Filtros */}
          <div className="l-galeria__filtros">
            {galeria.categorias.map((cat) => (
              <button
                key={cat}
                className={`l-filtro-btn ${categoriaActiva === cat ? 'l-filtro-btn--active' : ''}`}
                onClick={() => setCategoriaActiva(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid de imágenes */}
          <div className="l-galeria__grid">
            {imagenesVisibles.length === 0 ? (
              <div className="l-galeria__vacio">
                <div className="l-galeria__vacio-icon">📷</div>
                <p className="l-galeria__vacio-txt">
                  Las fotos se agregarán próximamente.<br />
                  Coloca las imágenes en <code>client/public/landing/galeria/</code> y
                  regístralas en <code>landingContent.js</code> bajo la sección <code>galeria.imagenes</code>.
                </p>
              </div>
            ) : (
              imagenesVisibles.map((img, i) => (
                <div
                  key={i}
                  className="l-galeria__item"
                  onClick={() => setLightboxIdx(galeria.imagenes.indexOf(img))}
                >
                  <img src={img.src} alt={img.alt} className="l-galeria__item-img" />
                  <div className="l-galeria__item-overlay">🔍</div>
                </div>
              ))
            )}
          </div>

          {/* Videos */}
          {galeria.videos.length > 0 && (
            <>
              <div style={{ marginTop: 80, marginBottom: 16 }}>
                <span className="l-label">En movimiento</span>
                <h2 className="l-h2">Videos</h2>
                <div className="l-rule" />
              </div>

              <div className="l-videos__grid">
                {galeria.videos.map((v, i) => (
                  <div key={i} className="l-video-card">
                    <iframe
                      src={v.embedUrl}
                      title={v.titulo}
                      className="l-video-card__embed"
                      allowFullScreen
                    />
                    <div className="l-video-card__titulo">{v.titulo}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      <Lightbox
        imagenes={galeria.imagenes}
        indice={lightboxIdx}
        onClose={() => setLightboxIdx(null)}
        onPrev={() => setLightboxIdx((i) => Math.max(0, i - 1))}
        onNext={() => setLightboxIdx((i) => Math.min(galeria.imagenes.length - 1, i + 1))}
      />
    </>
  );
}
