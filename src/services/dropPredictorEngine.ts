/**
 * Drop Predictor Engine - Predicts when users might abandon a series
 * Detects reading pattern changes and predicts dropout risk
 */

export interface ReadingConsistency {
  mangaId: string;
  mangaTitle: string;
  lastChapterRead: string;
  daysSinceLastRead: number;
  readingFrequency: 'daily' | 'weekly' | 'sporadic' | 'abandoned';
  avgReadingSpeed: number; // pages per minute
  lastReadingSpeed: number;
  speedChange: number; // percentage change
  sessionsLast7Days: number;
  sessionsLast30Days: number;
  totalChaptersRead: number;
  dropRiskScore: number; // 0-100
  dropReason: string[];
  suggestedIntervention: string;
}

export interface DropPrediction {
  mangaId: string;
  title: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  predictedDaysUntilAbandonment: number;
  keyIndicators: string[];
  recommendations: string[];
}

class DropPredictorEngine {
  private readonly STORAGE_KEY = 'mangaApp_dropPrediction';
  private readonly MIN_CHAPTERS_TO_PREDICT = 2; // Need at least 2 chapters to analyze
  private readonly HIGH_RISK_THRESHOLD = 75;
  private readonly MEDIUM_RISK_THRESHOLD = 50;

  /**
   * Analyze reading consistency for a specific manga
   */
  analyzeConsistency(
    mangaId: string,
    mangaTitle: string,
    readingSessions: any[]
  ): ReadingConsistency {
    if (readingSessions.length === 0) {
      return {
        mangaId,
        mangaTitle,
        lastChapterRead: 'Unknown',
        daysSinceLastRead: 0,
        readingFrequency: 'abandoned',
        avgReadingSpeed: 0,
        lastReadingSpeed: 0,
        speedChange: 0,
        sessionsLast7Days: 0,
        sessionsLast30Days: 0,
        totalChaptersRead: 0,
        dropRiskScore: 0,
        dropReason: [],
        suggestedIntervention: 'No reading history'
      };
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Sort by date (most recent first)
    const sortedSessions = [...readingSessions].sort((a, b) => b.lastReadAt - a.lastReadAt);
    const latestSession = sortedSessions[0];

    // Calculate time metrics
    const daysSinceLastRead = Math.floor((now - latestSession.lastReadAt) / (24 * 60 * 60 * 1000));
    const sessionsLast7Days = readingSessions.filter(s => s.lastReadAt > sevenDaysAgo).length;
    const sessionsLast30Days = readingSessions.filter(s => s.lastReadAt > thirtyDaysAgo).length;

    // Determine reading frequency
    let readingFrequency: 'daily' | 'weekly' | 'sporadic' | 'abandoned' = 'sporadic';
    if (daysSinceLastRead > 30) readingFrequency = 'abandoned';
    else if (daysSinceLastRead > 14) readingFrequency = 'sporadic';
    else if (sessionsLast7Days >= 3) readingFrequency = 'daily';
    else if (sessionsLast7Days >= 1) readingFrequency = 'weekly';

    // Calculate reading speeds
    const lastReadingSpeed = this.calculateReadingSpeed(latestSession);
    const avgReadingSpeed = readingSessions.length > 0
      ? readingSessions.reduce((sum, s) => sum + this.calculateReadingSpeed(s), 0) / readingSessions.length
      : 0;

    const speedChange = avgReadingSpeed > 0
      ? ((lastReadingSpeed - avgReadingSpeed) / avgReadingSpeed) * 100
      : 0;

    // Generate drop risk score
    const dropReason: string[] = [];
    let riskScore = 0;

    // Factor 1: Days since last read (0-30 points)
    if (daysSinceLastRead > 30) {
      riskScore += 30;
      dropReason.push('No reading for 1+ month');
    } else if (daysSinceLastRead > 14) {
      riskScore += 20;
      dropReason.push('No reading for 2+ weeks');
    } else if (daysSinceLastRead > 7) {
      riskScore += 10;
      dropReason.push('No reading for 1+ week');
    }

    // Factor 2: Reading frequency decline (0-25 points)
    if (sessionsLast30Days > 0 && sessionsLast7Days === 0) {
      riskScore += 25;
      dropReason.push('Reading stopped suddenly');
    } else if (sessionsLast30Days > sessionsLast7Days * 4) {
      riskScore += 15;
      dropReason.push('Frequency decreased significantly');
    }

    // Factor 3: Speed decline (0-20 points)
    if (speedChange < -50) {
      riskScore += 20;
      dropReason.push('Reading speed dropped by 50%+');
    } else if (speedChange < -30) {
      riskScore += 10;
      dropReason.push('Reading speed declining');
    }

    // Factor 4: Inconsistent sessions (0-15 points)
    if (readingSessions.length > 5) {
      const avgDaysBetweenSessions = this.calculateConsistencyVariance(readingSessions);
      if (avgDaysBetweenSessions > 10) {
        riskScore += 15;
        dropReason.push('Very inconsistent reading pattern');
      } else if (avgDaysBetweenSessions > 5) {
        riskScore += 8;
        dropReason.push('Inconsistent reading pattern');
      }
    }

    // Factor 5: Total chapters (only applies if low count + no progress)
    if (readingSessions.length <= 2 && daysSinceLastRead > 7) {
      riskScore += 10;
      dropReason.push('Stopped after few chapters');
    }

    // Suggested intervention
    let suggestedIntervention = '';
    if (readingFrequency === 'abandoned') {
      suggestedIntervention = 'Send revival notification with similar manga recommendations';
    } else if (readingFrequency === 'sporadic' && riskScore > 60) {
      suggestedIntervention = 'Recommend next chapter & similar series';
    } else if (speedChange < -40) {
      suggestedIntervention = 'Check if story difficulty is too high; suggest lighter manga';
    } else if (riskScore > 40) {
      suggestedIntervention = 'Send engagement notification about upcoming chapters';
    } else {
      suggestedIntervention = 'Monitor reading pattern';
    }

    return {
      mangaId,
      mangaTitle,
      lastChapterRead: latestSession.chapterNumber,
      daysSinceLastRead,
      readingFrequency,
      avgReadingSpeed: Math.round(avgReadingSpeed * 100) / 100,
      lastReadingSpeed: Math.round(lastReadingSpeed * 100) / 100,
      speedChange: Math.round(speedChange),
      sessionsLast7Days,
      sessionsLast30Days,
      totalChaptersRead: readingSessions.length,
      dropRiskScore: Math.min(100, riskScore),
      dropReason,
      suggestedIntervention
    };
  }

  /**
   * Predict dropout for multiple manga (user's library)
   */
  predictDropoutsForUser(allMangaReadingSessions: Map<string, any[]>): DropPrediction[] {
    const predictions: DropPrediction[] = [];

    allMangaReadingSessions.forEach((sessions, mangaId) => {
      if (sessions.length < this.MIN_CHAPTERS_TO_PREDICT) return;

      const consistency = this.analyzeConsistency(
        mangaId,
        sessions[0]?.mangaTitle || mangaId,
        sessions
      );

      // Only predict if there's some risk
      if (consistency.dropRiskScore < 30) return;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (consistency.dropRiskScore >= this.HIGH_RISK_THRESHOLD) riskLevel = 'critical';
      else if (consistency.dropRiskScore >= this.MEDIUM_RISK_THRESHOLD) riskLevel = 'high';
      else if (consistency.dropRiskScore >= 40) riskLevel = 'medium';
      else riskLevel = 'low';

      // Predict days until abandonment
      const predictedDaysUntilAbandonment = this.predictAbandonmentTimeline(consistency);

      // Generate recommendations
      const recommendations = this.generateRecommendations(consistency);

      predictions.push({
        mangaId,
        title: consistency.mangaTitle,
        riskLevel,
        riskScore: consistency.dropRiskScore,
        predictedDaysUntilAbandonment,
        keyIndicators: consistency.dropReason,
        recommendations
      });
    });

    // Sort by risk score (highest first)
    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Calculate reading speed (pages per minute)
   */
  private calculateReadingSpeed(session: any): number {
    if (!session.timeSpentMs || !session.totalPages) return 0;
    const minutes = session.timeSpentMs / 60000;
    return minutes > 0 ? session.totalPages / minutes : 0;
  }

  /**
   * Calculate consistency variance in days between sessions
   */
  private calculateConsistencyVariance(sessions: any[]): number {
    if (sessions.length < 2) return 0;

    const sorted = [...sessions].sort((a, b) => b.lastReadAt - a.lastReadAt);
    const daysBetweenSessions: number[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const daysDiff = (sorted[i].lastReadAt - sorted[i + 1].lastReadAt) / (24 * 60 * 60 * 1000);
      daysBetweenSessions.push(daysDiff);
    }

    if (daysBetweenSessions.length === 0) return 0;

    // Calculate variance
    const mean = daysBetweenSessions.reduce((a, b) => a + b, 0) / daysBetweenSessions.length;
    const variance = daysBetweenSessions.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / daysBetweenSessions.length;
    const stdDev = Math.sqrt(variance);

    return stdDev;
  }

  /**
   * Predict how many days until user abandons this series
   */
  private predictAbandonmentTimeline(consistency: ReadingConsistency): number {
    let daysUntilAbandonment = 365; // Default: 1 year

    if (consistency.readingFrequency === 'abandoned') {
      daysUntilAbandonment = 0;
    } else if (consistency.readingFrequency === 'sporadic') {
      // Average days between sessions
      daysUntilAbandonment = consistency.daysSinceLastRead + 14;
    } else if (consistency.readingFrequency === 'weekly') {
      daysUntilAbandonment = consistency.daysSinceLastRead + 30;
    } else if (consistency.readingFrequency === 'daily') {
      daysUntilAbandonment = 60; // Consistent readers rarely drop
    }

    // Adjust by speed change
    if (consistency.speedChange < -50) {
      daysUntilAbandonment = Math.min(7, daysUntilAbandonment);
    }

    return Math.max(0, daysUntilAbandonment);
  }

  /**
   * Generate specific recommendations to prevent dropout
   */
  private generateRecommendations(consistency: ReadingConsistency): string[] {
    const recommendations: string[] = [];

    if (consistency.daysSinceLastRead > 14) {
      recommendations.push('Send notification: "Ready to continue?"');
    }

    if (consistency.speedChange < -40) {
      recommendations.push('Suggest lighter manga or different genre');
      recommendations.push('Check if story complexity is too high');
    }

    if (consistency.readingFrequency === 'sporadic') {
      recommendations.push('Create reading goal for this series');
      recommendations.push('Recommend similar completed series');
    }

    if (consistency.totalChaptersRead <= 3) {
      recommendations.push('Highlight series popularity/reviews');
      recommendations.push('Show episode summary to hook reader');
    }

    if (consistency.sessionsLast30Days === 0) {
      recommendations.push('Offer "Return bonus" incentive');
      recommendations.push('Feature in "Continue Reading" section');
    }

    return recommendations.length > 0 ? recommendations : ['Monitor reading pattern'];
  }

  /**
   * Save prediction snapshot for analytics
   */
  savePredictionSnapshot(predictions: DropPrediction[]): void {
    try {
      const snapshot = {
        timestamp: Date.now(),
        predictions,
        totalAtRisk: predictions.filter(p => p.riskScore >= 50).length,
        criticalCount: predictions.filter(p => p.riskLevel === 'critical').length
      };

      const key = `${this.STORAGE_KEY}_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(snapshot));

      // Keep only last 30 snapshots
      this.cleanupOldSnapshots();
    } catch (err) {
      console.error('[DropPredictor] Failed to save snapshot:', err);
    }
  }

  /**
   * Clean up old prediction snapshots
   */
  private cleanupOldSnapshots(): void {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.STORAGE_KEY));
      if (keys.length > 30) {
        keys.slice(0, keys.length - 30).forEach(k => localStorage.removeItem(k));
      }
    } catch (err) {
      console.error('[DropPredictor] Cleanup failed:', err);
    }
  }

  /**
   * Get latest prediction snapshot
   */
  getLatestSnapshot(): any {
    try {
      const keys = Object.keys(localStorage)
        .filter(k => k.startsWith(this.STORAGE_KEY))
        .sort()
        .reverse();

      if (keys.length === 0) return null;

      const data = localStorage.getItem(keys[0]);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('[DropPredictor] Failed to get snapshot:', err);
      return null;
    }
  }

  /**
   * Export analytics
   */
  exportAnalytics(): string {
    return JSON.stringify({
      snapshots: Object.keys(localStorage)
        .filter(k => k.startsWith(this.STORAGE_KEY))
        .map(k => {
          const data = localStorage.getItem(k);
          return data ? JSON.parse(data) : null;
        })
        .filter(Boolean),
      exportDate: new Date().toISOString()
    }, null, 2);
  }
}

// Singleton instance
let instance: DropPredictorEngine | null = null;

export function getDropPredictorEngine(): DropPredictorEngine {
  if (!instance) {
    instance = new DropPredictorEngine();
  }
  return instance;
}

export default DropPredictorEngine;
