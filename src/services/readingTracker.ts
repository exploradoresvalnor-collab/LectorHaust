/**
 * Reading Tracker - Tracks user progress, statistics, and reading habits
 * Provides "Continue Reading", streaks, and reading analytics
 */

export interface ReadingSession {
    mangaId: string;
    mangaTitle: string;
    chapterId: string;
    chapterNumber: string;
    pageNumber: number;
    totalPages?: number;
    startedAt: number;
    lastReadAt: number;
    timeSpentMs: number;
    device: string;
    status: 'reading' | 'completed' | 'paused';
}

export interface ReadingStats {
    totalChaptersRead: number;
    totalTimeSpentMinutes: number;
    averageTimePerChapter: number;
    favoriteGenres: string[];
    readingStreak: number;
    isReadingToday: boolean;
    sessionsThisWeek: number;
    lastSessionDate?: number;
}

export interface ContinueReadingItem {
    mangaId: string;
    mangaTitle: string;
    chapterId: string;
    chapterNumber: string;
    pageNumber: number;
    totalPages: number;
    progressPercent: number;
    lastReadAt: number;
}

class ReadingTracker {
    private sessions: Map<string, ReadingSession> = new Map();
    private readonly STORAGE_KEY = 'mangaApp_readingSessions';
    private readonly STATS_KEY = 'mangaApp_readingStats';
    private currentSessionChapterId: string | null = null;
    private sessionStartTime: number = 0;

    constructor() {
        this.loadSessions();
    }

