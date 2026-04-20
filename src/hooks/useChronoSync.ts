/**
 * useChronoSync - React hook for real-time reading synchronization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getChronoSyncEngine,
  ReaderSession,
  ReaderGroup,
  ReadingRace
} from '../services/chronoSyncEngine';

export function useChronoSync() {
  const [currentSession, setCurrentSession] = useState<ReaderSession | null>(null);
  const [joinedGroup, setJoinedGroup] = useState<ReaderGroup | null>(null);
  const [availableGroups, setAvailableGroups] = useState<ReaderGroup[]>([]);
  const [joinedRaces, setJoinedRaces] = useState<ReadingRace[]>([]);
  const [stats, setStats] = useState({ activeReaders: 0, activeGroups: 0, activeRaces: 0, totalReadersThisHour: 0 });
  const [loading, setLoading] = useState(false);

  const engine = useMemo(() => getChronoSyncEngine(), []);

  /**
   * Start new reading session
   */
  const startSession = useCallback((
    userId: string,
    userName: string,
    mangaId: string,
    mangaTitle: string,
    chapterId: string,
    chapterNumber: string,
    totalPages: number
  ) => {
    const session = engine.createSession(
      userId,
      userName,
      mangaId,
      mangaTitle,
      chapterId,
      chapterNumber,
      totalPages
    );
    setCurrentSession(session);
    return session;
  }, [engine]);

  /**
   * Update reading progress
   */
  const updateProgress = useCallback((currentPage: number, totalPages: number) => {
    if (!currentSession) return;

    engine.updateSessionProgress(currentSession.sessionId, currentPage, totalPages);

    // Update local state
    const updated = { ...currentSession, currentPage };
    setCurrentSession(updated);
  }, [currentSession, engine]);

  /**
   * Pause session
   */
  const pauseSession = useCallback(() => {
    if (!currentSession) return;
    engine.pauseSession(currentSession.sessionId);
    setCurrentSession({ ...currentSession, status: 'paused' });
  }, [currentSession, engine]);

  /**
   * Create reader group
   */
  const createGroup = useCallback((
    userId: string,
    mangaId: string,
    chapterId: string,
    mangaTitle: string,
    chapterNumber: string
  ) => {
    const group = engine.createReaderGroup(userId, mangaId, chapterId, mangaTitle, chapterNumber);
    setJoinedGroup(group);
    return group;
  }, [engine]);

  /**
   * Join reader group
   */
  const joinGroup = useCallback((groupId: string) => {
    if (!currentSession) return false;

    const success = engine.joinReaderGroup(groupId, currentSession);
    if (success) {
      const group = engine.getActiveGroupsForChapter(currentSession.chapterId)[0];
      setJoinedGroup(group || null);
    }
    return success;
  }, [currentSession, engine]);

  /**
   * Leave reader group
   */
  const leaveGroup = useCallback(() => {
    if (!currentSession || !joinedGroup) return;

    engine.leaveReaderGroup(joinedGroup.groupId, currentSession.sessionId);
    setJoinedGroup(null);
  }, [currentSession, joinedGroup, engine]);

  /**
   * Send chat message
   */
  const sendChatMessage = useCallback((message: string, isSpoiler = false) => {
    if (!currentSession || !joinedGroup) return false;

    const success = engine.sendGroupMessage(
      joinedGroup.groupId,
      currentSession.userId,
      currentSession.userName,
      message,
      isSpoiler
    );

    if (success) {
      // Refresh group to get updated chat
      const updated = engine.getActiveGroupsForChapter(currentSession.chapterId)[0];
      setJoinedGroup(updated || null);
    }

    return success;
  }, [currentSession, joinedGroup, engine]);

  /**
   * Create reading race
   */
  const createRace = useCallback((
    userId: string,
    userName: string,
    mangaId: string,
    chapterId: string,
    title: string
  ) => {
    const race = engine.createReadingRace(userId, userName, mangaId, chapterId, title);
    setJoinedRaces([...joinedRaces, race]);
    return race;
  }, [engine, joinedRaces]);

  /**
   * Join reading race
   */
  const joinRace = useCallback((raceId: string, userId: string, userName: string) => {
    const success = engine.joinReadingRace(raceId, userId, userName);
    if (success) {
      // Update races list
      refreshRaces();
    }
    return success;
  }, [engine]);

  /**
   * Get active groups for current chapter
   */
  const refreshGroups = useCallback(() => {
    if (!currentSession) return;
    const groups = engine.getActiveGroupsForChapter(currentSession.chapterId);
    setAvailableGroups(groups);
  }, [currentSession, engine]);

  /**
   * Get user races
   */
  const refreshRaces = useCallback(() => {
    if (!currentSession) return;
    const userRaces = engine.getUserActiveSessions(currentSession.userId);
    if (userRaces.length > 0) {
      // This is simplified; in real implementation would fetch actual race objects
      setJoinedRaces(joinedRaces);
    }
  }, [currentSession, engine, joinedRaces]);

  /**
   * Update stats
   */
  const refreshStats = useCallback(() => {
    setStats(engine.getStats());
  }, [engine]);

  /**
   * Auto-refresh
   */
  useEffect(() => {
    refreshStats();
    const statsInterval = setInterval(refreshStats, 30000); // Update every 30s

    return () => clearInterval(statsInterval);
  }, [refreshStats]);

  /**
   * Refresh available groups when chapter changes
   */
  useEffect(() => {
    refreshGroups();
    const groupInterval = setInterval(refreshGroups, 10000); // Update every 10s

    return () => clearInterval(groupInterval);
  }, [refreshGroups]);

  return {
    // Session state
    currentSession,
    joinedGroup,
    availableGroups,
    joinedRaces,
    stats,
    loading,

    // Session actions
    startSession,
    updateProgress,
    pauseSession,

    // Group actions
    createGroup,
    joinGroup,
    leaveGroup,
    sendChatMessage,
    refreshGroups,

    // Race actions
    createRace,
    joinRace,

    // Info
    isReading: currentSession?.status === 'active',
    isInGroup: joinedGroup !== null,
    groupLeaderboard: joinedGroup?.leaderboard || []
  };
}
