import React from 'react';
import { IonIcon } from '@ionic/react';
import { timeOutline, flashOutline } from 'ionicons/icons';
import { mangaProvider } from '../../../services/mangaProvider';
import SmartImage from '../../../components/SmartImage';
import './LatestUpdatesList.css';

interface LatestUpdatesListProps {
  latest: any[];
  onMangaClick: (manga: any) => void;
  lang: string;
}

const LatestUpdatesList: React.FC<LatestUpdatesListProps> = ({ latest, onMangaClick, lang }) => {
  if (!latest || latest.length === 0) {
    return (
      <div className="updates-empty animate-fade-in">
        <p>No hay novedades disponibles por ahora.</p>
      </div>
    );
  }

  // Slice to avoid overwhelming the user on the home page (e.g. top 10)
  const displayItems = latest.slice(0, 10);

  return (
    <div className="updates-list-container">
      {displayItems.map((manga: any) => {
        const title = mangaProvider.getLocalizedTitle(manga);
        
        // --- IMPROVED CHAPTER DETECTION (Fixing the "?" issue) ---
        const lastChapter = manga?.attributes?.latestChapterNumber || 
                            manga?.attributes?.lastChapter || 
                            manga?.attributes?.calculatedTotalChapters ||
                            manga?.attributes?.chapter; // Some sources use 'chapter' directly

        const readableAt = manga?.attributes?.latestChapterReadableAt || manga?.attributes?.updatedAt;
        const timeAgo = readableAt ? getTimeAgo(readableAt) : '';
        const formatLabel = (manga?.attributes?.mangaType || 'Manga').toUpperCase();
        
        const isAdult = manga?.attributes?.contentRating === 'erotica' || 
                        manga?.attributes?.contentRating === 'pornographic' ||
                        manga?.attributes?.tags?.some((t: any) => {
                          const name = t.attributes?.name?.en?.toLowerCase() || '';
                          return name === 'ecchi' || name === 'smut' || name === 'hentai';
                        });

        return (
          <button 
            key={manga.id} 
            className="update-item-card animate-fade-in"
            onClick={() => onMangaClick(manga)}
            aria-label={`Ver detalles de ${title}`}
          >
            {/* 1. LEFT: THE IMAGE (THUMBNAIL) */}
            <div className="update-thumb-wrapper">
              <SmartImage 
                src={mangaProvider.getCoverUrl(manga, '256')} 
                alt={title as string} 
                className="update-thumb-img"
              />
              {isAdult && <div className="update-adult-ribbon">18+</div>}
              
              {/* Haus v3 Source Pips */}
              {Array.isArray(manga.sources) && manga.sources.length > 0 && (
                <div className="update-source-pips">
                  {manga.sources.map((src: any) => {
                     const label = src === 'mangadex' ? 'MD' : src === 'weebcentral' ? 'WC' : src === 'mangapill' ? 'MP' : 'MW';
                     return <span key={src} className={`source-pip-mini src-${src}`}>{label}</span>;
                  })}
                </div>
              )}
            </div>

            {/* 2. CENTER: THE INFO (PRODUCT STYLE) */}
            <div className="update-main-info">
              <span className="update-format-badge">{formatLabel}</span>
              <h3 className="update-title-text">{title}</h3>
              <div className="update-lang-indicator">
                 {(() => {
                    const code = manga.attributes?.latestChapterLang || manga.attributes?.originalLanguage || 'en';
                    const flags: Record<string, string> = {
                      'es': '🇪🇸', 'es-la': '🇲🇽', 'en': '🇺🇸', 'ja': '🇯🇵', 'ko': '🇰🇷', 'zh': '🇨🇳',
                      'fr': '🇫🇷', 'pt-br': '🇧🇷', 'ru': '🇷🇺'
                    };
                    return flags[code] || '🌐';
                 })()}
                 <span className="update-time-text">
                   <IonIcon icon={timeOutline} style={{ marginRight: '4px' }} />
                   {timeAgo}
                 </span>
              </div>
            </div>

            {/* 3. RIGHT: THE VALUE (CHAPTER) */}
            <div className="update-meta-action">
              <div className="update-chapter-badge">
                <span className="chapter-prefix">Cap.</span>
                <span className="chapter-number">{lastChapter || '?' }</span>
              </div>
              <div className="update-action-icon">
                 <IonIcon icon={flashOutline} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

/** Utility: Relative time string */
function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

export default LatestUpdatesList;
