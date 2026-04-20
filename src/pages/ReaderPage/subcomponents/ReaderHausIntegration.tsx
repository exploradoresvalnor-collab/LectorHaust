/**
 * ReaderPageHausIntegration
 * Integra tracking automático de lectura en el ReaderPage
 */

import React, { useEffect, useState, useCallback } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { starOutline, starSharp, checkmarkCircleOutline, checkmarkCircleSharp } from 'ionicons/icons';
import { useReadingTracker } from '../../../hooks/useHausIntelligence';
import { useReadingMood } from '../../../hooks/useReadingMood';
import { getRecommendationEngine } from '../../../services/recommendationEngine';
import './styles-reader-haus.css';

export interface ReaderPageHausProps {
  mangaId: string;
  mangaTitle: string;
  chapterId: string;
  chapterNumber: string;
  totalPages: number;
  onPageChange?: (page: number) => void;
  onChapterComplete?: () => void;
}

/**
 * Hook para integración automática en ReaderPage
 */
export function useReaderTracking(
  mangaId: string,
  mangaTitle: string,
  chapterId: string,
  chapterNumber: string,
  totalPages: number
) {
  const tracker = useReadingTracker();
  const { trackPageChange } = useReadingMood();
  const [currentPage, setCurrentPage] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);

  // Iniciar sesión de lectura
  useEffect(() => {
    tracker.startReading(mangaId, mangaTitle, chapterId, chapterNumber, totalPages);
  }, [chapterId, mangaId, mangaTitle, chapterNumber, totalPages, tracker]);

  // Actualizar progreso
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    tracker.updateProgress(chapterId, page, totalPages);
    // Update mood based on page changes (every 2 pages)
    trackPageChange(page);

    // Detectar si completó el capítulo
    if (page >= totalPages && !isCompleted) {
      setIsCompleted(true);
      tracker.completeChapter(chapterId);
      // Mostrar prompt de rating si es el final
      if (page >= totalPages - 1) {
        setTimeout(() => setShowRatingPrompt(true), 1000);
      }
    }
  }, [chapterId, totalPages, isCompleted, tracker, trackPageChange]);

  // Pausar cuando se cierra
  useEffect(() => {
    return () => {
      if (!isCompleted) {
        tracker.pauseReading(chapterId);
      }
    };
  }, [chapterId, isCompleted, tracker]);

  return {
    currentPage,
    isCompleted,
    showRatingPrompt,
    setShowRatingPrompt,
    handlePageChange,
    tracker
  };
}

/**
 * Widget de progreso flotante
 */
export const ReadingProgressWidget: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const progressPercent = Math.round((currentPage / totalPages) * 100);

  return (
    <div className="reading-progress-widget">
      <div className="reading-progress-bar">
        <div
          className="reading-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="reading-progress-text">
        <span className="reading-page-current">{currentPage}</span>
        <span className="reading-page-sep">/</span>
        <span className="reading-page-total">{totalPages}</span>
        <span className="reading-page-percent">{progressPercent}%</span>
      </div>
    </div>
  );
};

/**
 * Prompt para calificar el manga después de terminar un capítulo
 */
