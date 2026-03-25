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
  const status = anime.status?.toLowerCase().includes('finished') ? 'FIN' : 'AIR';
  
  // Si tiene number (ej: últimas actualizaciones) mostramos "EP. X", si no, el total.
  const eps = anime.number || anime.episodeNumber || anime.episodes?.sub || anime.episodes?.dub || anime.totalEpisodes;
  const isLatest = !!(anime.number || anime.episodeNumber) || showEpisode;
  
  const hasSub = anime.episodes?.sub > 0 || anime.hasSub || anime.languageCategory === 'sub';
  const hasDub = anime.episodes?.dub > 0 || anime.hasDub || anime.languageCategory === 'dub';

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
            <span className={`card-tag ${type.toLowerCase()}`}>{type}</span>
            {eps && <span className="card-tag eps">{isLatest ? `CAP. ${eps}` : `${eps} EP`}</span>}
            {hasSub && <span className="card-tag sub">SUB</span>}
            {hasDub && <span className="card-tag dub">LAT</span>}
          </div>
        </div>
      </div>
      <h3 className="card-title-pro">{anime.title || anime.name}</h3>
    </div>
  );
};

export default AnimeCardItem;
