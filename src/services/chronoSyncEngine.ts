/**
 * ChronoSync Engine - Real-time reading synchronization with other users
 * Enables concurrent reading sessions, discussions, and competitive reading races
 */

export interface ReaderSession {
  sessionId: string;
  userId: string;
  userName: string;
  mangaId: string;
  mangaTitle: string;
  chapterId: string;
  chapterNumber: string;
  currentPage: number;
  totalPages: number;
  readingSpeed: number; // pages per minute
  joinedAt: number;
  lastUpdatedAt: number;
  status: 'active' | 'paused' | 'completed';
  isSpoilerFree?: boolean; // No chat spoilers
}

export interface ReaderGroup {
  groupId: string;
  mangaId: string;
  chapterId: string;
  mangaTitle: string;
  chapterNumber: string;
  totalReaders: number;
  activeReaders: ReaderSession[];
  startedAt: number;
  averageReadingSpeed: number;
  leaderboard: Array<{
    userId: string;
    userName: string;
    currentPage: number;
    readingSpeed: number;
    finishTime?: number;
  }>;
  chatMessages: Array<{
    userId: string;
    userName: string;
    message: string;
    timestamp: number;
    isSpoiler?: boolean;
  }>;
  maxReaders?: number;
}

export interface ReadingRace {
  raceId: string;
  mangaId: string;
  chapterId: string;
  title: string;
  participants: Array<{
    userId: string;
    userName: string;
    startTime: number;
    finishTime?: number;
    pagesRead: number;
    speed: number;
    rank?: number;
  }>;
  startTime: number;
  endTime?: number;
  status: 'upcoming' | 'active' | 'completed';
  rules: {
    maxDuration: number; // minutes
    minParticipants: number;
    spoilerFree: boolean;
  };
  prize?: {
    description: string;
    rewardPoints?: number;
  };
}

