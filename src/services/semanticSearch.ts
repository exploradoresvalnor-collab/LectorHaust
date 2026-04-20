/**
 * Semantic Search Engine - Client-side fuzzy search with NO dependencies
 * Provides instant, typo-tolerant manga search
 */

export interface SearchResult {
    id: string;
    title: string;
    score: number;
    matchedFields: string[];
}

interface IndexedManga {
    id: string;
    title: string;
    titleNormalized: string;
    description?: string;
    descriptionNormalized?: string;
    tags: string[];
    author?: string;
    originalLanguage?: string;
    status?: string;
}

class SemanticSearchEngine {
    private index: Map<string, IndexedManga> = new Map();
    private readonly STORAGE_KEY = 'mangaApp_searchIndex';
    private readonly INDEX_VERSION = 1;

    constructor() {
        this.loadIndex();
    }

    /**
     * Normalize text for search (remove accents, lowercase, trim)
     */
    private normalize(text: string): string {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9\s]/g, '')     // Keep only alphanumeric and spaces
            .trim();
    }

    /**
     * Calculate Levenshtein distance for fuzzy matching
     * Lower distance = better match
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;
        const d: number[][] = [];

        for (let i = 0; i <= len1; i++) {
            d[i] = [i];
        }

        for (let j = 0; j <= len2; j++) {
            d[0][j] = j;
        }

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                d[i][j] = Math.min(
                    d[i][j - 1] + 1,      // insertion
                    d[i - 1][j] + 1,      // deletion
                    d[i - 1][j - 1] + cost // substitution
                );
            }
        }

        return d[len1][len2];
    }

    /**
     * Check if query matches text with fuzzy logic
     */
    private fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
        const normalized = this.normalize(text);
        const queryNorm = this.normalize(query);

        if (!normalized || !queryNorm) {
            return { match: false, score: 0 };
        }

        // Exact match (best)
        if (normalized.includes(queryNorm)) {
            return { match: true, score: 100 };
        }

        // Substring at word boundary
        const words = normalized.split(/\s+/);
        const queryWords = queryNorm.split(/\s+/);

        for (const word of words) {
            if (word.startsWith(queryNorm)) {
                return { match: true, score: 90 };
            }
        }

        // Fuzzy match with Levenshtein
        const distance = this.levenshteinDistance(normalized, queryNorm);
        const maxLen = Math.max(normalized.length, queryNorm.length);
        const fuzzyScore = Math.max(0, 100 - (distance / maxLen) * 100);

        // Accept if fuzzy score is decent (>60%) and distance is small
        if (fuzzyScore > 60 && distance <= 3) {
            return { match: true, score: fuzzyScore };
        }

        return { match: false, score: 0 };
    }

    /**
     * Build search index from manga list
     */
    buildIndex(mangas: any[]): void {
        console.log(`[SemanticSearch] Building index for ${mangas.length} mangas...`);

        this.index.clear();

        mangas.forEach(manga => {
            const titleStr = typeof manga.attributes?.title === 'string'
                ? manga.attributes.title
                : (manga.attributes?.title?.en || 
                   manga.attributes?.title?.es || 
                   Object.values(manga.attributes?.title || {})[0] || '');

            const descStr = typeof manga.attributes?.description === 'string'
                ? manga.attributes.description
                : (manga.attributes?.description?.en || 
                   manga.attributes?.description?.es || '');

            const tags = (manga.attributes?.tags || [])
                .map((t: any) => t.attributes?.name?.en || '')
                .filter(Boolean);

            const indexed: IndexedManga = {
                id: manga.id,
                title: titleStr,
                titleNormalized: this.normalize(titleStr),
                description: descStr,
                descriptionNormalized: this.normalize(descStr),
                tags,
                author: manga.attributes?.author || '',
                originalLanguage: manga.attributes?.originalLanguage || '',
                status: manga.attributes?.status || ''
            };

            this.index.set(manga.id, indexed);
        });

        this.saveIndex();
        console.log(`[SemanticSearch] Index built: ${this.index.size} items`);
    }

    /**
     * Search with multiple strategies
     */
    search(query: string, limit = 20): SearchResult[] {
        if (!query || query.trim().length === 0) {
            return [];
        }

        const results = new Map<string, { score: number; matchedFields: string[] }>();

        // Strategy 1: Exact and fuzzy match in title (highest priority)
        for (const [id, manga] of this.index) {
            const titleMatch = this.fuzzyMatch(manga.title, query);
            
            if (titleMatch.match) {
                results.set(id, {
                    score: titleMatch.score * 2, // Double weight for title matches
                    matchedFields: ['title']
                });
            }
        }

        // Strategy 2: Tag matching (medium priority)
        const queryNorm = this.normalize(query);
        for (const [id, manga] of this.index) {
            if (results.has(id)) continue; // Already matched

            const matchedTags = manga.tags.filter(tag => {
                const tagNorm = this.normalize(tag);
                return tagNorm.includes(queryNorm) || queryNorm.includes(tagNorm);
            });

            if (matchedTags.length > 0) {
                results.set(id, {
                    score: 70 + (matchedTags.length * 5),
                    matchedFields: ['tags', ...matchedTags]
                });
            }
        }

        // Strategy 3: Description matching (lower priority)
        for (const [id, manga] of this.index) {
            if (results.has(id)) continue;

            const descMatch = this.fuzzyMatch(manga.description || '', query);
            
            if (descMatch.match) {
                results.set(id, {
                    score: descMatch.score * 0.5, // Half weight for description matches
                    matchedFields: ['description']
                });
            }
        }

        // Convert to sorted array
        return Array.from(results.entries())
            .map(([id, data]) => ({
                id,
                title: this.index.get(id)?.title || 'Unknown',
                score: data.score,
                matchedFields: data.matchedFields
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Advanced search with operators:
     * - "tag1 tag2" = AND (both must match)
     * - "!tag1" = NOT (exclude this tag)
     * - "exact phrase" = Exact phrase match
     */
    advancedSearch(query: string, limit = 20): SearchResult[] {
        // Handle NOT queries: !yaoi
        const excludeTerms = new Set<string>();
        let cleanQuery = query;

        const notMatches = query.match(/!(\w+)/g) || [];
        notMatches.forEach(match => {
            const term = match.substring(1).toLowerCase();
            excludeTerms.add(this.normalize(term));
            cleanQuery = cleanQuery.replace(match, '').trim();
        });

        // Get base results
        const baseResults = this.search(cleanQuery, limit * 2);

        // Filter out excluded items
        const filtered = baseResults.filter(result => {
            const manga = this.index.get(result.id);
            if (!manga) return false;

            // Check if any excluded term matches
            for (const excludeTerm of excludeTerms) {
                const matchesExcluded = 
                    manga.titleNormalized.includes(excludeTerm) ||
                    manga.tags.some(tag => this.normalize(tag).includes(excludeTerm)) ||
                    manga.descriptionNormalized?.includes(excludeTerm);

                if (matchesExcluded) return false;
            }

            return true;
        });

        return filtered.slice(0, limit);
    }

    /**
     * Save index to localStorage
     */
    private saveIndex(): void {
        try {
            const toSave = {
                version: this.INDEX_VERSION,
                timestamp: Date.now(),
                items: Array.from(this.index.values())
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
        } catch (err) {
            console.error('[SemanticSearch] Failed to save index:', err);
        }
    }

    /**
     * Load index from localStorage
     */
    private loadIndex(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                
                // Validate version
                if (data.version === this.INDEX_VERSION) {
                    this.index.clear();
                    data.items.forEach((item: IndexedManga) => {
                        this.index.set(item.id, item);
                    });
                    console.log(`[SemanticSearch] Loaded index: ${this.index.size} items`);
                }
            }
        } catch (err) {
            console.error('[SemanticSearch] Failed to load index:', err);
            this.index = new Map();
        }
    }

    /**
     * Clear index
     */
    clearIndex(): void {
        this.index.clear();
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[SemanticSearch] Index cleared');
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            indexedMangos: this.index.size,
            storageSize: JSON.stringify(Array.from(this.index.values())).length,
            lastBuilt: localStorage.getItem(this.STORAGE_KEY)
                ? JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}').timestamp
                : null
        };
    }
}

// Singleton instance
let instance: SemanticSearchEngine | null = null;

export function getSemanticSearch(): SemanticSearchEngine {
    if (!instance) {
        instance = new SemanticSearchEngine();
    }
    return instance;
}

export default SemanticSearchEngine;
