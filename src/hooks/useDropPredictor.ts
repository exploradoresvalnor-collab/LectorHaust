/**
 * useDropPredictor - React hook for predicting series abandonment
 * Monitors user reading patterns and alerts about at-risk series
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDropPredictorEngine, DropPrediction, ReadingConsistency } from '../services/dropPredictorEngine';
import { getReadingTracker } from '../services/readingTracker';

export interface DropPredictorState {
  predictions: DropPrediction[];
  criticalRisk: DropPrediction[];
  highRisk: DropPrediction[];
  loading: boolean;
  lastAnalyzedAt: number | null;
}

export function useDropPredictor() {
  const [state, setState] = useState<DropPredictorState>({
    predictions: [],
    criticalRisk: [],
    highRisk: [],
    loading: false,
    lastAnalyzedAt: null
  });

  const engine = useMemo(() => getDropPredictorEngine(), []);
  const tracker = useMemo(() => getReadingTracker(), []);

  /**
   * Analyze all manga in user's reading history for dropout risk
   */
  const analyzeMangaRisks = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // Get all sessions grouped by manga
      const allSessions: Map<string, any[]> = new Map();
      
      // For now, we'll simulate this by checking localStorage
      // In a real app, this would come from a database query
      const stored = localStorage.getItem('mangaApp_readingSessions');
      if (stored) {
        const sessions = JSON.parse(stored);
        
        // Group by mangaId
        Object.values(sessions).forEach((session: any) => {
          if (!allSessions.has(session.mangaId)) {
            allSessions.set(session.mangaId, []);
          }
          allSessions.get(session.mangaId)!.push(session);
        });
      }

      // Run predictions
      const predictions = engine.predictDropoutsForUser(allSessions);
      engine.savePredictionSnapshot(predictions);

      // Split by risk level
      const criticalRisk = predictions.filter(p => p.riskLevel === 'critical');
      const highRisk = predictions.filter(p => p.riskLevel === 'high');

      setState({
        predictions,
        criticalRisk,
        highRisk,
        loading: false,
        lastAnalyzedAt: Date.now()
      });
    } catch (err) {
      console.error('[useDropPredictor] Analysis failed:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [engine]);

  /**
   * Get detailed consistency analysis for a specific manga
   */
  const analyzeMangaConsistency = useCallback((mangaId: string): ReadingConsistency | null => {
    try {
      const stored = localStorage.getItem('mangaApp_readingSessions');
      if (!stored) return null;

      const sessions = JSON.parse(stored);
      const mangaSessions = Object.values(sessions).filter((s: any) => s.mangaId === mangaId) as any[];

      if (mangaSessions.length === 0) return null;

      return engine.analyzeConsistency(
        mangaId,
        mangaSessions[0].mangaTitle || mangaId,
        mangaSessions
      );
    } catch (err) {
      console.error('[useDropPredictor] Consistency analysis failed:', err);
      return null;
    }
  }, [engine]);

  /**
   * Get intervention suggestions for a specific series
   */
  const getInterventionStrategy = useCallback((mangaId: string): string[] => {
    const prediction = state.predictions.find(p => p.mangaId === mangaId);
    if (!prediction) return [];

    const strategies: string[] = [];

    if (prediction.riskLevel === 'critical') {
      strategies.push('Send urgent re-engagement notification');
      strategies.push('Offer "return bonus" if applicable');
      strategies.push('Highlight 3 most popular recent chapters');
    }

    if (prediction.riskLevel === 'high') {
      strategies.push('Send friendly reminder about new chapters');
      strategies.push('Recommend similar series if reader is struggling');
      strategies.push('Feature in "Continue Reading" section prominently');
    }

    if (prediction.keyIndicators.includes('Reading stopped suddenly')) {
      strategies.push('Check for story issues in recent chapters');
      strategies.push('Show community reactions to recent updates');
    }

    if (prediction.keyIndicators.includes('Reading speed dropped by 50%+')) {
      strategies.push('Suggest lighter reading material');
      strategies.push('Offer reading goals/challenges');
    }

    return strategies.length > 0 ? strategies : prediction.recommendations;
  }, [state.predictions]);

  /**
   * Predict if user will complete a specific series
   */
  const predictCompletion = useCallback((mangaId: string, totalChapters: number): number => {
    const consistency = analyzeMangaConsistency(mangaId);
    if (!consistency) return 0;

    // Simple heuristic: completion % based on risk and chapters read
    const riskFactor = (100 - consistency.dropRiskScore) / 100;
    const progressFactor = consistency.totalChaptersRead / Math.max(totalChapters, 1);
    const completionProbability = (riskFactor * 0.6 + Math.min(progressFactor, 1) * 0.4) * 100;

    return Math.min(100, Math.round(completionProbability));
  }, [analyzeMangaConsistency]);

  /**
   * Get series that need immediate attention
   */
  const getSeriesNeedingAttention = useCallback((): DropPrediction[] => {
    return state.criticalRisk.concat(
      state.highRisk.slice(0, 3) // Top 3 high-risk
    );
  }, [state.criticalRisk, state.highRisk]);

  /**
   * Run analysis on mount and every hour
   */
  useEffect(() => {
    analyzeMangaRisks();

    // Re-analyze every hour
    const interval = setInterval(analyzeMangaRisks, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [analyzeMangaRisks]);

  return {
    // State
    predictions: state.predictions,
    criticalRisk: state.criticalRisk,
    highRisk: state.highRisk,
    loading: state.loading,
    lastAnalyzedAt: state.lastAnalyzedAt,

    // Methods
    analyzeMangaRisks,
    analyzeMangaConsistency,
    getInterventionStrategy,
    predictCompletion,
    getSeriesNeedingAttention,

    // Computed
    totalAtRisk: state.predictions.filter(p => p.riskScore >= 50).length,
    criticalCount: state.criticalRisk.length,
    hasAlerts: state.criticalRisk.length > 0
  };
}
