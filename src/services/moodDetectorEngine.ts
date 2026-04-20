/**
 * READING MOOD DETECTOR ENGINE
 * 
 * Analyzes reading patterns in real-time to detect user's emotional state
 * and current reading mood for dynamic recommendations.
 * 
 * Detects: emotional needs, reading intensity, personality profile
 */

export interface ReadingMoodProfile {
  scrollSpeed: 'slow' | 'moderate' | 'fast'; // <10s/page, 10-30s, >30s per page
  sessionType: 'binge' | 'casual' | 'study'; // Type of reading session
  emotionalNeeds: string[]; // ['comfort', 'excitement', 'darkness', 'knowledge', 'escape']
  readingIntensity: number; // 0-100: focus intensity
  confidence: number; // 0-100: how sure we are
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  sessionDuration: number; // minutes
  currentMood: 'energetic' | 'calm' | 'melancholic' | 'curious' | 'stressed';
}

export interface MoodMetrics {
  avgSecondsPerPage: number;
  pagesPerMinute: number;
  sessionsLast24h: number;
  totalPagesLast24h: number;
  genresVisitedLast24h: string[];
  favoriteGenresThisSession: string[];
  averageSessionLength: number; // minutes
  lastSessionTime: number;
  readingPattern: 'consistent' | 'sporadic' | 'intense' | 'relaxed';
}

const STORAGE_KEY = 'mangaApp_moodProfile';
const HISTORY_KEY = 'mangaApp_moodHistory';

class MoodDetectorEngine {
  private moodHistory: Array<{
    timestamp: number;
    mood: ReadingMoodProfile;
  }> = [];

  constructor() {
    this.loadHistory();
  }

  /**
   * Main function: Analyze current reading session and detect mood
   */
  analyzeMood(metrics: MoodMetrics): ReadingMoodProfile {
    const timeOfDay = this.getTimeOfDay();
    const scrollSpeedCategory = this.categorizeScrollSpeed(metrics.avgSecondsPerPage);
    const sessionType = this.categorizeSessionType(metrics);
    const emotionalNeeds = this.detectEmotionalNeeds(metrics, timeOfDay);
    const readingIntensity = this.calculateReadingIntensity(metrics);
    const currentMood = this.inferCurrentMood(metrics, sessionType, emotionalNeeds);

    const profile: ReadingMoodProfile = {
      scrollSpeed: scrollSpeedCategory,
      sessionType,
      emotionalNeeds,
      readingIntensity,
      confidence: this.calculateConfidence(metrics),
      timeOfDay,
      sessionDuration: metrics.averageSessionLength,
      currentMood,
    };

    // Save to history
    this.moodHistory.push({ timestamp: Date.now(), mood: profile });
    this.saveHistory();

    return profile;
  }

  /**
   * Categorize scroll speed into reading intensity
   * slow: contemplative, analytical reading
   * moderate: normal, engaged reading
   * fast: anxious, binge-reading
   */
  private categorizeScrollSpeed(avgSecondsPerPage: number): 'slow' | 'moderate' | 'fast' {
    if (avgSecondsPerPage > 40) return 'slow'; // Very thoughtful
    if (avgSecondsPerPage > 20) return 'moderate'; // Normal
    return 'fast'; // Binge mode
  }

  /**
   * Infer session type based on patterns
   */
  private categorizeSessionType(metrics: MoodMetrics): 'binge' | 'casual' | 'study' {
    // Binge: fast scrolling, long duration, many pages
    if (metrics.pagesPerMinute > 2 && metrics.averageSessionLength > 45) {
      return 'binge';
    }

    // Study: slow scrolling, specific genre (often action/mystery), careful reading
    if (metrics.avgSecondsPerPage > 30 && 
        (metrics.favoriteGenresThisSession.includes('mystery') ||
         metrics.favoriteGenresThisSession.includes('action'))) {
      return 'study';
    }

    // Casual: moderate, flexible duration
    return 'casual';
  }

  /**
   * Detect emotional needs from reading patterns
   */
  private detectEmotionalNeeds(metrics: MoodMetrics, timeOfDay: string): string[] {
    const needs: string[] = [];

    // Night reading + slow + not action = comfort seeking
    if (timeOfDay === 'night' && metrics.avgSecondsPerPage > 25) {
      needs.push('comfort');
      needs.push('escape');
    }

    // Fast reading + action genres = excitement seeking
    if (metrics.pagesPerMinute > 2.5 && metrics.genresVisitedLast24h.includes('action')) {
      needs.push('excitement');
      needs.push('adrenaline');
    }

    // Sporadic sessions + switching genres = seeking novelty
    if (metrics.readingPattern === 'sporadic' && metrics.genresVisitedLast24h.length > 3) {
      needs.push('variety');
      needs.push('discovery');
    }

    // Consistent reading + same genres = knowledge/mastery
    if (metrics.readingPattern === 'consistent') {
      needs.push('immersion');
      needs.push('continuity');
    }

    // Early morning (6-9 AM) = energetic start
    if (timeOfDay === 'morning') {
      needs.push('motivation');
      needs.push('inspiration');
    }

    // Afternoon + moderate speed = balanced engagement
    if (timeOfDay === 'afternoon' && metrics.avgSecondsPerPage > 15 && metrics.avgSecondsPerPage < 35) {
      needs.push('balance');
    }

    // Dark genres at night = cathartic needs
    if (timeOfDay === 'night' && 
        (metrics.genresVisitedLast24h.includes('psychological') || 
         metrics.genresVisitedLast24h.includes('horror'))) {
      needs.push('catharsis');
    }

    return needs.length > 0 ? needs : ['balance']; // Default to balanced
  }

