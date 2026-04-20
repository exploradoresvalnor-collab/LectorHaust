/**
 * HomePageHausIntegration
 * Integra recomendaciones personalizadas en la home
 * 
 * Nota: Este es un addon para HomePage, remplaza el hook en useHomeData
 */

import React, { useEffect, useState } from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonButton } from '@ionic/react';
import { sparklesOutline, arrowForwardOutline, chevronUpOutline, chevronDownOutline } from 'ionicons/icons';
import { usePersonalizedRecommendations } from '../../../hooks/useHausIntelligence';
import { mangaProvider } from '../../../services/mangaProvider';
import SmartImage from '../../../components/SmartImage';
import HausSkeleton from '../../../components/HausSkeleton';
import './styles-haus.css';

export interface RecommendationGridProps {
  allManga: any[];
  onMangaClick: (manga: any) => void;
  limit?: number;
  mood?: any;
}

/**
 * Componente para mostrar recomendaciones personalizadas
 */
export const RecommendationGrid: React.FC<RecommendationGridProps> = ({
  allManga,
  onMangaClick,
  limit = 8,
  mood = null
}) => {
  const { recommendations, loading } = usePersonalizedRecommendations(allManga, limit, mood);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="haus-recommendations-skeleton">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="haus-rec-item-skeleton">
            <HausSkeleton type="card" />
          </div>
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className={`haus-recommendations-section ${isCollapsed ? 'collapsed' : ''}`}>
      <div 
        className="haus-rec-header" 
        onClick={() => setIsCollapsed(!isCollapsed)} 
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2 className="haus-rec-title">
            <IonIcon icon={sparklesOutline} className="haus-rec-icon" />
            Recomendado para Ti
          </h2>
          <IonIcon 
            icon={isCollapsed ? chevronDownOutline : chevronUpOutline} 
            style={{ color: '#999', fontSize: '24px' }} 
          />
        </div>
        {!isCollapsed && <span className="haus-rec-subtitle">Basado en tus preferencias</span>}
      </div>

      {!isCollapsed && (
        <div className="haus-recommendations-grid">
          {recommendations.map((manga: any) => {
          const title = mangaProvider.getLocalizedTitle(manga);
          const cover = mangaProvider.getCoverUrl(manga, '256');

          return (
            <div
              key={manga.id}
              className="haus-rec-card"
              onClick={() => onMangaClick(manga)}
              role="button"
              tabIndex={0}
            >
              {/* Cover */}
              <div className="haus-rec-cover-wrapper">
                <SmartImage
                  src={cover}
                  alt={title}
                  className="haus-rec-cover"
                  wrapperClassName="haus-rec-cover-img"
                  width={150}
                  height={225}
                  loading="lazy"
                />

                {/* Score Badge */}
                <div className="haus-rec-score-badge">
                  <span className="haus-rec-score-value">
                    {Math.round(manga._recommendationScore || 0)}%
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="haus-rec-info">
                <h3 className="haus-rec-manga-title" title={title}>
                  {title.length > 25 ? `${title.substring(0, 22)}...` : title}
                </h3>

                {/* Reason */}
                {manga._recommendationReason && manga._recommendationReason.length > 0 && (
                  <p className="haus-rec-reason">
                    💡 {manga._recommendationReason[0]}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="haus-rec-progress-bar">
                  <div
                    className="haus-rec-progress-fill"
                    style={{
                      width: `${Math.min(manga._recommendationScore || 0, 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};

/**
 * Mini card para mostrar en sidebar o strip
 */
export const RecommendationMiniCard: React.FC<{
  manga: any;
  onClick: (manga: any) => void;
}> = ({ manga, onClick }) => {
  const title = mangaProvider.getLocalizedTitle(manga);
  const cover = mangaProvider.getCoverUrl(manga, '256');

  return (
    <div className="haus-rec-mini-card" onClick={() => onClick(manga)}>
      <SmartImage
        src={cover}
        alt={title}
        className="haus-rec-mini-cover"
        wrapperClassName="haus-rec-mini-cover-wrapper"
        width={80}
        height={120}
      />
      <div className="haus-rec-mini-badge">
        <IonIcon icon={sparklesOutline} />
      </div>
    </div>
  );
};

/**
 * Componente compacto para listado vertical
 */
export const RecommendationVerticalList: React.FC<{
  allManga: any[];
  onMangaClick: (manga: any) => void;
  limit?: number;
}> = ({ allManga, onMangaClick, limit = 5 }) => {
  const { recommendations, loading } = usePersonalizedRecommendations(allManga, limit);

  return (
    <IonCard className="haus-recommendations-card">
      <IonCardHeader>
        <IonCardTitle className="haus-card-title-vert">
          <IonIcon icon={sparklesOutline} />
          Para Ti
        </IonCardTitle>
      </IonCardHeader>

      <IonCardContent>
        {loading ? (
          <div className="haus-vert-list-skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ marginBottom: '12px' }}>
                <HausSkeleton type="list-item" />
              </div>
            ))}
          </div>
        ) : (
          <div className="haus-vert-list">
            {recommendations.map((manga: any, idx: number) => (
              <div
                key={manga.id}
                className="haus-vert-list-item"
                onClick={() => onMangaClick(manga)}
                role="button"
                tabIndex={0}
              >
                <span className="haus-vert-rank">#{idx + 1}</span>
                <div className="haus-vert-content">
                  <p className="haus-vert-title">
                    {mangaProvider.getLocalizedTitle(manga).substring(0, 30)}
                  </p>
                  {manga._recommendationReason && manga._recommendationReason.length > 0 && (
                    <small className="haus-vert-reason">
                      {manga._recommendationReason[0]}
                    </small>
                  )}
                </div>
                <IonIcon icon={arrowForwardOutline} className="haus-vert-arrow" />
              </div>
            ))}
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default RecommendationGrid;
