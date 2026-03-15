/**
 * Consumet API Service — Servidor Fansub (Extendido)
 * 
 * Uses the public Consumet Meta AniList endpoint to search, fetch chapters,
 * and read pages from alternative manga providers.
 * 
 * All IDs returned are prefixed with "consumet-" so the rest of the app
 * can distinguish them from MangaDex IDs.
 */

// Smart URL: local uses Vite proxy to bypass CORS, production uses direct URL
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const CONSUMET_BASE = isLocalhost 
  ? '/api-consumet/meta/anilist-manga' 
  : 'https://api.consumet.org/meta/anilist-manga';

export const consumetService = {

  /**
   * Search manga via Consumet (uses AniList metadata + multiple providers)
   */
  async searchManga(query: string) {
    try {
      const response = await fetch(`${CONSUMET_BASE}/${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`Consumet API Error: ${response.status}`);
      const data = await response.json();

      if (!data.results || data.results.length === 0) return [];

      return data.results.map((manga: any) => ({
        id: `consumet-${manga.id}`,
        attributes: {
          title: {
            en: manga.title?.english || manga.title?.romaji || manga.title?.native || 'Sin Título',
          },
          originalLanguage: (manga.countryOfOrigin || 'JP').toLowerCase() === 'jp' ? 'ja' : (manga.countryOfOrigin || 'ja').toLowerCase(),
          status: manga.status || 'unknown',
          description: { en: manga.description || '' },
          tags: (manga.genres || []).map((g: string, i: number) => ({
            id: `genre-${i}`,
            attributes: { name: { en: g }, group: 'genre' }
          })),
        },
        relationships: [],
        _consumet: {
          rawId: manga.id,
          image: manga.image,
          cover: manga.cover || manga.image,
          title: manga.title?.romaji || manga.title?.english || '',
          rating: manga.rating,
          releaseDate: manga.releaseDate,
        }
      }));
    } catch (error) {
      console.error('[Fansub] Error buscando:', error);
      return [];
    }
  },

  /**
   * Get trending/popular manga from AniList via Consumet
   */
  async getTrending(limit = 15) {
    try {
      const response = await fetch(`${CONSUMET_BASE}/popular`);
      if (!response.ok) throw new Error(`Consumet Trending Error: ${response.status}`);
      const data = await response.json();

      if (!data.results || data.results.length === 0) return [];

      return data.results.slice(0, limit).map((manga: any) => ({
        id: `consumet-${manga.id}`,
        attributes: {
          title: {
            en: manga.title?.english || manga.title?.romaji || manga.title?.native || 'Sin Título',
          },
          originalLanguage: (manga.countryOfOrigin || 'JP').toLowerCase() === 'jp' ? 'ja' : (manga.countryOfOrigin || 'ja').toLowerCase(),
          status: manga.status || 'unknown',
          tags: (manga.genres || []).map((g: string, i: number) => ({
            id: `genre-${i}`,
            attributes: { name: { en: g }, group: 'genre' }
          })),
        },
        relationships: [],
        _consumet: {
          rawId: manga.id,
          image: manga.image,
          cover: manga.cover || manga.image,
          title: manga.title?.romaji || manga.title?.english || '',
          rating: manga.rating,
        }
      }));
    } catch (error) {
      console.error('[Fansub] Error trayendo tendencias:', error);
      return [];
    }
  },

  /**
   * Get manga info + chapter list from Consumet
   */
  async getMangaInfo(consumetId: string) {
    try {
      const rawId = consumetId.replace('consumet-', '');
      const response = await fetch(`${CONSUMET_BASE}/info/${rawId}`);
      if (!response.ok) throw new Error(`Consumet Info Error: ${response.status}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Fansub] Info error:', error);
      return null;
    }
  },

  /**
   * Get chapters formatted to match MangaDex structure
   */
  async getChapters(consumetId: string) {
    try {
      const info = await this.getMangaInfo(consumetId);
      if (!info || !info.chapters || info.chapters.length === 0) {
        return { data: [], total: 0, mangaInfo: info };
      }

      const chapters = info.chapters.map((ch: any) => ({
        id: `consumet-ch-${ch.id}`,
        attributes: {
          chapter: ch.chapterNumber || ch.title?.match(/Chapter\s*(\d+)/)?.[1] || '?',
          title: ch.title || `Capítulo ${ch.chapterNumber || '?'}`,
          readableAt: new Date().toISOString(),
          pages: ch.pages || 1,
          externalUrl: null,
          translatedLanguage: 'en',
        },
        relationships: [],
        _consumet: { rawChapterId: ch.id }
      }));

      return { data: chapters, total: chapters.length, mangaInfo: info };
    } catch (error) {
      console.error('[Fansub] Chapters error:', error);
      return { data: [], total: 0, mangaInfo: null };
    }
  },

  /**
   * Get chapter page images
   */
  async getChapterPages(consumetChapterId: string) {
    try {
      const rawId = consumetChapterId.replace('consumet-ch-', '');
      const response = await fetch(`${CONSUMET_BASE}/read?chapterId=${encodeURIComponent(rawId)}`);
      if (!response.ok) throw new Error(`Consumet Read Error: ${response.status}`);
      const data = await response.json();

      if (!data || data.length === 0) return { pages: [], hash: '', baseUrl: '' };

      const pages = data.map((page: any) => page.img);
      return { pages, hash: 'consumet', baseUrl: '' };
    } catch (error) {
      console.error('[Fansub] Pages error:', error);
      return { pages: [], hash: '', baseUrl: '' };
    }
  },

  /**
   * Get cover URL for Consumet manga (already optimized by AniList CDN)
   */
  getCoverUrl(manga: any): string {
    if (manga?._consumet?.image) return manga._consumet.image;
    if (manga?._consumet?.cover) return manga._consumet.cover;
    return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
  },

  isConsumetId(id: string): boolean {
    return id.startsWith('consumet-');
  },

  isConsumetChapterId(id: string): boolean {
    return id.startsWith('consumet-ch-');
  }
};
