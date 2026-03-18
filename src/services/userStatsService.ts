import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserStats {
  xp: number;
  level: number;
  chaptersRead: number;
  commentsPosted: number;
  achievements: string[];
  lastUpdated: number;
}

const XP_PER_CHAPTER = 25;
const XP_PER_COMMENT = 10;
const XP_PER_REPLY = 15;
const XP_PER_SHARE = 30;

export const userStatsService = {
  /**
   * Get XP needed for a specific level
   */
  getXPForLevel(level: number): number {
    if (level <= 1) return 100;
    return Math.floor(100 * Math.pow(1.5, level - 1));
  },

  /**
   * Calculate level based on total XP
   */
  calculateLevel(xp: number): { level: number; nextLevelXP: number; progress: number } {
    let level = 1;
    let xpNeeded = 100;
    let accumulatedXP = 0;

    while (xp >= accumulatedXP + xpNeeded) {
      accumulatedXP += xpNeeded;
      level++;
      xpNeeded = this.getXPForLevel(level);
    }

    const currentLevelProgress = xp - accumulatedXP;
    const progress = (currentLevelProgress / xpNeeded) * 100;

    return { level, nextLevelXP: xpNeeded, progress };
  },

  /**
   * Get rank name based on level
   */
  getRankName(level: number): string {
    if (level < 5) return 'Lector Novato';
    if (level < 10) return 'Explorador de Haus';
    if (level < 20) return 'Guerrero de Tinta';
    if (level < 40) return 'Maestro de Sombras';
    if (level < 70) return 'Soberano del Manga';
    return 'Deidad Pro';
  },

  /**
   * Initialize or get user stats
   */
  async getOrInitStats(userId: string): Promise<UserStats> {
    const docRef = doc(db, 'userStats', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserStats;
    } else {
      const initialStats: UserStats = {
        xp: 0,
        level: 1,
        chaptersRead: 0,
        commentsPosted: 0,
        achievements: [],
        lastUpdated: Date.now()
      };
      await setDoc(docRef, initialStats);
      return initialStats;
    }
  },

  /**
   * Get stats (Read Only - for public profiles)
   */
  async getStats(userId: string): Promise<UserStats | null> {
    try {
      const docRef = doc(db, 'userStats', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() as UserStats : null;
    } catch (e) {
      console.warn('Silent: Could not fetch public stats', e);
      return null;
    }
  },

  /**
   * Subscribe to real-time stats
   */
  subscribe(userId: string, callback: (stats: UserStats) => void) {
    const docRef = doc(db, 'userStats', userId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as UserStats);
      }
    });
  },

  /**
   * Award XP for reading a chapter
   */
  async awardChapterXP(userId: string) {
    const docRef = doc(db, 'userStats', userId);
    await setDoc(docRef, {
      xp: increment(XP_PER_CHAPTER),
      chaptersRead: increment(1),
      lastUpdated: Date.now()
    }, { merge: true });
  },

  /**
   * Award XP for commenting
   */
  async awardCommentXP(userId: string, isReply: boolean = false) {
    const docRef = doc(db, 'userStats', userId);
    const xp = isReply ? XP_PER_REPLY : XP_PER_COMMENT;
    await setDoc(docRef, {
      xp: increment(xp),
      commentsPosted: increment(1),
      lastUpdated: Date.now()
    }, { merge: true });
  },

  /**
   * Award XP for sharing/recommending a manga
   */
  async awardRecommendationXP(userId: string) {
    const docRef = doc(db, 'userStats', userId);
    await setDoc(docRef, {
      xp: increment(XP_PER_SHARE),
      lastUpdated: Date.now()
    }, { merge: true });
  }
};
