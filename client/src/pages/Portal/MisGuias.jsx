import { useState, useEffect } from 'react';
import { obtenerMisGuias } from '../../services/portal.service';
import './Portal.css';

/**
 * Extrae el ID de un video de YouTube desde distintos formatos de URL.
 * Retorna null si no es un enlace de YouTube.
 */
function extraerYoutubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split(/[?&]/)[0] || null;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) {
        return u.pathname.split('/embed/')[1]?.split(/[?&]/)[0] || null;
      }
      return u.searchParams.get('v') || null;
    }
  } catch {
    /* URL inválida */
  }
  return null;
}

function agruparPorNivel(guias) {
  const map = new Map();
  for (const g of guias) {
    const key = g.nivel_id;
    if (!map.has(key)) {
      map.set(key, { nivel_id: g.nivel_id, nivel_nombre: g.nivel_nombre, guias: [] });
    }
    map.get(key).guias.push(g);
  }
  return Array.from(map.values());
}

function TipoBadge({ tipo }) {
  return (
    <span className={`portal__guia-tipo portal__guia-tipo--${tipo}`}>
      {tipo === 'VIDEO' ? '▶ Video' : tipo === 'PDF' ? '📄 PDF' : '📝 Texto'}
    </span>
  );
}

function GuiaCard({ guia }) {
  const videoId = guia.tipo === 'VIDEO' ? extraerYoutubeId(guia.url_video) : null;

  return (
    <div className="portal__guia-card">
      {videoId && (
        <div className="portal__guia-video-wrapper">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={guia.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="portal__guia-cuerpo">
        <div className="portal__guia-header">
          <h3 className="portal__guia-titulo">{guia.titulo}</h3>
          <TipoBadge tipo={guia.tipo} />
        </div>

        {guia.descripcion && (
          <p className="portal__guia-desc">{guia.descripcion}</p>
        )}

        {/* Video no-YouTube → mostrar enlace */}
        {guia.tipo === 'VIDEO' && guia.url_video && !videoId && (
          <a href={guia.url_video} target="_blank" rel="noopener noreferrer" className="portal__guia-link">
            ▶ Ver video →
          </a>
        )}

        {/* PDF o recurso externo */}
        {guia.tipo === 'PDF' && guia.url_video && (
          <a href={guia.url_video} target="_blank" rel="noopener noreferrer" className="portal__guia-link">
            📄 Abrir PDF →
          </a>
        )}

        {/* Contenido de texto */}
        {guia.tipo === 'TEXTO' && guia.contenido && (
          <pre className="portal__guia-contenido">{guia.contenido}</pre>
        )}
      </div>
    </div>
  );
}

export default function MisGuias() {
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerMisGuias()
      .then((r) => setGrupos(agruparPorNivel(r.data || [])))
      .catch(() => setGrupos([]))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="portal__cargando">Cargando guías...</p>;

  return (
    <div className="portal__seccion">
      <h1>Guías y recursos</h1>
      <p className="portal__nota">Material de estudio organizado por nivel.</p>

      {grupos.length === 0 ? (
        <div className="portal__vacio">
          <span>📚</span>
          <p>Aún no hay guías disponibles para tus niveles.</p>
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.nivel_id} className="portal__guias-seccion">
            <h2 className="portal__guia-nivel-titulo">{grupo.nivel_nombre}</h2>
            <div className="portal__guias-grid">
              {grupo.guias.map((g) => (
                <GuiaCard key={g.id} guia={g} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
