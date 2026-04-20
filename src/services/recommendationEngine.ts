/**
 * Recommendation Engine v2 - ML-based personalized manga suggestions
 * Analyzes user preferences and generates smart recommendations
 */

export interface UserProfile {
    userId: string;
    readManga: Set<string>;
    favoriteGenres: Map<string, number>;
    readingHistory: ReadingEntry[];
    languagePreference: 'es' | 'en' | 'all';
    updateFrequency: 'daily' | 'weekly' | 'monthly';
    viewedRecommendations: Set<string>;
}

export interface ReadingEntry {
    mangaId: string;
    rating: number; // 1-5
    date: number;
    chaptersRead?: number;
}

export interface ScoredManga {
    mangaId: string;
    title: string;
    score: number;
    reason: string[];
}

const DEFAULT_PROFILE: UserProfile = {
    userId: 'anonymous',
    readManga: new Set(),
    favoriteGenres: new Map(),
    readingHistory: [],
    languagePreference: 'es',
    updateFrequency: 'weekly',
    viewedRecommendations: new Set()
};

class RecommendationEngine {
    private profile: UserProfile = { ...DEFAULT_PROFILE };
    private readonly STORAGE_KEY = 'mangaApp_userProfile';
    private readonly MAX_HISTORY = 100;

    constructor(userId = 'anonymous') {
        this.profile.userId = userId;
        this.loadProfile();
    }

