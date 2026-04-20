/**
 * Custom React hooks for Haus Intelligence Features
 * Integrates recommendationEngine, readingTracker, and semanticSearch
 */

import { useState, useEffect, useCallback } from 'react';
import { getRecommendationEngine } from '../services/recommendationEngine';
import { getReadingTracker } from '../services/readingTracker';
import { getSemanticSearch } from '../services/semanticSearch';

/**
 * usePersonalizedRecommendations - Get AI-powered manga recommendations
 * @param mangaList - Array of all available manga
 * @param limit - Number of recommendations to return
 * @param mood - Optional reading mood profile for mood-based recommendations
 */
export function usePersonalizedRecommendations(mangaList: any[] = [], limit = 12, mood: any = null) {
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!mangaList || mangaList.length === 0) return;

        setLoading(true);
        const engine = getRecommendationEngine();

        setTimeout(() => {
            // Use mood-based recommendations if mood is available
            const recommendationPromise = mood && mood.emotionalNeeds
                ? engine.getMoodBasedRecommendations(mood, mangaList, limit)
                : engine.getRecommendations(mangaList, limit);

            recommendationPromise
                .then(scored => {
                    // Map back to full manga objects
                    const recommended = scored.map(s => {
                        const manga = mangaList.find(m => m.id === s.mangaId);
                        return {
                            ...manga,
                            _recommendationScore: s.score,
                            _recommendationReason: s.reason
                        };
                    });
                    setRecommendations(recommended);
                })
                .finally(() => setLoading(false));
        }, 0);
    }, [mangaList, limit, mood]);

    return { recommendations, loading };
}

/**
 * useReadingTracker - Manage reading sessions and get progress
 */
export function useReadingTracker() {
    const [continueReading, setContinueReading] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);

    const tracker = getReadingTracker();

    const startReading = useCallback((mangaId: string, mangaTitle: string, chapterId: string, chapterNumber: string, totalPages?: number) => {
        tracker.startReading(mangaId, mangaTitle, chapterId, chapterNumber, totalPages);
    }, [tracker]);

    const updateProgress = useCallback((chapterId: string, pageNumber: number, totalPages?: number) => {
        tracker.updateProgress(chapterId, pageNumber, totalPages);
        // Update UI
        const items = tracker.getContinueReading(5);
        setContinueReading(items);
    }, [tracker]);

    const completeChapter = useCallback((chapterId: string) => {
        tracker.completeChapter(chapterId);
        const items = tracker.getContinueReading(5);
        setContinueReading(items);
    }, [tracker]);

    const pauseReading = useCallback((chapterId: string) => {
        tracker.pauseReading(chapterId);
    }, [tracker]);

    const getMangaProgress = useCallback((mangaId: string) => {
        return tracker.getMangaProgress(mangaId);
    }, [tracker]);

    // Load initial data
    useEffect(() => {
        setContinueReading(tracker.getContinueReading(5));
        setStats(tracker.getStats());
    }, [tracker]);

    return {
        continueReading,
        stats,
        startReading,
        updateProgress,
        completeChapter,
        pauseReading,
        getMangaProgress,
        tracker
    };
}

/**
 * useSemanticSearch - Search manga with fuzzy matching
 * @param mangaList - Array of manga to build index from
 */
export function useSemanticSearch(mangaList: any[] = []) {
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isIndexing, setIsIndexing] = useState(false);

    const search = getSemanticSearch();

    // Build index when manga list changes
    useEffect(() => {
        if (mangaList && mangaList.length > 0) {
            setIsIndexing(true);
            // Defer to next tick to avoid blocking
            setTimeout(() => {
                search.buildIndex(mangaList);
                setIsIndexing(false);
            }, 0);
        }
    }, [mangaList, search]);

    const performSearch = useCallback((query: string, limit = 20) => {
        if (!query || query.trim().length === 0) {
            setSearchResults([]);
            return;
        }

        const results = search.search(query, limit);

        // Map results back to full manga objects
        const mapped = results.map(result => {
            const manga = mangaList.find(m => m.id === result.id);
            return {
                ...manga,
                _searchScore: result.score,
                _matchedFields: result.matchedFields
            };
        });

        setSearchResults(mapped);
    }, [search, mangaList]);

    const advancedSearch = useCallback((query: string, limit = 20) => {
        const results = search.advancedSearch(query, limit);

        const mapped = results.map(result => {
            const manga = mangaList.find(m => m.id === result.id);
            return {
                ...manga,
                _searchScore: result.score,
                _matchedFields: result.matchedFields
            };
        });

        setSearchResults(mapped);
    }, [search, mangaList]);

    const getStats = useCallback(() => {
        return search.getStats();
    }, [search]);

    return {
        searchResults,
        isIndexing,
        performSearch,
        advancedSearch,
        getStats
    };
}

/**
 * useUserRecommendations - Integrated hook combining reading tracker + recommendations
 */
export function useUserRecommendations(mangaList: any[] = []) {
    const recommendations = usePersonalizedRecommendations(mangaList, 12);
    const tracker = useReadingTracker();
    const search = useSemanticSearch(mangaList);

    return {
        ...recommendations,
        ...tracker,
        ...search
    };
}

/**
 * useReadingStats - Get advanced reading statistics
 */
export function useReadingStats() {
    const [stats, setStats] = useState<any>(null);
    const tracker = getReadingTracker();

    useEffect(() => {
        const updated = tracker.getStats();
        setStats(updated);
    }, [tracker]);

    const refresh = useCallback(() => {
        const updated = tracker.getStats();
        setStats(updated);
    }, [tracker]);

    return { stats, refresh, tracker };
}

/**
 * useLogMangaReading - Hook to log manga reading with recommendation integration
 */
export function useLogMangaReading() {
    const engine = getRecommendationEngine();
    const tracker = getReadingTracker();

    const logReading = useCallback((mangaId: string, rating: number, chaptersRead: number, tags: string[] = []) => {
        // Log to recommendation engine
        engine.logReading(mangaId, rating, chaptersRead);

        // Update genre preferences
        engine.updateGenrePreferences(mangaId, tags, rating);

        // Log to reading tracker
        // (if needed for analytics)
    }, [engine, tracker]);

    return { logReading };
}
