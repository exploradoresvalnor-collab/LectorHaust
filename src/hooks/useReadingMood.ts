/**
 * READING MOOD HOOK
 * 
 * Integrates mood detection into React components
 * Tracks reading speed, calculates metrics, detects mood in real-time
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getMoodDetectorEngine, ReadingMoodProfile, MoodMetrics } from '../services/moodDetectorEngine';
import { getReadingTracker } from '../services/readingTracker';
import { useLibraryStore } from '../store/useLibraryStore';

export interface ReadingSessionMetrics {
  currentMood: ReadingMoodProfile | null;
  moodTrends: any;
  metrics: MoodMetrics | null;
  readingSpeed: number; // pages per minute
  sessionStart: number;
  isLoading: boolean;
}

export function useReadingMood() {
  const [mood, setMood] = useState<ReadingMoodProfile | null>(null);
  const [metrics, setMetrics] = useState<MoodMetrics | null>(null);
  const [moodTrends, setMoodTrends] = useState<any>(null);
  const [readingSpeed, setReadingSpeed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const scrollStartPage = useRef(0);
  const scrollStartTime = useRef(0);
  const sessionStartTime = useRef(Date.now());
  const pageTimestamps = useRef<number[]>([]);
  const pagesViewed = useRef<number[]>([]);

  const tracker = getReadingTracker();
  const moodEngine = getMoodDetectorEngine();
  const { history } = useLibraryStore();

  /**
   * Calculate metrics from current session
   */
  const calculateMetrics = useCallback((): MoodMetrics => {
    const now = Date.now();
    const sessionDuration = (now - sessionStartTime.current) / (1000 * 60); // minutes

    // Average seconds per page
    let avgSecondsPerPage = 20; // default
    if (pageTimestamps.current.length > 1) {
      const diffs = [];
      for (let i = 1; i < pageTimestamps.current.length; i++) {
        diffs.push((pageTimestamps.current[i] - pageTimestamps.current[i - 1]) / 1000);
      }
      avgSecondsPerPage = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    }

    // Pages per minute
    const pagesPerMinute = Math.max(0.5, pagesViewed.current.length / Math.max(1, sessionDuration));

    // Get tracker stats for last 24 hours
    const tracker = getReadingTracker();
    const stats = tracker.getStats();

    // Calculate reading pattern
    let readingPattern: 'consistent' | 'sporadic' | 'intense' | 'relaxed' = 'relaxed' as const;
    if (stats.sessionsThisWeek >= 3) readingPattern = 'consistent';
    if (stats.sessionsThisWeek === 1) readingPattern = 'sporadic';
    if (sessionDuration > 60 && pagesPerMinute > 2) readingPattern = 'intense';
    if (sessionDuration < 20 && pagesPerMinute < 1) readingPattern = 'relaxed';

    const averageSessionLength = stats.totalTimeSpentMinutes > 0 
      ? Math.ceil(stats.totalTimeSpentMinutes / stats.sessionsThisWeek)
      : sessionDuration;

    return {
      avgSecondsPerPage,
      pagesPerMinute,
      sessionsLast24h: stats.sessionsThisWeek,
      totalPagesLast24h: Math.max(1, Math.ceil(stats.totalTimeSpentMinutes / 20)), // Estimate pages
      genresVisitedLast24h: stats.favoriteGenres || [],
      favoriteGenresThisSession: [], // Would need to extract from manga
      averageSessionLength,
      lastSessionTime: stats.lastSessionDate || now,
      readingPattern,
    };
  }, []);

  /**
   * Track page changes (for scroll speed calculation)
   */
  const trackPageChange = useCallback((newPage: number) => {
    const now = Date.now();
    pageTimestamps.current.push(now);
    pagesViewed.current.push(newPage);

    // Keep only last 30 pages
    if (pageTimestamps.current.length > 30) {
      pageTimestamps.current.shift();
      pagesViewed.current.shift();
    }

    // Update metrics every 2 pages
    if (pagesViewed.current.length % 2 === 0) {
      const currentMetrics = calculateMetrics();
      setMetrics(currentMetrics);

      // Recalculate mood
      const newMood = moodEngine.analyzeMood(currentMetrics);
      setMood(newMood);

      // Update reading speed
      if (currentMetrics.avgSecondsPerPage > 0) {
        setReadingSpeed(60 / currentMetrics.avgSecondsPerPage);
      }
    }
  }, [calculateMetrics, moodEngine]);

  /**
   * Initialize session
   */
  useEffect(() => {
    setIsLoading(true);
    sessionStartTime.current = Date.now();
    pageTimestamps.current = [Date.now()];
    pagesViewed.current = [0];

    const initialMetrics = calculateMetrics();
    setMetrics(initialMetrics);

    const initialMood = moodEngine.analyzeMood(initialMetrics);
    setMood(initialMood);

    const trends = moodEngine.getMoodTrends();
    setMoodTrends(trends);

    setIsLoading(false);
  }, [calculateMetrics, moodEngine]);

  /**
   * Get mood-based recommendations
   */
  const getMoodBasedRecommendations = useCallback((genrePool: string[]) => {
    if (!mood || !metrics) return genrePool;

    const recommendations = [...genrePool];

    // Prioritize based on emotional needs
    if (mood.emotionalNeeds.includes('excitement')) {
      // Boost action, adventure genres
      recommendations.sort((a, b) => {
        const aScore = ['action', 'adventure', 'thriller'].includes(a) ? 1 : 0;
        const bScore = ['action', 'adventure', 'thriller'].includes(b) ? 1 : 0;
        return bScore - aScore;
      });
    }

    if (mood.emotionalNeeds.includes('comfort')) {
      // Boost slice of life, comedy, romance
      recommendations.sort((a, b) => {
        const aScore = ['slice of life', 'comedy', 'romance'].includes(a) ? 1 : 0;
        const bScore = ['slice of life', 'comedy', 'romance'].includes(b) ? 1 : 0;
        return bScore - aScore;
      });
    }

    if (mood.emotionalNeeds.includes('discovery')) {
      // Prefer genres not seen recently
      const recentGenres = metrics.genresVisitedLast24h;
      recommendations.sort((a, b) => {
        const aNewness = !recentGenres.includes(a) ? 1 : 0;
        const bNewness = !recentGenres.includes(b) ? 1 : 0;
        return bNewness - aNewness;
      });
    }

    return recommendations.slice(0, Math.max(1, Math.floor(recommendations.length / 2)));
  }, [mood, metrics]);

  return {
    // Current state
    mood,
    metrics,
    moodTrends,
    readingSpeed,
    isLoading,

    // Methods
    trackPageChange,
    getMoodBasedRecommendations,

    // Session info
    sessionDuration: (Date.now() - sessionStartTime.current) / (1000 * 60),
    pagesRead: pagesViewed.current.length,
  };
}
