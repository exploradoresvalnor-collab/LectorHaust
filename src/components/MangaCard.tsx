import React from 'react';
import { mangadexService } from '../services/mangadexService';
import SmartImage from './SmartImage';
import './MangaCard.css';

interface MangaCardProps {
  title: string;
  coverUrl: string;
  format?: string;
  tags?: string[];
  progressLabel?: string;
  sources?: string[]; 
  onClick?: () => void;
  rating?: number;
  status?: string;
  chapters?: number | string;
  mangaType?: string;
}

const MangaCard: React.FC<MangaCardProps> = ({ 
  title, 
  coverUrl, 
  format, 
  tags = [], 
  progressLabel, 
  sources = [], 
  onClick,
  rating,
  status,
  chapters,
  mangaType
}) => {
  const getBadgeInfo = () => {
    const lowerType = (mangaType || format || '').toLowerCase();
    if (['webtoon', 'manhwa', 'manhua', 'manga', 'one-shot'].includes(lowerType)) {
      return { label: lowerType.toUpperCase(), class: lowerType };
    }
    return { label: 'MANGA', class: 'manga' };
  };

  const badge = getBadgeInfo();

  return (
    <div className="manga-card-tmo-wrapper" onClick={onClick}>
      <div className="manga-card-tmo animate-fade-in">
        <div className="card-thumb-column">
          <SmartImage 
            src={coverUrl} 
            alt={title} 
            className="thumb-img" 
            width={110}
            height={160}
          />
          <div className="card-rating-pill">
            <span className="star-icon">★</span>
            <span className="rating-num">{(rating as number || 8.5).toFixed(2)}</span>
          </div>
        </div>

        <div className="card-info-column">
          <h3 className="card-title-tmo">{title}</h3>
          
          <div className="card-metadata-lines">
            <div className="meta-line">
              <span className="meta-label">Estado</span>
              <span className={`meta-value status-badge ${status?.toLowerCase().includes('en emisión') ? 'emision' : 'finalizado'}`}>
                {status || 'En emisión'}
              </span>
            </div>
            
            <div className="meta-line">
              <span className="meta-label">Capítulos</span>
              <span className="meta-value chapters-count">{chapters || '??'}</span>
            </div>
            
            <div className="meta-genres-row">
              {tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="genre-label">{tag}</span>
              ))}
            </div>
          </div>

          <div className="card-footer-tags">
            <span className="tag-pill category-pill">Shounen</span>
            <span className={`tag-pill type-pill ${badge.class}`}>{badge.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MangaCard;
