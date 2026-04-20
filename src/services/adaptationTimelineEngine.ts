/**
 * Adaptation Timeline Engine - Sync manga chapters with anime episodes
 * Helps readers understand which chapters correspond to which anime episodes
 */

export interface AdaptationMapping {
  mangaChapterStart: string;
  mangaChapterEnd: string;
  animeEpisode: number;
  animeTitle: string;
  animeLink?: string;
  adaptationQuality: 'poor' | 'fair' | 'good' | 'excellent';
  notes: string;
  filler: boolean;
  skippedChapters: string[];
  changedScenes: boolean;
  communityRating: number; // 1-5
}

export interface MangaAnimeSync {
  mangaId: string;
  mangaTitle: string;
  animeId?: string;
  animeTitle: string;
  animeStatus: 'not_started' | 'airing' | 'completed';
  totalAnimeEpisodes: number;
  totalMangaChapters: number;
  adaptationProgress: number; // percentage
  mappings: AdaptationMapping[];
  lastUpdated: number;
  source: string; // 'manual' | 'api' | 'community'
}

export interface ReadingProgress {
  mangaId: string;
  currentChapter: string;
  currentPage?: number;
  animeEpisodeEquivalent?: number;
  recommendedAnimeEpisode?: number;
  isAheadOfAnime: boolean;
  chaptersBehindAnime?: number;
  chaptersAheadOfAnime?: number;
}

class AdaptationTimelineEngine {
  private readonly STORAGE_KEY = 'mangaApp_adaptationTimeline';
  private readonly PROGRESS_KEY = 'mangaApp_readingProgress';
  private adaptationDatabase: Map<string, MangaAnimeSync> = new Map();
  private readingProgress: Map<string, ReadingProgress> = new Map();

  constructor() {
    this.loadDatabase();
    this.loadProgress();
  }

