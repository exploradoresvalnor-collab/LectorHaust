import React from 'react';
import { IonCard, IonBadge } from '@ionic/react';
import SmartImage from './SmartImage';

interface AnimeCardItemProps {
  anime: any;
  onClick: () => void;
  index?: number;
  showEpisode?: boolean;
}

const AnimeCardItem: React.FC<AnimeCardItemProps> = ({ anime, onClick, index = 0, showEpisode = false }) => {
  // Helpers para etiquetas (estilo Manga)
  const type = anime.type || anime.category || 'TV';
  
  // Si tiene number (ej: últimas actualizaciones) mostramos "EP. X", si no, el total.
  const eps = anime.number || anime.episodeNumber || anime.episodes?.sub || anime.episodes?.dub || anime.totalEpisodes;
  const isLatest = !!(anime.number || anime.episodeNumber) || showEpisode;
  
  const hasSub = anime.episodes?.sub > 0 || anime.hasSub || anime.languageCategory === 'sub';
  const hasDub = anime.episodes?.dub > 0 || anime.hasDub || anime.languageCategory === 'dub' || anime.language === 'latino';
  
  // Haus Intelligence: Sources
  const sources = anime.sources || (anime.source ? [anime.source === 'animeflv' ? 'FL' : 'TI'] : []);

  return (
    <div 
      className="manga-card-pro animate-fade-in" 
      onClick={onClick}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="card-media">
        <SmartImage 
          src={anime.image} 
          alt={anime.title || anime.name} 
          className="card-img"
        />
        <div className="card-overlay">
          <div className="card-tags-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={`card-tag ${type.toLowerCase()}`}>{type}</span>
                {eps && <span className="card-tag eps">{isLatest ? `CAP. ${eps}` : `${eps} EP`}</span>}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                {hasSub && <span className="card-tag sub" style={{ background: 'rgba(46, 204, 113, 0.9)' }}>SUB</span>}
                {hasDub && <span className="card-tag dub" style={{ background: 'rgba(231, 76, 60, 0.9)' }}>LAT</span>}
                {anime.year && <span className="card-tag" style={{ background: 'rgba(255,255,255,0.2)' }}>{anime.year}</span>}
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '4px' }}>
              {sources.map((s: string) => (
                <span key={s} className="card-tag" style={{ 
                  fontSize: '0.5rem', 
                  padding: '1px 4px', 
                  borderColor: 'rgba(var(--ion-color-primary-rgb), 0.5)',
                  color: 'var(--ion-color-primary)'
                }}>
                  {s.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <h3 className="card-title-pro" style={{ fontSize: '0.75rem', marginTop: '6px' }}>{anime.title || anime.name}</h3>
    </div>
  );
};

export default AnimeCardItem;
