/**
 * useCharacterDex - React hook for character collection and discovery
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCharacterDexEngine, CharacterProfile, UserCharacterCollection, CharacterMatch } from '../services/characterDexEngine';

export interface CharacterDexState {
  favorites: UserCharacterCollection[];
  stats: {
    totalFavorites: number;
    averageRating: number;
    topCharacters: UserCharacterCollection[];
    charactersByManga: Record<string, number>;
    archetypeCounts: Record<string, number>;
  };
  loading: boolean;
}

export function useCharacterDex() {
  const [state, setState] = useState<CharacterDexState>({
    favorites: [],
    stats: {
      totalFavorites: 0,
      averageRating: 0,
      topCharacters: [],
      charactersByManga: {},
      archetypeCounts: {}
    },
    loading: false
  });

  const engine = useMemo(() => getCharacterDexEngine(), []);

  /**
   * Refresh collection and stats
   */
  const refreshCollection = useCallback(() => {
    const favorites = engine.getFavorites();
    const stats = engine.getCollectionStats();

    setState({
      favorites,
      stats,
      loading: false
    });
  }, [engine]);

  /**
   * Add character to favorites
   */
  const addToFavorites = useCallback((character: CharacterProfile, rating: 1 | 2 | 3 | 4 | 5 = 5, notes: string = '') => {
    engine.addToFavorites(character, rating, notes);
    refreshCollection();
  }, [engine, refreshCollection]);

  /**
   * Remove character from favorites
   */
  const removeFromFavorites = useCallback((characterId: string) => {
    engine.removeFromFavorites(characterId);
    refreshCollection();
  }, [engine, refreshCollection]);

  /**
   * Update character rating
   */
  const updateRating = useCallback((characterId: string, rating: 1 | 2 | 3 | 4 | 5) => {
    engine.updateRating(characterId, rating);
    refreshCollection();
  }, [engine, refreshCollection]);

  /**
   * Find similar characters
   */
  const findSimilar = useCallback((characterId: string, limit?: number): CharacterMatch[] => {
    return engine.findSimilarCharacters(characterId, limit);
  }, [engine]);

  /**
   * Get characters by manga
   */
  const getCharactersByManga = useCallback((mangaId: string): CharacterProfile[] => {
    return engine.getCharactersByManga(mangaId);
  }, [engine]);

  /**
   * Search by traits
   */
  const searchByTraits = useCallback((traits: string[]): CharacterProfile[] => {
    return engine.searchByTraits(traits);
  }, [engine]);

  /**
   * Check if character is in favorites
   */
  const isFavorite = useCallback((characterId: string): boolean => {
    return state.favorites.some(f => f.characterId === characterId);
  }, [state.favorites]);

  /**
   * Get favorite rating
   */
  const getFavoriteRating = useCallback((characterId: string): 1 | 2 | 3 | 4 | 5 | null => {
    const fav = state.favorites.find(f => f.characterId === characterId);
    return fav ? fav.favoriteRating : null;
  }, [state.favorites]);

  // Load on mount
  useEffect(() => {
    setState(prev => ({ ...prev, loading: true }));
    refreshCollection();
  }, [refreshCollection]);

  return {
    // State
    favorites: state.favorites,
    stats: state.stats,
    loading: state.loading,

    // Actions
    addToFavorites,
    removeFromFavorites,
    updateRating,
    findSimilar,
    getCharactersByManga,
    searchByTraits,

    // Queries
    isFavorite,
    getFavoriteRating,
    refreshCollection
  };
}
