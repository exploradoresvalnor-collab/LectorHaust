import React from 'react';
import { IonCard, IonCardContent } from '@ionic/react';

interface AnimeCardItemProps {
  anime: any;
  onClick: () => void;
  index?: number;
}

// Helper para obtener banderas de idioma
const getLanguageFlags = (anime: any): string[] => {
  const flags: string[] = [];
  
  // Detectar si tiene subtítulos
  if (anime.episodes?.sub > 0 || anime.hasSub) {
    flags.push('🇯🇵'); // Japonés subtitulado
  }
  
  // Detectar si tiene doblaje
  if (anime.episodes?.dub > 0 || anime.hasDub) {
    flags.push('🗣️'); // Doblaje
  }
  
  // Si no hay especificación, asumir subtítulos
  if (flags.length === 0 && (anime.languageCategory === 'sub' || !anime.languageCategory)) {
    flags.push('🇯🇵');
  }
  
  return flags;
};

// Helper para categorizar el tipo de anime
const getTypeColor = (type: string): string => {
  const typeMap: {[key: string]: string} = {
    'TV': '#ff6b6b',      // Rojo
    'Movie': '#4ecdc4',   // Turquesa
    'OVA': '#9b59b6',     // Púrpura
    'ONA': '#3498db',     // Azul
    'Special': '#f39c12', // Naranja
  };
  return typeMap[type] || '#8c52ff';
};

// Helper para obtener géneros (máximo 2-3)
const getGenres = (anime: any): string[] => {
  if (Array.isArray(anime.genres)) {
    return anime.genres.slice(0, 2);
  }
  return [];
};

const AnimeCardItem: React.FC<AnimeCardItemProps> = ({ anime, onClick, index = 0 }) => {
  const languages = getLanguageFlags(anime);
  const genres = getGenres(anime);
  const typeColor = getTypeColor(anime.type || anime.category);
  
  return (
    <IonCard
      className="anime-card"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        margin: '0',
        animationDelay: `${index * 0.05}s`,
      }}
    >
      {/* Portada con aspecto ratio 2:3 (manga estándar) */}
      <div style={{ position: 'relative', paddingTop: '140%', overflow: 'hidden' }}>
        {anime.image ? (
          <img
            src={anime.image}
            className="anime-card-img"
            alt={anime.title || anime.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Gradiente Premium para legibilidad del título (Estándar Gemini) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70%',
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.95) 0%, rgba(10, 10, 15, 0.4) 40%, transparent 100%)',
          zIndex: 1
        }} />

        {/* Tipo de anime (esquina superior derecha) - Rediseñado Premium */}
        {(anime.type || anime.category) && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: `${typeColor}`,
              color: 'white',
              padding: '2px 8px',
              borderRadius: '20px',
              fontSize: '0.6rem',
              fontWeight: '900',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              zIndex: 2,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {anime.type || anime.category}
          </div>
        )}

        {/* Idiomas con banderas (esquina superior izquierda) */}
        {languages.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              display: 'flex',
              gap: '4px',
              zIndex: 2
            }}
          >
            {languages.map((flag, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {flag}
              </div>
            ))}
          </div>
        )}

        {/* Información en el gradiente (Título e Info rápida) */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {/* Episodios y Calidad */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(anime.episodes?.sub > 0 || anime.episodes?.dub > 0) && (
              <span style={{ color: '#00ff88', fontSize: '0.7rem', fontWeight: 'bold' }}>
                {anime.episodes.sub > 0 ? `${anime.episodes.sub} eps` : `${anime.episodes.dub} eps`}
              </span>
            )}
            <span style={{ color: '#fbbf24', fontSize: '0.65rem', fontWeight: 'bold', border: '1px solid #fbbf24', padding: '0 4px', borderRadius: '3px' }}>
              HD
            </span>
          </div>

          <h4
            style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: '700',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.2',
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}
          >
            {anime.title || anime.name || 'Sin título'}
          </h4>
          
          {/* Géneros (Solo si hay espacio/hover) */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '2px', opacity: 0.8 }}>
            {genres.map((g: string, i: number) => (
              <span key={i} style={{ fontSize: '0.6rem', color: '#94a3b8' }}>#{g}</span>
            ))}
          </div>
        </div>
      </div>
    </IonCard>
  );
};

export default AnimeCardItem;
