/**
 * AdaptationTimeline Component - Integración en MangaDetailsPage
 * Muestra sincronización manga-anime
 */

import React from 'react';
import { 
  IonCard, 
  IonCardContent, 
  IonText, 
  IonBadge,
  IonIcon,
  IonButton
} from '@ionic/react';
import { playCircleOutline, warningOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { useAdaptationTimeline } from '../../../hooks/useAdaptationTimeline';
import './adaptation-timeline.css';

interface AdaptationTimelineWidgetProps {
  mangaId: string;
}

export const AdaptationTimelineWidget: React.FC<AdaptationTimelineWidgetProps> = ({ mangaId }) => {
  const { 
    sync, 
    progress, 
    comparisonStatus, 
    updateChapter,
    adaptationProgress,
    isAdapted,
    animeStatus
  } = useAdaptationTimeline(mangaId);

  if (!isAdapted) {
    return null;
  }

  return (
    <IonCard className="adaptation-card">
      <IonCardContent>
        <div className="adaptation-header">
          <h3>
            <IonIcon icon={playCircleOutline} /> {sync?.animeTitle}
          </h3>
          <IonBadge color={animeStatus === 'completed' ? 'success' : 'warning'}>
            {animeStatus?.toUpperCase()}
          </IonBadge>
        </div>

        {/* Barra de progreso */}
        <div className="progress-section">
          <div className="progress-label">
            <span>Adaptación</span>
            <strong>{adaptationProgress}%</strong>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${adaptationProgress}%` }}
            />
          </div>
        </div>

        {/* Estado de sincronización */}
        {comparisonStatus && (
          <div className={`sync-status ${comparisonStatus.status}`}>
            <div className="status-icon">
              {comparisonStatus.status === 'manga_ahead' && (
                <IonIcon icon={warningOutline} className="warning" />
              )}
              {comparisonStatus.status === 'anime_ahead' && (
                <IonIcon icon={checkmarkCircleOutline} className="success" />
              )}
              {comparisonStatus.status === 'in_sync' && (
                <IonIcon icon={checkmarkCircleOutline} className="success" />
              )}
            </div>
            <div className="status-text">
              <p className="message">{comparisonStatus.message}</p>
              <p className="advice">{comparisonStatus.actionableAdvice}</p>
            </div>
          </div>
        )}

        {/* Info actual del usuario */}
        {progress && (
          <div className="user-progress">
            <div className="progress-item">
              <span className="label">Tu posición:</span>
              <strong className="value">Capítulo {progress.currentChapter}</strong>
            </div>
            {progress.animeEpisodeEquivalent && (
              <div className="progress-item">
                <span className="label">Equivale a:</span>
                <strong className="value">Episodio {progress.animeEpisodeEquivalent}</strong>
              </div>
            )}
          </div>
        )}

        {/* Primeros episodios */}
        {sync?.mappings && (
          <div className="mappings-preview">
            <h4>Primeros episodios</h4>
            <div className="episodes-mini">
              {sync.mappings.slice(0, 3).map((mapping, idx) => (
                <div key={idx} className="episode-mini">
                  <span className="chapters">
                    Cap. {mapping.mangaChapterStart}
                    {mapping.mangaChapterStart !== mapping.mangaChapterEnd && 
                      `-${mapping.mangaChapterEnd}`}
                  </span>
                  <span className="arrow">→</span>
                  <span className="episode">Ep. {mapping.animeEpisode}</span>
                  {mapping.filler && <span className="filler">RELLENO</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </IonCardContent>
    </IonCard>
  );
};

export default AdaptationTimelineWidget;