    /**
     * Load user profile from localStorage
     */
    private loadProfile(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // Reconstruct Sets and Maps
                this.profile = {
                    ...parsed,
                    readManga: new Set(parsed.readManga || []),
                    favoriteGenres: new Map(parsed.favoriteGenres || []),
                    viewedRecommendations: new Set(parsed.viewedRecommendations || [])
                };
            }
        } catch (err) {
            console.error('[RecommendationEngine] Failed to load profile:', err);
            this.profile = { ...DEFAULT_PROFILE };
        }
    }

    /**
     * Save user profile to localStorage
     */
    private saveProfile(): void {
        try {
            const toSave = {
                ...this.profile,
                readManga: Array.from(this.profile.readManga),
                favoriteGenres: Array.from(this.profile.favoriteGenres.entries()),
                viewedRecommendations: Array.from(this.profile.viewedRecommendations)
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
        } catch (err) {
            console.error('[RecommendationEngine] Failed to save profile:', err);
        }
    }

    /**
     * Register that user read a manga
     */
    logReading(mangaId: string, rating: number = 3, chaptersRead = 0): void {
        if (rating < 1 || rating > 5) {
            console.warn('[RecommendationEngine] Invalid rating:', rating);
            return;
        }

        this.profile.readManga.add(mangaId);
        this.profile.readingHistory.unshift({
            mangaId,
            rating,
            date: Date.now(),
            chaptersRead
        });

        // Keep only last 100 entries
        if (this.profile.readingHistory.length > this.MAX_HISTORY) {
            this.profile.readingHistory.pop();
        }

        this.saveProfile();
        console.log(`[RecommendationEngine] Logged: ${mangaId} (rating: ${rating})`);
    }

    /**
     * Update favorite genres based on manga tags
     */
    updateGenrePreferences(mangaId: string, tags: string[], rating: number): void {
        if (rating < 1 || rating > 5) return;

        const weight = rating === 5 ? 10 : (rating === 4 ? 5 : (rating === 1 ? -3 : 1));

        tags.forEach(tag => {
            const current = this.profile.favoriteGenres.get(tag) || 0;
            this.profile.favoriteGenres.set(tag, current + weight);
        });

        this.saveProfile();
    }

    /**
     * Get top favorite genres
     */
    getTopGenres(limit = 5): string[] {
        return Array.from(this.profile.favoriteGenres.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([genre]) => genre);
    }

    /**
     * Score a manga based on user profile
     */
    scoreManga(manga: any): number {
        let score = 0;
        const reasons: string[] = [];

        // 1. Reject already read
        if (this.profile.readManga.has(manga.id)) {
            return -999;
        }

        // 2. Genre matching (strongest signal)
        const mangaTags = manga.attributes?.tags?.map((t: any) => 
            t.attributes?.name?.en || t.attributes?.name?.es || ''
        ).filter(Boolean) || [];

        const topGenres = this.getTopGenres(3);
        let genreBonus = 0;

        mangaTags.forEach((tag: string) => {
            const genreScore = this.profile.favoriteGenres.get(tag) || 0;
            if (genreScore > 0) {
                genreBonus += genreScore * 15;
            }
        });

        if (genreBonus > 0) {
            score += genreBonus;
            reasons.push(`Matches favorite genres: ${topGenres.slice(0, 2).join(', ')}`);
        }

        // 3. Language preference
        if (manga.attributes.originalLanguage === 'es') {
            score += 20;
            reasons.push('In Spanish');
        } else if (this.profile.languagePreference === 'en' && manga.attributes.originalLanguage === 'en') {
            score += 15;
            reasons.push('In English');
        }

        // 4. Update status (ongoing > completed)
        if (manga.attributes.status === 'ongoing') {
            score += 15;
            reasons.push('Ongoing series');
        } else if (manga.attributes.status === 'completed') {
            score += 10;
            reasons.push('Completed series');
        }

        // 5. Diversity penalty: If user likes a genre too much, lower similar mangas
        const dominantGenre = topGenres[0];
        if (dominantGenre && mangaTags.includes(dominantGenre)) {
            const diversityPenalty = 0.75;
            score *= diversityPenalty;
            // Don't add reason for penalty to keep it positive
        }

        // 6. Recency bonus: Recently updated mangas
        if (manga.attributes.updatedAt) {
            const daysSinceUpdate = (Date.now() - new Date(manga.attributes.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate < 1) {
                score += 30;
                reasons.push('Updated today');
            } else if (daysSinceUpdate < 7) {
                score += 10;
                reasons.push('Recently updated');
            }
        }

        // 7. Rating threshold (if available)
        if (manga.attributes.rating && manga.attributes.rating > 7.5) {
            score += 20;
            reasons.push('Highly rated');
        }

        // 8. Avoid already viewed recommendations
        if (this.profile.viewedRecommendations.has(manga.id)) {
            score *= 0.5;
        }

        return Math.max(0, score);
    }

    /**
     * Generate personalized recommendations
     */
    async getRecommendations(
        allManga: any[],
        limit = 12,
        minScore = 0
    ): Promise<ScoredManga[]> {
        const scored = allManga
            .map(manga => ({
                ...manga,
                _score: this.scoreManga(manga),
                _reason: this.getScoreReasons(manga)
            }))
            .filter(m => m._score >= minScore)
            .sort((a, b) => b._score - a._score)
            .slice(0, limit);

        // Mark as viewed
        scored.forEach(m => this.profile.viewedRecommendations.add(m.id));
        this.saveProfile();

        return scored.map(m => ({
            mangaId: m.id,
            title: this.getLocalizedTitle(m),
            score: m._score,
            reason: m._reason
        }));
    }

    /**
     * Get reasons for scoring (for UI display)
     */
    private getScoreReasons(manga: any): string[] {
        const reasons: string[] = [];
        const mangaTags = manga.attributes?.tags?.map((t: any) => 
            t.attributes?.name?.en || ''
        ).filter(Boolean) || [];

        const topGenres = this.getTopGenres(1);
        if (topGenres.length > 0 && mangaTags.includes(topGenres[0])) {
            reasons.push(`You like ${topGenres[0]}`);
        }

        if (manga.attributes.rating > 8) {
            reasons.push('Highly rated');
        }

        return reasons.slice(0, 2);
    }

    /**
     * Helper: Get localized title
     */
    private getLocalizedTitle(manga: any): string {
        const title = manga.attributes?.title;
        if (typeof title === 'string') return title;
        if (typeof title === 'object') {
            return title.es || title.en || Object.values(title)[0] || 'Unknown';
        }
        return 'Unknown';
    }

    /**
     * Get reading statistics
     */
    getStats() {
        const totalRead = this.profile.readManga.size;
        const avgRating = this.profile.readingHistory.length > 0
            ? this.profile.readingHistory.reduce((sum, e) => sum + e.rating, 0) / this.profile.readingHistory.length
            : 0;

        const topGenres = this.getTopGenres(3);

        // Calculate reading streak (days with readings)
        const readingDates = new Set(
            this.profile.readingHistory.map(e => 
                new Date(e.date).toDateString()
            )
        );

        const todayReading = readingDates.has(new Date().toDateString());
        let streak = 0;
        let checkDate = new Date();

        while (readingDates.has(checkDate.toDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return {
            totalRead,
            avgRating: avgRating.toFixed(1),
            topGenres,
            readingStreak: streak,
            isReadingToday: todayReading,
            lastReading: this.profile.readingHistory[0]?.date || null
        };
    }

    /**
     * Score manga based on emotional mood profile
     */
    private scoreMangaByMood(manga: any, mood: any): number {
        let score = 0;
        
        if (!mood || !mood.emotionalNeeds) return this.scoreManga(manga);

        const mangaTags = manga.attributes?.tags?.map((t: any) => 
            t.attributes?.name?.en || t.attributes?.name?.es || ''
        ).filter(Boolean) || [];

        // Map emotional needs to genres
        const moodGenreMap: { [key: string]: string[] } = {
            comfort: ['Slice of Life', 'Comedy', 'Romance', 'School'],
            excitement: ['Action', 'Adventure', 'Thriller', 'Battle Shounen'],
            darkness: ['Horror', 'Psychological', 'Dark', 'Mystery'],
            knowledge: ['Educational', 'Historical', 'Science Fiction', 'Fantasy'],
            escape: ['Fantasy', 'Isekai', 'Adventure', 'Mystery'],
            discovery: ['Sci-Fi', 'Fantasy', 'Supernatural', 'Psychological']
        };

        // Calculate mood alignment score
        let moodScore = 0;
        mood.emotionalNeeds.forEach((need: string) => {
            const targetGenres = moodGenreMap[need] || [];
            targetGenres.forEach((genre: string) => {
                if (mangaTags.some((tag: string) => 
                    tag.toLowerCase().includes(genre.toLowerCase()) ||
                    genre.toLowerCase().includes(tag.toLowerCase())
                )) {
                    moodScore += 25;
                }
            });
        });

        // Weight by reading intensity
        const intensityMultiplier = 0.8 + (mood.readingIntensity / 100) * 0.4;
        score = moodScore * intensityMultiplier;

        // Session type adjustments
        if (mood.sessionType === 'binge') {
            // Prefer ongoing, longer series
            if (manga.attributes?.status === 'ongoing') score += 15;
            if (mangaTags.some((t: string) => 
                t.toLowerCase().includes('long') || 
                t.toLowerCase().includes('shounen')
            )) score += 10;
        } else if (mood.sessionType === 'casual') {
            // Prefer shorter, lighter reads
            if (mangaTags.some((t: string) => 
                t.toLowerCase().includes('comedy') ||
                t.toLowerCase().includes('romance')
            )) score += 20;
        } else if (mood.sessionType === 'study') {
            // Prefer informative content
            if (mangaTags.some((t: string) => 
                t.toLowerCase().includes('historical') ||
                t.toLowerCase().includes('science')
            )) score += 20;
        }

        // Scroll speed consideration
        if (mood.scrollSpeed === 'fast') {
            // User reads fast - recommend action-packed content
            if (mangaTags.some((t: string) => 
                t.toLowerCase().includes('action') ||
                t.toLowerCase().includes('battle')
            )) score += 15;
        } else if (mood.scrollSpeed === 'slow') {
            // User reads slowly - recommend narrative-heavy content
            if (mangaTags.some((t: string) => 
                t.toLowerCase().includes('story') ||
                t.toLowerCase().includes('mystery')
            )) score += 15;
        }

        // Combine with base score (60% mood + 40% profile)
        const baseScore = this.scoreManga(manga);
        return (score * 0.6) + (baseScore * 0.4);
    }

    /**
     * Generate mood-based recommendations
     * @param mood ReadingMoodProfile from moodDetectorEngine
     * @param allManga Array of manga to recommend from
     * @param limit Number of recommendations to return
     */
    async getMoodBasedRecommendations(
        mood: any,
        allManga: any[],
        limit = 12
    ): Promise<ScoredManga[]> {
        if (!mood || !mood.emotionalNeeds) {
            // Fallback to standard recommendations if mood is invalid
            return this.getRecommendations(allManga, limit);
        }

        const scored = allManga
            .map(manga => ({
                ...manga,
                _score: this.scoreMangaByMood(manga, mood),
                _reason: this.getMoodScoreReasons(manga, mood)
            }))
            .filter(m => m._score > 0)
            .sort((a, b) => b._score - a._score)
            .slice(0, limit);

        // Mark as viewed
        scored.forEach(m => this.profile.viewedRecommendations.add(m.id));
        this.saveProfile();

        return scored.map(m => ({
            mangaId: m.id,
            title: this.getLocalizedTitle(m),
            score: m._score,
            reason: m._reason
        }));
    }

    /**
     * Get reasons for mood-based scoring
     */
    private getMoodScoreReasons(manga: any, mood: any): string[] {
        const reasons: string[] = [];
        const mangaTags = manga.attributes?.tags?.map((t: any) => 
            t.attributes?.name?.en || t.attributes?.name?.es || ''
        ).filter(Boolean) || [];

        // Map current mood to a friendly string
        const moodLabel: { [key: string]: string } = {
            energetic: '⚡ You\'re energetic',
            calm: '🧘 You\'re feeling calm',
            melancholic: '💙 You\'re feeling introspective',
            curious: '🔍 You\'re curious',
            stressed: '😰 You need to unwind'
        };

        if (mood.currentMood && moodLabel[mood.currentMood]) {
            reasons.push(moodLabel[mood.currentMood]);
        }

        // Add genre match
        const primaryNeed = mood.emotionalNeeds?.[0];
        if (primaryNeed) {
            const needLabel: { [key: string]: string } = {
                comfort: 'Comforting content',
                excitement: 'Action-packed',
                darkness: 'Dark atmosphere',
                knowledge: 'Educational',
                escape: 'Great escape',
                discovery: 'New discovery'
            };
            if (needLabel[primaryNeed]) {
                reasons.push(needLabel[primaryNeed]);
            }
        }

        return reasons.slice(0, 2);
    }

    /**
     * Export profile for backup
     */
    exportProfile(): string {
        return JSON.stringify({
            ...this.profile,
            readManga: Array.from(this.profile.readManga),
            favoriteGenres: Array.from(this.profile.favoriteGenres.entries()),
            viewedRecommendations: Array.from(this.profile.viewedRecommendations)
        }, null, 2);
    }

    /**
     * Reset profile (user logout or reset)
     */
    reset(): void {
        this.profile = { ...DEFAULT_PROFILE };
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[RecommendationEngine] Profile reset');
    }
}

// Singleton instance
let instance: RecommendationEngine | null = null;

export function getRecommendationEngine(userId?: string): RecommendationEngine {
    if (!instance) {
        instance = new RecommendationEngine(userId);
    }
    return instance;
}

export default RecommendationEngine;
