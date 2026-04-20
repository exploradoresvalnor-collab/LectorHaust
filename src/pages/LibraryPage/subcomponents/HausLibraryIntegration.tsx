/**
 * LibraryPageHausIntegration
 * Integra "Continuar leyendo" y estadísticas en LibraryPage
 */

import React, { useEffect, useState } from 'react';
import { IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { 
  bookmarkOutline, 
  statsChartOutline, 
  flameOutline, 
  trendingUpOutline, 
  stopwatchOutline,
  arrowForwardOutline 
} from 'ionicons/icons';
import { useReadingTracker } from '../../../hooks/useHausIntelligence';
import SmartImage from '../../../components/SmartImage';
import './styles-library-haus.css';

/**
 * Card para "Continuar leyendo"
 */
export const ContinueReadingCard: React.FC<{
  onItemClick: (item: any) => void;
  limit?: number;
}> = ({ onItemClick, limit = 8 }) => {
  const tracker = useReadingTracker();
  const { continueReading } = tracker;

  if (continueReading.length === 0) {
    return (
      <div className="continue-reading-empty">
        <IonIcon icon={bookmarkOutline} className="continue-reading-empty-icon" />
        <p>Aún no hay mangas en progreso</p>
        <small>Comienza a leer para ver tu progreso aquí</small>
      </div>
    );
  }

  return (
    <div className="continue-reading-section">
      <div className="continue-reading-header">
        <h2 className="continue-reading-title">
          <IonIcon icon={bookmarkOutline} />
          Continuar Leyendo
        </h2>
      </div>

      <div className="continue-reading-grid">
        {continueReading.slice(0, limit).map((item: any) => (
          <div
            key={item.chapterId}
            className="continue-reading-card"
            onClick={() => onItemClick(item)}
            role="button"
            tabIndex={0}
          >
            <div className="continue-card-progress">
              <div className="continue-progress-bar">
                <div
                  className="continue-progress-fill"
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
              <span className="continue-progress-text">
                {item.progressPercent}%
              </span>
            </div>

            <div className="continue-card-content">
              <h3 className="continue-manga-title" title={item.mangaTitle}>
                {item.mangaTitle.length > 30
                  ? `${item.mangaTitle.substring(0, 27)}...`
                  : item.mangaTitle}
              </h3>

              <p className="continue-chapter-info">
                Cap. {item.chapterNumber}
                <span className="continue-page-info">
                  Pág. {item.pageNumber}/{item.totalPages}
                </span>
              </p>

              <small className="continue-last-read">
                {getRelativeTime(item.lastReadAt)}
              </small>
            </div>

            <IonIcon icon={arrowForwardOutline} className="continue-arrow-icon" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Card de estadísticas de lectura
 */
export const ReadingStatsCard: React.FC = () => {
  const tracker = useReadingTracker();
  const { stats } = tracker;

  if (!stats) {
    return null;
  }

  return (
    <IonCard className="reading-stats-card">
      <IonCardHeader>
        <IonCardTitle className="stats-card-title">
          <IonIcon icon={statsChartOutline} />
          Mis Estadísticas
        </IonCardTitle>
      </IonCardHeader>

      <IonCardContent className="stats-card-content">
        <div className="stats-grid">
          {/* Total Chapters */}
          <div className="stat-item">
            <div className="stat-icon-wrapper blue">
              <IonIcon icon={bookmarkOutline} className="stat-icon" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.totalChaptersRead}</span>
              <span className="stat-label">Capítulos</span>
            </div>
          </div>

          {/* Reading Time */}
          <div className="stat-item">
            <div className="stat-icon-wrapper purple">
              <IonIcon icon={stopwatchOutline} className="stat-icon" />
            </div>
            <div className="stat-info">
              <span className="stat-value">
                {Math.round(stats.totalTimeSpentMinutes / 60)}h
              </span>
              <span className="stat-label">Tiempo</span>
            </div>
          </div>

          {/* Reading Streak */}
          <div className="stat-item">
            <div className="stat-icon-wrapper orange">
              <IonIcon icon={flameOutline} className="stat-icon" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.readingStreak}</span>
              <span className="stat-label">Racha días</span>
            </div>
          </div>

          {/* Sessions This Week */}
          <div className="stat-item">
            <div className="stat-icon-wrapper green">
              <IonIcon icon={trendingUpOutline} className="stat-icon" />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.sessionsThisWeek}</span>
              <span className="stat-label">Esta semana</span>
            </div>
          </div>
        </div>

        {/* Achievement Badge */}
        {stats.isReadingToday && (
          <div className="reading-achievement">
            <span className="achievement-icon">🔥</span>
            <span className="achievement-text">¡Leíste hoy! Mantén tu racha</span>
          </div>
        )}

        {/* Average Time */}
        <div className="reading-avg-info">
          <small>
            Promedio de <strong>{stats.averageTimePerChapter} min</strong> por capítulo
          </small>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

/**
 * Componente de racha con animación
 */
export const ReadingStreakBanner: React.FC = () => {
  const tracker = useReadingTracker();
  const { stats } = tracker;

  if (!stats || stats.readingStreak === 0) {
    return null;
  }

  const isActive = stats.isReadingToday;

  return (
    <div className={`reading-streak-banner ${isActive ? 'active' : 'warning'}`}>
      <div className="streak-icon-wrapper">
        <span className="streak-icon">🔥</span>
        <span className="streak-count">{stats.readingStreak}</span>
      </div>

      <div className="streak-content">
        <p className="streak-title">Racha de Lectura</p>
        <p className="streak-subtitle">
          {isActive
            ? '✅ Ya leíste hoy'
            : '⚠️ Lee hoy para mantener tu racha'}
        </p>
      </div>

      {isActive && <div className="streak-checkmark">✓</div>}
    </div>
  );
};

/**
 * Fila compacta de "Continuar"
 */
export const CompactContinueReading: React.FC<{
  onItemClick: (item: any) => void;
  limit?: number;
}> = ({ onItemClick, limit = 3 }) => {
  const tracker = useReadingTracker();
  const { continueReading } = tracker;

  if (continueReading.length === 0) {
    return null;
  }

  return (
    <div className="compact-continue-section">
      <h3 className="compact-continue-title">Continuar Leyendo</h3>
      <div className="compact-continue-list">
        {continueReading.slice(0, limit).map((item: any) => (
          <button
            key={item.chapterId}
            className="compact-continue-item"
            onClick={() => onItemClick(item)}
          >
            <span className="compact-title">
              {item.mangaTitle.substring(0, 20)}
            </span>
            <span className="compact-progress">{item.progressPercent}%</span>
          </button>
        ))}
      </div>
    </div>
  );
};

function getRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Nunca';

  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Justo ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;

  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Wrapper principal que integra todos los componentes
 */
export const HausLibraryIntegration: React.FC<{ onMangaClick: (mangaId: string) => void }> = ({ onMangaClick }) => {
  return (
    <div className="haus-library-integration">
      <ReadingStreakBanner />
      <ContinueReadingCard onItemClick={(item) => onMangaClick(item.mangaId || item.id)} />
      <ReadingStatsCard />
    </div>
  );
};

export default ContinueReadingCard;