class ChronoSyncEngine {
  private readonly SESSIONS_KEY = 'mangaApp_readerSessions';
  private readonly GROUPS_KEY = 'mangaApp_readerGroups';
  private readonly RACES_KEY = 'mangaApp_readingRaces';
  private readerSessions: Map<string, ReaderSession> = new Map();
  private readerGroups: Map<string, ReaderGroup> = new Map();
  private readingRaces: Map<string, ReadingRace> = new Map();
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadData();
    this.initializeCleanup();
  }

  /**
   * Load data from storage
   */
  private loadData(): void {
    try {
      const sessions = localStorage.getItem(this.SESSIONS_KEY);
      const groups = localStorage.getItem(this.GROUPS_KEY);
      const races = localStorage.getItem(this.RACES_KEY);

      if (sessions) {
        const data = JSON.parse(sessions);
        Object.entries(data).forEach(([id, session]: [string, any]) => {
          this.readerSessions.set(id, session);
        });
      }

      if (groups) {
        const data = JSON.parse(groups);
        Object.entries(data).forEach(([id, group]: [string, any]) => {
          this.readerGroups.set(id, group);
        });
      }

      if (races) {
        const data = JSON.parse(races);
        Object.entries(data).forEach(([id, race]: [string, any]) => {
          this.readingRaces.set(id, race);
        });
      }
    } catch (err) {
      console.error('[ChronoSync] Failed to load data:', err);
    }
  }

  /**
   * Create a new reader session
   */
  createSession(
    userId: string,
    userName: string,
    mangaId: string,
    mangaTitle: string,
    chapterId: string,
    chapterNumber: string,
    totalPages: number
  ): ReaderSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: ReaderSession = {
      sessionId,
      userId,
      userName,
      mangaId,
      mangaTitle,
      chapterId,
      chapterNumber,
      currentPage: 0,
      totalPages,
      readingSpeed: 0,
      joinedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      status: 'active'
    };

    this.readerSessions.set(sessionId, session);
    this.saveData();

    console.log(`[ChronoSync] Session created: ${sessionId}`);
    return session;
  }

  /**
   * Update session page and speed
   */
  updateSessionProgress(sessionId: string, currentPage: number, totalPages: number): void {
    const session = this.readerSessions.get(sessionId);
    if (!session) return;

    const elapsedMinutes = (Date.now() - session.lastUpdatedAt) / 60000;
    const pagesDiff = Math.max(0, currentPage - session.currentPage);

    if (elapsedMinutes > 0) {
      session.readingSpeed = pagesDiff / elapsedMinutes;
    }

    session.currentPage = currentPage;
    session.lastUpdatedAt = Date.now();

    // Check if completed
    if (currentPage >= totalPages) {
      session.status = 'completed';
    }

    this.readerSessions.set(sessionId, session);

    // Update group if in one
    this.updateGroupProgress(sessionId, currentPage);
    this.saveData();
  }

  /**
   * Pause session
   */
  pauseSession(sessionId: string): void {
    const session = this.readerSessions.get(sessionId);
    if (session) {
      session.status = 'paused';
      this.readerSessions.set(sessionId, session);
      this.saveData();
    }
  }

  /**
   * Create a reader group for concurrent reading
   */
  createReaderGroup(
    userId: string,
    mangaId: string,
    chapterId: string,
    mangaTitle: string,
    chapterNumber: string,
    maxReaders = 5
  ): ReaderGroup {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const group: ReaderGroup = {
      groupId,
      mangaId,
      chapterId,
      mangaTitle,
      chapterNumber,
      totalReaders: 1,
      activeReaders: [],
      startedAt: Date.now(),
      averageReadingSpeed: 0,
      leaderboard: [],
      chatMessages: [],
      maxReaders
    };

    this.readerGroups.set(groupId, group);
    this.saveData();

    console.log(`[ChronoSync] Reader group created: ${groupId}`);
    return group;
  }

  /**
   * Join existing reader group
   */
  joinReaderGroup(groupId: string, session: ReaderSession): boolean {
    const group = this.readerGroups.get(groupId);
    if (!group) return false;

    if (group.maxReaders && group.activeReaders.length >= group.maxReaders) {
      return false; // Group is full
    }

    group.activeReaders.push(session);
    group.totalReaders += 1;

    // Update leaderboard
    this.updateGroupLeaderboard(groupId);
    this.readerGroups.set(groupId, group);
    this.saveData();

    return true;
  }

  /**
   * Leave reader group
   */
  leaveReaderGroup(groupId: string, sessionId: string): void {
    const group = this.readerGroups.get(groupId);
    if (!group) return;

    group.activeReaders = group.activeReaders.filter(s => s.sessionId !== sessionId);

    if (group.activeReaders.length === 0) {
      this.readerGroups.delete(groupId);
    } else {
      this.updateGroupLeaderboard(groupId);
      this.readerGroups.set(groupId, group);
    }

    this.saveData();
  }

  /**
   * Update group progress
   */
  private updateGroupProgress(sessionId: string, currentPage: number): void {
    // Find group containing this session
    for (const group of this.readerGroups.values()) {
      const reader = group.activeReaders.find(s => s.sessionId === sessionId);
      if (reader) {
        reader.currentPage = currentPage;
        this.updateGroupLeaderboard(group.groupId);
        break;
      }
    }
  }

  /**
   * Update group leaderboard
   */
  private updateGroupLeaderboard(groupId: string): void {
    const group = this.readerGroups.get(groupId);
    if (!group) return;

    // Sort by pages read and speed
    group.leaderboard = group.activeReaders
      .map(reader => ({
        userId: reader.userId,
        userName: reader.userName,
        currentPage: reader.currentPage,
        readingSpeed: reader.readingSpeed,
        finishTime: reader.status === 'completed' ? reader.lastUpdatedAt : undefined
      }))
      .sort((a, b) => b.currentPage - a.currentPage)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    // Calculate average speed
    const speeds = group.activeReaders.map(r => r.readingSpeed).filter(s => s > 0);
    group.averageReadingSpeed = speeds.length > 0
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length
      : 0;

    this.readerGroups.set(groupId, group);
  }

  /**
   * Send chat message in group
   */
  sendGroupMessage(groupId: string, userId: string, userName: string, message: string, isSpoiler = false): boolean {
    const group = this.readerGroups.get(groupId);
    if (!group) return false;

    group.chatMessages.push({
      userId,
      userName,
      message,
      timestamp: Date.now(),
      isSpoiler
    });

    // Keep only last 100 messages
    if (group.chatMessages.length > 100) {
      group.chatMessages = group.chatMessages.slice(-100);
    }

    this.readerGroups.set(groupId, group);
    this.saveData();

    return true;
  }

  /**
   * Get chat messages
   */
  getGroupChat(groupId: string, limit = 50): any[] {
    const group = this.readerGroups.get(groupId);
    if (!group) return [];

    return group.chatMessages.slice(-limit);
  }

  /**
   * Create reading race
   */
  createReadingRace(
    userId: string,
    userName: string,
    mangaId: string,
    chapterId: string,
    title: string,
    maxDuration = 60,
    minParticipants = 2
  ): ReadingRace {
    const raceId = `race_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const race: ReadingRace = {
      raceId,
      mangaId,
      chapterId,
      title,
      participants: [
        {
          userId,
          userName,
          startTime: Date.now(),
          pagesRead: 0,
          speed: 0
        }
      ],
      startTime: Date.now(),
      status: 'upcoming',
      rules: {
        maxDuration,
        minParticipants,
        spoilerFree: true
      }
    };

    this.readingRaces.set(raceId, race);
    this.saveData();

    return race;
  }

  /**
   * Join reading race
   */
  joinReadingRace(raceId: string, userId: string, userName: string): boolean {
    const race = this.readingRaces.get(raceId);
    if (!race) return false;

    if (race.participants.some(p => p.userId === userId)) {
      return false; // Already joined
    }

    race.participants.push({
      userId,
      userName,
      startTime: Date.now(),
      pagesRead: 0,
      speed: 0
    });

    if (race.participants.length >= race.rules.minParticipants && race.status === 'upcoming') {
      race.status = 'active';
    }

    this.readingRaces.set(raceId, race);
    this.saveData();

    return true;
  }

  /**
   * Update race progress
   */
  updateRaceProgress(raceId: string, userId: string, pagesRead: number, speed: number): void {
    const race = this.readingRaces.get(raceId);
    if (!race) return;

    const participant = race.participants.find(p => p.userId === userId);
    if (participant) {
      participant.pagesRead = pagesRead;
      participant.speed = speed;

      // Check if participant finished
      if (participant.finishTime === undefined && speed === 0 && pagesRead > 0) {
        // Assume finished when speed drops to 0 but pages were read
      }

      this.readingRaces.set(raceId, race);
      this.saveData();
    }
  }

  /**
   * Get active groups for a chapter
   */
  getActiveGroupsForChapter(chapterId: string): ReaderGroup[] {
    return Array.from(this.readerGroups.values())
      .filter(group => group.chapterId === chapterId && group.activeReaders.length > 0)
      .sort((a, b) => b.activeReaders.length - a.activeReaders.length);
  }

  /**
   * Get user's active sessions
   */
  getUserActiveSessions(userId: string): ReaderSession[] {
    return Array.from(this.readerSessions.values())
      .filter(session => session.userId === userId && session.status === 'active');
  }

  /**
   * Get leaderboard for a chapter
   */
  getChapterLeaderboard(chapterId: string): any[] {
    const groups = Array.from(this.readerGroups.values())
      .filter(g => g.chapterId === chapterId);

    if (groups.length === 0) return [];

    // Combine leaderboards from all groups
    const combined: Record<string, any> = {};

    groups.forEach(group => {
      group.leaderboard.forEach(entry => {
        if (!combined[entry.userId]) {
          combined[entry.userId] = { ...entry, groups: 1 };
        } else {
          combined[entry.userId].currentPage = Math.max(
            combined[entry.userId].currentPage,
            entry.currentPage
          );
          combined[entry.userId].groups += 1;
        }
      });
    });

    return Object.values(combined)
      .sort((a, b) => b.currentPage - a.currentPage)
      .slice(0, 10);
  }

  /**
   * Initialize cleanup for old sessions
   */
  private initializeCleanup(): void {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

      for (const [id, session] of this.readerSessions.entries()) {
        if (now - session.lastUpdatedAt > inactiveThreshold && session.status === 'active') {
          this.readerSessions.delete(id);
        }
      }

      this.saveData();
    }, 5 * 60 * 1000);
  }

  /**
   * Save data to storage
   */
  private saveData(): void {
    try {
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(Object.fromEntries(this.readerSessions)));
      localStorage.setItem(this.GROUPS_KEY, JSON.stringify(Object.fromEntries(this.readerGroups)));
      localStorage.setItem(this.RACES_KEY, JSON.stringify(Object.fromEntries(this.readingRaces)));
    } catch (err) {
      console.error('[ChronoSync] Failed to save data:', err);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeReaders: number;
    activeGroups: number;
    activeRaces: number;
    totalReadersThisHour: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const activeReaders = Array.from(this.readerSessions.values())
      .filter(s => s.status === 'active').length;

    const activeGroups = Array.from(this.readerGroups.values())
      .filter(g => g.activeReaders.length > 0).length;

    const activeRaces = Array.from(this.readingRaces.values())
      .filter(r => r.status === 'active').length;

    const totalReadersThisHour = Array.from(this.readerSessions.values())
      .filter(s => s.joinedAt > oneHourAgo).length;

    return {
      activeReaders,
      activeGroups,
      activeRaces,
      totalReadersThisHour
    };
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.readerSessions.clear();
    this.readerGroups.clear();
    this.readingRaces.clear();
    localStorage.removeItem(this.SESSIONS_KEY);
    localStorage.removeItem(this.GROUPS_KEY);
    localStorage.removeItem(this.RACES_KEY);
    console.log('[ChronoSync] All data cleared');
  }
}

// Singleton instance
let instance: ChronoSyncEngine | null = null;

export function getChronoSyncEngine(): ChronoSyncEngine {
  if (!instance) {
    instance = new ChronoSyncEngine();
  }
  return instance;
}

export default ChronoSyncEngine;
