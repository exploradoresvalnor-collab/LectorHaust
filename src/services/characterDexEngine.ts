/**
 * Character Dex Engine - Track and discover favorite characters across manga
 * Builds a personal character database with favorites and statistics
 */

export interface CharacterProfile {
  id: string;
  name: string;
  mangaId: string;
  mangaTitle: string;
  role: 'protagonist' | 'antagonist' | 'support' | 'minor';
  archetype: string; // e.g., "tsundere", "cool_guy", "mentor"
  description: string;
  imageUrl?: string;
  favoriteCount: number;
  lastSeenChapter: string;
  firstAppearedChapter: string;
  appearance: {
    height?: string;
    age?: string;
    gender?: string;
    hairColor?: string;
    eyeColor?: string;
  };
  traits: string[];
  relationships: Array<{ characterId: string; name: string; type: string }>;
  addedAt: number;
}

export interface UserCharacterCollection {
  characterId: string;
  name: string;
  mangaTitle: string;
  imageUrl?: string;
  favoriteRating: 1 | 2 | 3 | 4 | 5;
  notes: string;
  addedAt: number;
  lastUpdated: number;
}

export interface CharacterMatch {
  character1: CharacterProfile;
  character2: CharacterProfile;
  similarity: number; // 0-100
  sharedTraits: string[];
  reason: string;
}

class CharacterDexEngine {
  private readonly STORAGE_KEY = 'mangaApp_characterDex';
  private readonly COLLECTION_KEY = 'mangaApp_characterCollection';
  private characterDatabase: Map<string, CharacterProfile> = new Map();
  private userCollection: Map<string, UserCharacterCollection> = new Map();

  constructor() {
    this.loadDatabase();
    this.loadCollection();
  }