    /**
     * Load sessions from localStorage
     */
    private loadSessions(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.sessions = new Map(Object.entries(parsed));
            }
        } catch (err) {
            console.error('[ReadingTracker] Failed to load sessions:', err);
            this.sessions = new Map();
        }
    }

    /**
     * Save sessions to localStorage
     */
    private saveSessions(): void {
        try {
            const obj = Object.fromEntries(this.sessions);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
        } catch (err) {
            console.error('[ReadingTracker] Failed to save sessions:', err);
        }
    }

    /**
     * Get device identifier (helps sync across devices)
     */
    private getDeviceId(): string {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = `device_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    /**
     * Start reading a chapter
     */
    startReading(mangaId: string, mangaTitle: string, chapterId: string, chapterNumber: string, totalPages = 0): void {
        const session: ReadingSession = {
            mangaId,
            mangaTitle,
            chapterId,
            chapterNumber,
            pageNumber: 0,
            totalPages,
            startedAt: Date.now(),
            lastReadAt: Date.now(),
            timeSpentMs: 0,
            device: this.getDeviceId(),
            status: 'reading'
        };

        this.sessions.set(chapterId, session);
        this.currentSessionChapterId = chapterId;
        this.sessionStartTime = Date.now();
        this.saveSessions();

        console.log(`[ReadingTracker] Started: ${mangaTitle} - Cap. ${chapterNumber}`);
    }

    /**
     * Update progress in current chapter
     */
    updateProgress(chapterId: string, pageNumber: number, totalPages?: number): void {
        const session = this.sessions.get(chapterId);
        if (!session) {
            console.warn(`[ReadingTracker] No active session for chapter: ${chapterId}`);
            return;
        }

        session.pageNumber = Math.max(0, Math.min(pageNumber, totalPages || pageNumber));
        if (totalPages) session.totalPages = totalPages;
        session.lastReadAt = Date.now();

        // Update time spent (accumulated)
        if (this.currentSessionChapterId === chapterId && this.sessionStartTime > 0) {
            const elapsed = Date.now() - this.sessionStartTime;
            session.timeSpentMs += elapsed;
            this.sessionStartTime = Date.now(); // Reset for next interval
        }

        // Mark as completed if reached end
        if (totalPages && pageNumber >= totalPages) {
            session.status = 'completed';
        }

        this.sessions.set(chapterId, session);
        this.saveSessions();
    }

    /**
     * Pause reading (e.g., when closing the reader)
     */
    pauseReading(chapterId: string): void {
        const session = this.sessions.get(chapterId);
        if (session) {
            session.status = 'paused';
            
            // Add final time interval
            if (this.currentSessionChapterId === chapterId && this.sessionStartTime > 0) {
                const elapsed = Date.now() - this.sessionStartTime;
                session.timeSpentMs += elapsed;
                this.sessionStartTime = 0;
                this.currentSessionChapterId = null;
            }

            this.sessions.set(chapterId, session);
            this.saveSessions();
            console.log(`[ReadingTracker] Paused: ${session.mangaTitle}`);
        }
    }

    /**
     * Mark chapter as completed
     */
    completeChapter(chapterId: string): void {
        const session = this.sessions.get(chapterId);
        if (session) {
            session.status = 'completed';
            if (session.totalPages) {
                session.pageNumber = session.totalPages;
            }
            
            if (this.currentSessionChapterId === chapterId && this.sessionStartTime > 0) {
                const elapsed = Date.now() - this.sessionStartTime;
                session.timeSpentMs += elapsed;
                this.sessionStartTime = 0;
                this.currentSessionChapterId = null;
            }

            this.sessions.set(chapterId, session);
            this.saveSessions();
        }
    }

    /**
     * Get items for "Continue Reading"
     */
    getContinueReading(limit = 5): ContinueReadingItem[] {
        const items = Array.from(this.sessions.values())
            .filter(s => s.status !== 'completed' && s.pageNumber > 0)
            .sort((a, b) => b.lastReadAt - a.lastReadAt)
            .slice(0, limit);

        return items.map(s => ({
            mangaId: s.mangaId,
            mangaTitle: s.mangaTitle,
            chapterId: s.chapterId,
            chapterNumber: s.chapterNumber,
            pageNumber: s.pageNumber,
            totalPages: s.totalPages || 0,
            progressPercent: s.totalPages ? Math.round((s.pageNumber / s.totalPages) * 100) : 0,
            lastReadAt: s.lastReadAt
        }));
    }

    /**
     * Get reading statistics
     */
    getStats(): ReadingStats {
        const sessions = Array.from(this.sessions.values());
        const totalChaptersRead = sessions.filter(s => s.status === 'completed').length;
        const totalTimeSpentMs = sessions.reduce((sum, s) => sum + s.timeSpentMs, 0);
        const totalTimeSpentMinutes = Math.round(totalTimeSpentMs / 60000);
        const avgTimePerChapter = sessions.length > 0 
            ? Math.round(totalTimeSpentMs / sessions.length / 60000)
            : 0;

        // Calculate reading streak
        const readingDates = new Set(
            sessions.map(s => new Date(s.lastReadAt).toDateString())
        );

        let streak = 0;
        let checkDate = new Date();
        while (readingDates.has(checkDate.toDateString())) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        // Sessions this week
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const sessionsThisWeek = sessions.filter(s => s.lastReadAt > weekAgo).length;

        const today = new Date().toDateString();
        const isReadingToday = readingDates.has(today);

        return {
            totalChaptersRead,
            totalTimeSpentMinutes,
            averageTimePerChapter: avgTimePerChapter,
            favoriteGenres: [], // Filled by integration with recommendation engine
            readingStreak: streak,
            isReadingToday,
            sessionsThisWeek,
            lastSessionDate: sessions.length > 0 
                ? sessions.reduce((max, s) => Math.max(max, s.lastReadAt), 0)
                : undefined
        };
    }

    /**
     * Get progress for a specific manga
     */
    getMangaProgress(mangaId: string): { chaptersRead: number; latestChapter: string; lastRead: number } {
        const mangaSessions = Array.from(this.sessions.values())
            .filter(s => s.mangaId === mangaId);

        return {
            chaptersRead: mangaSessions.filter(s => s.status === 'completed').length,
            latestChapter: mangaSessions.length > 0 
                ? mangaSessions.sort((a, b) => b.lastReadAt - a.lastReadAt)[0].chapterNumber
                : 'N/A',
            lastRead: mangaSessions.length > 0
                ? mangaSessions.sort((a, b) => b.lastReadAt - a.lastReadAt)[0].lastReadAt
                : 0
        };
    }

    /**
     * Get all sessions for a manga
     */
    getMangaSessions(mangaId: string): ReadingSession[] {
        return Array.from(this.sessions.values())
            .filter(s => s.mangaId === mangaId)
            .sort((a, b) => {
                const chapA = parseFloat(a.chapterNumber);
                const chapB = parseFloat(b.chapterNumber);
                return chapB - chapA;
            });
    }

    /**
     * Get session for a specific chapter
     */
    getChapterSession(chapterId: string): ReadingSession | null {
        return this.sessions.get(chapterId) || null;
    }

    /**
     * Remove a session (e.g., user wants to restart reading)
     */
    removeSession(chapterId: string): void {
        this.sessions.delete(chapterId);
        this.saveSessions();
    }

    /**
     * Clear all sessions
     */
    clearAllSessions(): void {
        this.sessions.clear();
        this.saveSessions();
        console.log('[ReadingTracker] All sessions cleared');
    }

    /**
     * Export reading data for backup
     */
    exportData(): string {
        return JSON.stringify({
            sessions: Array.from(this.sessions.values()),
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import reading data from backup
     */
    importData(jsonData: string): boolean {
        try {
            const data = JSON.parse(jsonData);
            if (Array.isArray(data.sessions)) {
                this.sessions.clear();
                data.sessions.forEach((session: ReadingSession) => {
                    this.sessions.set(session.chapterId, session);
                });
                this.saveSessions();
                console.log('[ReadingTracker] Data imported successfully');
                return true;
            }
            return false;
        } catch (err) {
            console.error('[ReadingTracker] Failed to import data:', err);
            return false;
        }
    }

    /**
     * Sync with cloud (placeholder for future feature)
     */
    async syncToCloud(userId: string): Promise<boolean> {
        // Future implementation: Send to backend
        console.log(`[ReadingTracker] Syncing to cloud for user: ${userId}`);
        return true;
    }
}

// Singleton instance
let instance: ReadingTracker | null = null;

export function getReadingTracker(): ReadingTracker {
    if (!instance) {
        instance = new ReadingTracker();
    }
    return instance;
}

export default ReadingTracker;
