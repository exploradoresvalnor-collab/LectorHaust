import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { 
  playCircleOutline, 
  checkmarkCircle, 
  chevronBackOutline, 
  chevronForwardOutline,
  bookOutline,
  playOutline
} from 'ionicons/icons';
import '../styles.css';

interface HeroItem {
  id: string;
  title: string;
  name?: string;
  image: string;
  description: string;
  badge?: string;
  status?: string;
  link: string;
  type?: string;
  isTranslated?: boolean;
  episodes?: any;
  raw?: any;
}

interface HeroGridProps {
  heroItems: HeroItem[];
  onItemClick: (item: HeroItem) => void;
}

const HeroGrid: React.FC<HeroGridProps> = ({ heroItems, onItemClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isMobile] = useState(window.innerWidth < 768);
  const itemsPerView = isMobile ? 1 : 2;

  const handleNext = () => {
    setCurrentIndex((prev) => {
      const nextIndex = prev + itemsPerView;
      return nextIndex >= heroItems.length ? 0 : nextIndex;
    });
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => {
      if (prev === 0) {
        return heroItems.length - itemsPerView < 0 ? 0 : heroItems.length - itemsPerView;
      }
      return prev - itemsPerView;
    });
  };

  const visibleItems = heroItems.slice(currentIndex, currentIndex + itemsPerView);

  if (visibleItems.length < itemsPerView && currentIndex > 0) {
    visibleItems.push(...heroItems.slice(0, itemsPerView - visibleItems.length));
  }

  // Helper to extract metadata (since real data might vary)
  const getMetadata = (item: HeroItem) => {
    const episodesVal = item.episodes || item.raw?.episodes || item.raw?.attributes?.episodes;
    const chaptersVal = item.raw?.attributes?.lastChapter || 
                        item.raw?.attributes?.latestChapterNumber || 
                        item.raw?.attributes?.calculatedTotalChapters;

    const chapters = item.type === 'anime' 
      ? `episodios ${episodesVal || '?'}`
      : `capítulos ${chaptersVal || '?'}`;
    
    const genres = item.type === 'anime'
      ? (item.raw?.genres || []).slice(0, 2).reduce((acc: string, g: any) => `${acc} ${typeof g === 'string' ? g : g.name || ''}`, '').trim()
      : (item.raw?.attributes?.tags || [])
          .filter((t: any) => t.attributes?.group === 'genre')
          .slice(0, 2)
          .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es)
          .join(' ');

    return { chapters, genres };
  };

  return (
    <div className="hero-carousel-container">

      {/* Left navigation arrow */}
      <button 
        className="carousel-nav-btn carousel-nav-prev"
        onClick={handlePrev}
        aria-label="Anterior"
      >
        <IonIcon icon={chevronBackOutline} />
      </button>

      <div className={`hero-carousel-items-wrapper ${isMobile ? 'mobile-view' : 'desktop-view'}`}>
        {visibleItems.map((item) => {
          const { chapters, genres } = getMetadata(item);
          return (
            <div 
              key={item.id}
              className="hero-carousel-item animate-fade-in"
              onClick={() => onItemClick(item)}
              role="link"

              tabIndex={0}
            >
              <div 
                className="hero-carousel-bg" 
                style={{ backgroundImage: `url(${item.image})` }}
              />
              
              <div className="hero-carousel-overlay" />

              <div className="hero-carousel-content">
                <div className="hero-trending-label">TRENDING</div>
                
                <h2 className="hero-carousel-title">{item.title || item.name}</h2>

                <div className="hero-carousel-desc">
                  <p>{item.description}</p>
                </div>

                <div className="hero-meta-info">
                  <span className="meta-chapters">{chapters}</span>
                  <span className="meta-genres">{genres}</span>
                </div>

                <button 
                  className="hero-carousel-button-tmo"
                  onClick={(e) => { e.stopPropagation(); onItemClick(item); }}
                >
                  <IonIcon icon={item.type === 'anime' ? playOutline : bookOutline} />
                  <span>LEER AHORA</span>
                </button>
              </div>

              <div className="hero-carousel-poster-v3">
                <img src={item.image} alt={item.title} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows (placed outside items wrapper but inside container) */}
      <button 
        className="carousel-nav-btn carousel-nav-prev"
        onClick={handlePrev}
      >
        <IonIcon icon={chevronBackOutline} />
      </button>

      <button 
        className="carousel-nav-btn carousel-nav-next"
        onClick={handleNext}
      >
        <IonIcon icon={chevronForwardOutline} />
      </button>
    </div>
  );
};

export default HeroGrid;
