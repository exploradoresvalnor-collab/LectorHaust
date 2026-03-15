import React from 'react';
import { IonCard, IonCardContent, IonText } from '@ionic/react';
import { mangadexService } from '../services/mangadexService';
import './MangaCard.css';

interface MangaCardProps {
  title: string;
  coverUrl: string;
  format?: string;
  tags?: string[];
  progressLabel?: string;
  onClick?: () => void;
}

const MangaCard: React.FC<MangaCardProps> = ({ title, coverUrl, format, tags = [], progressLabel, onClick }) => {
  const getBadgeInfo = () => {
    switch(format?.toLowerCase()) {
      case 'ja': return { label: 'MANGA', class: 'manga' };
      case 'ko': return { label: 'MANHWA', class: 'manhwa' };
      case 'zh': return { label: 'MANHUA', class: 'manhua' };
      case 'en': return { label: 'COMIC', class: 'comic' };
      default: return null;
    }
  };

  const badge = getBadgeInfo();

  return (
    <div className="manga-card-pro animate-fade-in" onClick={onClick}>
      <div className="card-media">
        <img src={mangadexService.getOptimizedUrl(coverUrl)} alt={title} className="card-img" loading="lazy" />
        <div className="card-overlay">
          <div className="card-content-bottom">
            <div className="card-tags-container">
              {badge && <span className={`card-tag ${badge.class}`}>{badge.label}</span>}
              {progressLabel && <span className="card-tag read">{progressLabel}</span>}
              {tags.map((tag, i) => (
                <span key={i} className="card-genre-tag">{tag}</span>
              ))}
            </div>
            <h3 className="card-title-pro">{title}</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MangaCard;