export const ChapterCompletionRating: React.FC<{
  mangaTitle: string;
  onSubmit: (rating: number) => void;
  onDismiss: () => void;
}> = ({ mangaTitle, onSubmit, onDismiss }) => {
  const [rating, setRating] = useState(4);

  return (
    <div className="chapter-rating-overlay">
      <div className="chapter-rating-card">
        <div className="chapter-rating-header">
          <h3>¿Qué te pareció?</h3>
          <p className="chapter-rating-subtitle">{mangaTitle}</p>
        </div>

        <div className="chapter-rating-stars">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              className={`chapter-rating-star ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
              aria-label={`Calificar ${star} de 5 estrellas`}
            >
              <IonIcon icon={star <= rating ? starSharp : starOutline} />
            </button>
          ))}
        </div>

        <p className="chapter-rating-label">
          {rating === 1 && '😞 No me gustó'}
          {rating === 2 && '😐 Estuvo ok'}
          {rating === 3 && '😊 Me gustó'}
          {rating === 4 && '😄 Muy bueno'}
          {rating === 5 && '🤩 Increíble'}
        </p>

        <div className="chapter-rating-actions">
          <button
            className="chapter-rating-skip"
            onClick={onDismiss}
          >
            Saltar
          </button>
          <button
            className="chapter-rating-submit"
            onClick={() => {
              onSubmit(rating);
              onDismiss();
            }}
          >
            <IonIcon icon={checkmarkCircleSharp} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Botón flotante para marcar como completado
 */
export const CompleteChapterButton: React.FC<{
  isCompleted: boolean;
  onClick: () => void;
}> = ({ isCompleted, onClick }) => {
  return (
    <button
      className={`complete-chapter-btn ${isCompleted ? 'completed' : ''}`}
      onClick={onClick}
      aria-label={isCompleted ? 'Capítulo completado' : 'Marcar como completado'}
      title={isCompleted ? 'Capítulo completado ✓' : 'Marcar como completado'}
    >
      <IonIcon
        icon={isCompleted ? checkmarkCircleSharp : checkmarkCircleOutline}
      />
      {isCompleted && <span className="complete-label">Completado</span>}
    </button>
  );
};

/**
 * Card informativo sobre sesión de lectura
 */
export const ReadingSessionInfo: React.FC<{
  chapterNumber: string;
  currentPage: number;
  totalPages: number;
  timeSpentMinutes?: number;
}> = ({ chapterNumber, currentPage, totalPages, timeSpentMinutes }) => {
  return (
    <div className="reading-session-info">
      <div className="session-info-item">
        <span className="session-info-label">Capítulo</span>
        <span className="session-info-value">{chapterNumber}</span>
      </div>

      <div className="session-info-item">
        <span className="session-info-label">Progreso</span>
        <span className="session-info-value">
          {currentPage}/{totalPages}
        </span>
      </div>

      {timeSpentMinutes !== undefined && (
        <div className="session-info-item">
          <span className="session-info-label">Tiempo</span>
          <span className="session-info-value">
            {timeSpentMinutes < 1 ? '< 1 min' : `${Math.round(timeSpentMinutes)} min`}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Integración completa para ReaderPage
 * Uso: <ReaderHausIntegration {...props} />
 */
export const ReaderHausIntegration: React.FC<ReaderPageHausProps> = ({
  mangaId,
  mangaTitle,
  chapterId,
  chapterNumber,
  totalPages,
  onPageChange,
  onChapterComplete
}) => {
  const {
    currentPage,
    isCompleted,
    showRatingPrompt,
    setShowRatingPrompt,
    handlePageChange
  } = useReaderTracking(mangaId, mangaTitle, chapterId, chapterNumber, totalPages);

  const engine = getRecommendationEngine();

  const handleRatingSubmit = (rating: number) => {
    // Log the reading with rating
    engine.logReading(mangaId, rating, 1);

    // Notify parent component
    onChapterComplete?.();
  };

  // Notify parent of page changes
  useEffect(() => {
    onPageChange?.(currentPage);
  }, [currentPage, onPageChange]);

  return (
    <>
      {/* Progress Widget */}
      {totalPages > 0 && (
        <ReadingProgressWidget
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Session Info */}
      <ReadingSessionInfo
        chapterNumber={chapterNumber}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {/* Complete Button */}
      <CompleteChapterButton
        isCompleted={isCompleted}
        onClick={() => {
          if (!isCompleted) {
            handlePageChange(totalPages);
          }
        }}
      />

      {/* Rating Prompt */}
      {showRatingPrompt && (
        <ChapterCompletionRating
          mangaTitle={mangaTitle}
          onSubmit={handleRatingSubmit}
          onDismiss={() => setShowRatingPrompt(false)}
        />
      )}
    </>
  );
};

export default ReaderHausIntegration;