  /**
   * Load character database from storage
   */
  private loadDatabase(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([id, profile]: [string, any]) => {
          this.characterDatabase.set(id, profile);
        });
      }
    } catch (err) {
      console.error('[CharacterDex] Failed to load database:', err);
    }
  }

  /**
   * Load user's character collection
   */
  private loadCollection(): void {
    try {
      const stored = localStorage.getItem(this.COLLECTION_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([id, char]: [string, any]) => {
          this.userCollection.set(id, char);
        });
      }
    } catch (err) {
      console.error('[CharacterDex] Failed to load collection:', err);
    }
  }

  /**
   * Add character to user's favorite collection
   */
  addToFavorites(character: CharacterProfile, rating: 1 | 2 | 3 | 4 | 5 = 5, notes: string = ''): void {
    const collectionItem: UserCharacterCollection = {
      characterId: character.id,
      name: character.name,
      mangaTitle: character.mangaTitle,
      imageUrl: character.imageUrl,
      favoriteRating: rating,
      notes,
      addedAt: Date.now(),
      lastUpdated: Date.now()
    };

    this.userCollection.set(character.id, collectionItem);
    this.saveCollection();

    console.log(`[CharacterDex] Added ${character.name} to favorites`);
  }

  /**
   * Remove character from collection
   */
  removeFromFavorites(characterId: string): void {
    this.userCollection.delete(characterId);
    this.saveCollection();
  }

  /**
   * Update character rating
   */
  updateRating(characterId: string, rating: 1 | 2 | 3 | 4 | 5): void {
    const char = this.userCollection.get(characterId);
    if (char) {
      char.favoriteRating = rating;
      char.lastUpdated = Date.now();
      this.userCollection.set(characterId, char);
      this.saveCollection();
    }
  }

  /**
   * Get user's favorite characters
   */
  getFavorites(limit?: number): UserCharacterCollection[] {
    let favorites = Array.from(this.userCollection.values())
      .sort((a, b) => (b.favoriteRating - a.favoriteRating) || (b.addedAt - a.addedAt));

    if (limit) {
      favorites = favorites.slice(0, limit);
    }

    return favorites;
  }

  /**
   * Find similar characters based on traits and archetypes
   */
  findSimilarCharacters(characterId: string, limit = 5): CharacterMatch[] {
    const baseChar = this.characterDatabase.get(characterId);
    if (!baseChar) return [];

    const matches: CharacterMatch[] = [];

    this.characterDatabase.forEach((character, id) => {
      if (id === characterId) return;

      // Calculate similarity
      const sharedTraits = baseChar.traits.filter(t => character.traits.includes(t));
      const sameArchetype = baseChar.archetype === character.archetype ? 20 : 0;
      const sameRole = baseChar.role === character.role ? 15 : 0;

      const traitSimilarity = (sharedTraits.length / Math.max(baseChar.traits.length, character.traits.length)) * 40;
      const similarity = Math.round(traitSimilarity + sameArchetype + sameRole);

      if (similarity >= 40) {
        matches.push({
          character1: baseChar,
          character2: character,
          similarity,
          sharedTraits,
          reason: this.generateSimilarityReason(baseChar, character, sharedTraits)
        });
      }
    });

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Generate human-readable reason for similarity
   */
  private generateSimilarityReason(char1: CharacterProfile, char2: CharacterProfile, sharedTraits: string[]): string {
    if (char1.archetype === char2.archetype) {
      return `Ambos son ${char1.archetype}`;
    }

    if (sharedTraits.length > 0) {
      return `Comparten los rasgos: ${sharedTraits.slice(0, 2).join(', ')}`;
    }

    return 'Personajes similares';
  }

  /**
   * Get characters from a specific manga
   */
  getCharactersByManga(mangaId: string): CharacterProfile[] {
    return Array.from(this.characterDatabase.values())
      .filter(c => c.mangaId === mangaId)
      .sort((a, b) => {
        // Sort by role importance
        const roleOrder = { protagonist: 0, antagonist: 1, support: 2, minor: 3 };
        return roleOrder[a.role] - roleOrder[b.role];
      });
  }

  /**
   * Find characters by trait or archetype
   */
  searchByTraits(traits: string[]): CharacterProfile[] {
    return Array.from(this.characterDatabase.values())
      .filter(c => traits.some(t => c.traits.includes(t) || c.archetype === t))
      .sort((a, b) => {
        // Sort by relevance
        const aMatches = traits.filter(t => a.traits.includes(t) || a.archetype === t).length;
        const bMatches = traits.filter(t => b.traits.includes(t) || b.archetype === t).length;
        return bMatches - aMatches;
      });
  }

  /**
   * Get statistics about character collection
   */
  getCollectionStats(): {
    totalFavorites: number;
    averageRating: number;
    topCharacters: UserCharacterCollection[];
    charactersByManga: Record<string, number>;
    archetypeCounts: Record<string, number>;
  } {
    const favorites = Array.from(this.userCollection.values());

    // Calculate average rating
    const averageRating = favorites.length > 0
      ? favorites.reduce((sum, c) => sum + c.favoriteRating, 0) / favorites.length
      : 0;

    // Count by manga
    const charactersByManga: Record<string, number> = {};
    favorites.forEach(c => {
      charactersByManga[c.mangaTitle] = (charactersByManga[c.mangaTitle] || 0) + 1;
    });

    // Count archetypes
    const archetypeCounts: Record<string, number> = {};
    Array.from(this.characterDatabase.values()).forEach(c => {
      // Only count if in user's favorites
      if (this.userCollection.has(c.id)) {
        archetypeCounts[c.archetype] = (archetypeCounts[c.archetype] || 0) + 1;
      }
    });

    // Get top characters
    const topCharacters = favorites
      .sort((a, b) => b.favoriteRating - a.favoriteRating)
      .slice(0, 5);

    return {
      totalFavorites: favorites.length,
      averageRating: Math.round(averageRating * 10) / 10,
      topCharacters,
      charactersByManga,
      archetypeCounts
    };
  }

  /**
   * Save collection to storage
   */
  private saveCollection(): void {
    try {
      const data = Object.fromEntries(this.userCollection);
      localStorage.setItem(this.COLLECTION_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[CharacterDex] Failed to save collection:', err);
    }
  }

  /**
   * Save database
   */
  saveDatabase(): void {
    try {
      const data = Object.fromEntries(this.characterDatabase);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[CharacterDex] Failed to save database:', err);
    }
  }

  /**
   * Add character to database (admin/sync function)
   */
  addCharacterToDatabase(character: CharacterProfile): void {
    this.characterDatabase.set(character.id, character);
    this.saveDatabase();
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.characterDatabase.clear();
    this.userCollection.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.COLLECTION_KEY);
    console.log('[CharacterDex] All data cleared');
  }
}

// Singleton instance
let instance: CharacterDexEngine | null = null;

export function getCharacterDexEngine(): CharacterDexEngine {
  if (!instance) {
    instance = new CharacterDexEngine();
  }
  return instance;
}

export default CharacterDexEngine;
