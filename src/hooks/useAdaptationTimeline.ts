/**
 * useAdaptationTimeline - React hook for manga-anime synchronization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAdaptationTimelineEngine, MangaAnimeSync, ReadingProgress } from '../services/adaptationTimelineEngine';

export function useAdaptationTimeline(mangaId?: string) {
  const [sync, setSync] = useState<MangaAnimeSync | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [comparisonStatus, setComparisonStatus] = useState<{
    status: 'manga_ahead' | 'anime_ahead' | 'in_sync' | 'unknown';
    message: string;
    actionableAdvice: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const engine = useMemo(() => getAdaptationTimelineEngine(), []);

  /**
   * Load adaptation data for a manga
   */
  const loadAdaptation = useCallback((id: string) => {
    setLoading(true);
    
    const adaptationSync = engine.getAdaptationMapping(id);
    const readingProgress = engine.getReadingProgress(id);
    const comparison = engine.getComparisonStatus(id);

    setSync(adaptationSync);
    setProgress(readingProgress);
    setComparisonStatus(comparison);
    
    setLoading(false);
  }, [engine]);

  /**
   * Update reading chapter and recalculate
   */
  const updateChapter = useCallback((chapter: string, page?: number) => {
    if (!mangaId) return;

    const newProgress = engine.updateReadingProgress(mangaId, chapter, page);
    const comparison = engine.getComparisonStatus(mangaId);

    setProgress(newProgress);
    setComparisonStatus(comparison);
  }, [mangaId, engine]);

  /**
   * Find anime episode for current chapter
   */
  const getAnimeEpisodeForChapter = useCallback((chapter: string): number | null => {
    if (!mangaId) return null;
    return engine.findAnimeEpisode(mangaId, chapter);
  }, [mangaId, engine]);

  /**
   * Find manga chapters for an anime episode
   */
  const getMangaChaptersForEpisode = useCallback((episode: number) => {
    if (!mangaId) return null;
    return engine.findMangaChapter(mangaId, episode);
  }, [mangaId, engine]);

  /**
   * Get spoiler warning
   */
  const getSpoilerWarning = useCallback((chapter: string): string | null => {
    if (!sync) return null;

    const chapterNum = parseFloat(chapter);
    const totalChapters = sync.totalMangaChapters;
    const totalEpisodes = sync.totalAnimeEpisodes;

    // Find how many episodes this chapter covers
    let episodeEquivalent = 0;
    for (const mapping of sync.mappings) {
      const startChap = parseFloat(mapping.mangaChapterStart);
      const endChap = parseFloat(mapping.mangaChapterEnd);

      if (chapterNum >= startChap && chapterNum <= endChap) {
        episodeEquivalent = mapping.animeEpisode;
        break;
      }
    }

    if (episodeEquivalent === 0) {
      return null;
    }

    const avgChaptersPerEpisode = totalChapters / totalEpisodes;
    const chaptersAhead = chapterNum - (episodeEquivalent * avgChaptersPerEpisode);

    if (chaptersAhead > 5) {
      return `⚠️ Spoiler: Esto es ${Math.round(chaptersAhead)} capítulos más adelante del anime`;
    }

    return null;
  }, [sync]);

  /**
   * Load on mount if mangaId provided
   */
  useEffect(() => {
    if (mangaId) {
      loadAdaptation(mangaId);
    }
  }, [mangaId, loadAdaptation]);

  return {
    // State
    sync,
    progress,
    comparisonStatus,
    loading,

    // Actions
    loadAdaptation,
    updateChapter,
    getAnimeEpisodeForChapter,
    getMangaChaptersForEpisode,
    getSpoilerWarning,

    // Queries
    isAdapted: sync !== null,
    animeStatus: sync?.animeStatus || null,
    adaptationProgress: sync?.adaptationProgress || 0
  };
}