  /**
   * Load adaptation timeline database
   */
  private loadDatabase(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([id, mapping]: [string, any]) => {
          this.adaptationDatabase.set(id, mapping);
        });
      }
    } catch (err) {
      console.error('[AdaptationTimeline] Failed to load database:', err);
    }
  }

  /**
   * Load user's reading progress
   */
  private loadProgress(): void {
    try {
      const stored = localStorage.getItem(this.PROGRESS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([id, progress]: [string, any]) => {
          this.readingProgress.set(id, progress);
        });
      }
    } catch (err) {
      console.error('[AdaptationTimeline] Failed to load progress:', err);
    }
  }

  /**
   * Get adaptation mapping for a manga
   */
  getAdaptationMapping(mangaId: string): MangaAnimeSync | null {
    return this.adaptationDatabase.get(mangaId) || null;
  }

  /**
   * Add adaptation mapping
   */
  addAdaptationMapping(mapping: MangaAnimeSync): void {
    this.adaptationDatabase.set(mapping.mangaId, mapping);
    this.saveDatabase();
    console.log(`[AdaptationTimeline] Added mapping for ${mapping.mangaTitle}`);
  }

  /**
   * Find anime episode equivalent for a chapter
   */
  findAnimeEpisode(mangaId: string, chapterNumber: string): number | null {
    const sync = this.adaptationDatabase.get(mangaId);
    if (!sync) return null;

    // Parse chapter number
    const chapterNum = parseFloat(chapterNumber);
    
    for (const mapping of sync.mappings) {
      const startChap = parseFloat(mapping.mangaChapterStart);
      const endChap = parseFloat(mapping.mangaChapterEnd);

      if (chapterNum >= startChap && chapterNum <= endChap) {
        return mapping.animeEpisode;
      }
    }

    return null;
  }

  /**
   * Find manga chapter equivalent for an anime episode
   */
  findMangaChapter(mangaId: string, episodeNumber: number): { start: string; end: string } | null {
    const sync = this.adaptationDatabase.get(mangaId);
    if (!sync) return null;

    const mapping = sync.mappings.find(m => m.animeEpisode === episodeNumber);
    
    if (mapping) {
      return {
        start: mapping.mangaChapterStart,
        end: mapping.mangaChapterEnd
      };
    }

    return null;
  }

  /**
   * Update reading progress and calculate anime equivalence
   */
  updateReadingProgress(mangaId: string, chapterNumber: string, pageNumber?: number): ReadingProgress {
    const sync = this.adaptationDatabase.get(mangaId);
    
    const animeEpisode = this.findAnimeEpisode(mangaId, chapterNumber);
    
    let isAheadOfAnime = false;
    let chaptersBehindAnime = 0;
    let chaptersAheadOfAnime = 0;

    if (sync) {
      const totalChapters = sync.totalMangaChapters;
      const totalEpisodes = sync.totalAnimeEpisodes;
      const currentChapterNum = parseFloat(chapterNumber);

      // Calculate position
      const mangaProgress = (currentChapterNum / totalChapters) * 100;
      const animeProgress = (animeEpisode ? (animeEpisode / totalEpisodes) * 100 : 0);

      if (mangaProgress > animeProgress) {
        isAheadOfAnime = true;
        // Estimate chapters ahead
        chaptersAheadOfAnime = Math.round((mangaProgress - animeProgress) / 100 * totalChapters);
      } else {
        chaptersBehindAnime = Math.round((animeProgress - mangaProgress) / 100 * totalChapters);
      }
    }

    const progress: ReadingProgress = {
      mangaId,
      currentChapter: chapterNumber,
      currentPage: pageNumber,
      animeEpisodeEquivalent: animeEpisode || undefined,
      isAheadOfAnime,
      chaptersBehindAnime: chaptersBehindAnime || undefined,
      chaptersAheadOfAnime: chaptersAheadOfAnime || undefined
    };

    this.readingProgress.set(mangaId, progress);
    this.saveProgress();

    return progress;
  }

  /**
   * Get reading progress for a manga
   */
  getReadingProgress(mangaId: string): ReadingProgress | null {
    return this.readingProgress.get(mangaId) || null;
  }

  /**
   * Get comparison: where you are in manga vs anime
   */
  getComparisonStatus(mangaId: string): {
    status: 'manga_ahead' | 'anime_ahead' | 'in_sync' | 'unknown';
    message: string;
    actionableAdvice: string;
  } {
    const progress = this.readingProgress.get(mangaId);
    const sync = this.adaptationDatabase.get(mangaId);

    if (!progress || !sync) {
      return {
        status: 'unknown',
        message: 'No adaptation data available',
        actionableAdvice: 'Add this series to track manga-anime progress'
      };
    }

    if (progress.isAheadOfAnime) {
      const chaptersAhead = progress.chaptersAheadOfAnime || 0;
      return {
        status: 'manga_ahead',
        message: `¡Vas ${chaptersAhead} capítulos adelante del anime!`,
        actionableAdvice: chaptersAhead > 10
          ? '⚠️ Si no quieres spoilers del anime, detente aquí'
          : '✅ Estás en la zona segura para ver el anime sin spoilers'
      };
    } else if (progress.chaptersBehindAnime && progress.chaptersBehindAnime > 0) {
      return {
        status: 'anime_ahead',
        message: `El anime te lleva ${progress.chaptersBehindAnime} capítulos`,
        actionableAdvice: 'Continúa leyendo para ponerte al día con el anime'
      };
    }

    return {
      status: 'in_sync',
      message: 'Estás sincronizado con el anime',
      actionableAdvice: 'Puedes disfrutar del anime sin preocupaciones de spoilers'
    };
  }

  /**
   * Get recommendations based on watching anime
   */
  getChaptersToReadAfterAnimeEpisode(mangaId: string, animeEpisode: number): { start: string; end: string } | null {
    const chapters = this.findMangaChapter(mangaId, animeEpisode);
    
    if (!chapters) {
      // Estimate if exact mapping not found
      const sync = this.adaptationDatabase.get(mangaId);
      if (sync) {
        const avgChaptersPerEpisode = sync.totalMangaChapters / sync.totalAnimeEpisodes;
        const estimatedChapter = Math.round(animeEpisode * avgChaptersPerEpisode);
        return {
          start: estimatedChapter.toString(),
          end: (estimatedChapter + 1).toString()
        };
      }
    }

    return chapters;
  }

  /**
   * Search for adaptation timeline by title
   */
  searchAdaptations(query: string): MangaAnimeSync[] {
    const results = Array.from(this.adaptationDatabase.values())
      .filter(sync => 
        sync.mangaTitle.toLowerCase().includes(query.toLowerCase()) ||
        sync.animeTitle.toLowerCase().includes(query.toLowerCase())
      );

    return results.sort((a, b) => {
      // Sort by completion percentage
      return b.adaptationProgress - a.adaptationProgress;
    });
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSeriesTracked: number;
    averageAdaptationQuality: number;
    mostCompleteMappings: MangaAnimeSync[];
    upcomingAdaptations: MangaAnimeSync[];
  } {
    const series = Array.from(this.adaptationDatabase.values());

    // Calculate average quality
    const allMappings = series.flatMap(s => s.mappings);
    const qualityMap = { poor: 1, fair: 2, good: 3, excellent: 5 };
    const averageQuality = allMappings.length > 0
      ? allMappings.reduce((sum, m) => sum + (qualityMap[m.adaptationQuality] || 0), 0) / allMappings.length
      : 0;

    // Get most complete
    const mostComplete = series
      .sort((a, b) => b.adaptationProgress - a.adaptationProgress)
      .slice(0, 5);

    // Get upcoming (not started or airing)
    const upcoming = series
      .filter(s => s.animeStatus === 'not_started' || s.animeStatus === 'airing')
      .slice(0, 5);

    return {
      totalSeriesTracked: series.length,
      averageAdaptationQuality: Math.round(averageQuality * 10) / 10,
      mostCompleteMappings: mostComplete,
      upcomingAdaptations: upcoming
    };
  }

  /**
   * Save database
   */
  private saveDatabase(): void {
    try {
      const data = Object.fromEntries(this.adaptationDatabase);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[AdaptationTimeline] Failed to save database:', err);
    }
  }

  /**
   * Save progress
   */
  private saveProgress(): void {
    try {
      const data = Object.fromEntries(this.readingProgress);
      localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[AdaptationTimeline] Failed to save progress:', err);
    }
  }

  /**
   * Export timeline data
   */
  exportTimelines(): string {
    return JSON.stringify({
      adaptations: Array.from(this.adaptationDatabase.values()),
      progress: Array.from(this.readingProgress.values()),
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.adaptationDatabase.clear();
    this.readingProgress.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.PROGRESS_KEY);
    console.log('[AdaptationTimeline] All data cleared');
  }
}

// Singleton instance
let instance: AdaptationTimelineEngine | null = null;

export function getAdaptationTimelineEngine(): AdaptationTimelineEngine {
  if (!instance) {
    instance = new AdaptationTimelineEngine();
  }
  return instance;
}

export default AdaptationTimelineEngine;