  /**
   * Calculate reading intensity on 0-100 scale
   */
  private calculateReadingIntensity(metrics: MoodMetrics): number {
    let intensity = 0;

    // Speed factor (0-30 points)
    intensity += (3 - metrics.avgSecondsPerPage / 20) * 10;

    // Session duration factor (0-25 points)
    intensity += Math.min(metrics.averageSessionLength / 2, 25);

    // Pages read factor (0-25 points)
    intensity += Math.min(metrics.totalPagesLast24h / 10, 25);

    // Session frequency factor (0-20 points)
    intensity += Math.min(metrics.sessionsLast24h * 5, 20);

    return Math.max(0, Math.min(100, intensity));
  }

  /**
   * Infer what mood the user is in
   */
  private inferCurrentMood(
    metrics: MoodMetrics,
    sessionType: string,
    emotionalNeeds: string[]
  ): 'energetic' | 'calm' | 'melancholic' | 'curious' | 'stressed' {
    if (sessionType === 'binge') return 'energetic';
    if (emotionalNeeds.includes('comfort')) return 'calm';
    if (emotionalNeeds.includes('catharsis')) return 'melancholic';
    if (emotionalNeeds.includes('discovery')) return 'curious';
    if (metrics.avgSecondsPerPage < 8) return 'stressed'; // Very fast = stressed?
    return 'calm'; // Default
  }

  /**
   * Calculate confidence in our mood detection (0-100)
   */
  private calculateConfidence(metrics: MoodMetrics): number {
    let confidence = 50; // Base

    // More data = more confidence
    if (metrics.sessionsLast24h >= 3) confidence += 20;
    if (metrics.totalPagesLast24h >= 50) confidence += 15;
    if (metrics.genresVisitedLast24h.length >= 2) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Get time of day category
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Get average mood from last N hours
   */
  getAverageMoodLastHours(hours: number = 24): ReadingMoodProfile | null {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const relevantMoods = this.moodHistory.filter(h => h.timestamp > cutoff);

    if (relevantMoods.length === 0) return null;

    // Average emotional needs
    const allNeeds: string[] = [];
    relevantMoods.forEach(m => allNeeds.push(...m.mood.emotionalNeeds));
    const uniqueNeeds = [...new Set(allNeeds)];

    // Most common mood
    const moodCounts: Record<string, number> = {};
    relevantMoods.forEach(m => {
      moodCounts[m.mood.currentMood] = (moodCounts[m.mood.currentMood] || 0) + 1;
    });
    const currentMood = (Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm') as any;

    // Average intensity
    const avgIntensity = relevantMoods.reduce((sum, m) => sum + m.mood.readingIntensity, 0) / relevantMoods.length;

    return {
      emotionalNeeds: uniqueNeeds,
      readingIntensity: Math.round(avgIntensity),
      currentMood,
      scrollSpeed: relevantMoods[relevantMoods.length - 1].mood.scrollSpeed,
      sessionType: relevantMoods[relevantMoods.length - 1].mood.sessionType,
      confidence: Math.round(relevantMoods.reduce((sum, m) => sum + m.mood.confidence, 0) / relevantMoods.length),
      timeOfDay: this.getTimeOfDay(),
      sessionDuration: relevantMoods[relevantMoods.length - 1].mood.sessionDuration,
    };
  }

  /**
   * Get mood trends (detecting changes over time)
   */
  getMoodTrends() {
    const last6Hours = this.getAverageMoodLastHours(6);
    const last24Hours = this.getAverageMoodLastHours(24);

    return {
      current: last6Hours,
      daily: last24Hours,
      trendingToward: this.calculateTrend(),
    };
  }

  /**
   * Calculate mood trend (is user getting more intense? More calm?)
   */
  private calculateTrend() {
    if (this.moodHistory.length < 2) return 'stable';

    const recent = this.moodHistory.slice(-5);
    const avgRecentIntensity = recent.reduce((sum, m) => sum + m.mood.readingIntensity, 0) / recent.length;
    const avgOlderIntensity = this.moodHistory.slice(-10, -5).reduce((sum, m) => sum + m.mood.readingIntensity, 0) / Math.max(1, this.moodHistory.slice(-10, -5).length);

    const diff = avgRecentIntensity - avgOlderIntensity;

    if (Math.abs(diff) < 5) return 'stable';
    if (diff > 15) return 'intensifying';
    if (diff < -15) return 'calming_down';
    return 'shifting';
  }

  /**
   * Save mood history to localStorage
   */
  private saveHistory(): void {
    try {
      const recent = this.moodHistory.slice(-100); // Keep last 100
      localStorage.setItem(HISTORY_KEY, JSON.stringify(recent));
    } catch (err) {
      console.error('[MoodDetector] Failed to save history:', err);
    }
  }

  /**
   * Load mood history from localStorage
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        this.moodHistory = JSON.parse(stored);
      }
    } catch (err) {
      console.error('[MoodDetector] Failed to load history:', err);
      this.moodHistory = [];
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.moodHistory = [];
    localStorage.removeItem(HISTORY_KEY);
  }
}

// Singleton
let instance: MoodDetectorEngine | null = null;

export function getMoodDetectorEngine(): MoodDetectorEngine {
  if (!instance) {
    instance = new MoodDetectorEngine();
  }
  return instance;
}
