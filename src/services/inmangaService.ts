import { proxyService } from './proxyService';

/**
 * InManga Service
 * Official Spanish source with direct JSON API (internal).
 */

const BASE_URL = 'https://inmanga.com';
const API_BASE = 'https://inmanga.com';

export const inmangaService = {
  
  async searchManga(query: string) {
    try {
      // InManga uses a POST request for search with specific filters
      const url = `${API_BASE}/manga/getMangasConsultResult`;
      
      const formData = new URLSearchParams();
      formData.append('filter[generes][]', '-1');
      formData.append('filter[queryString]', query);
      formData.append('filter[skip]', '0');
      formData.append('filter[take]', '10');
      formData.append('filter[sortby]', '1');
      formData.append('filter[broadcastStatus]', '0');
      formData.append('filter[onlyFavorites]', 'false');

      const rawText = await proxyService.fetchProxied(url, 'html', {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
      });
      
      if (!rawText || rawText.trim().startsWith('<!DOCTYPE')) {
          console.warn('[InManga] Server returned HTML instead of JSON. Source might be protected or down.');
          return [];
      }

      let data;
      try {
          data = JSON.parse(rawText);
      } catch (e) {
          console.warn('[InManga] Failed to parse JSON response:', e);
          return [];
      }
      
      if (!data || !data.result) return [];

      let results = data.result;
      if (typeof results === 'string') {
          try {
              results = JSON.parse(results);
          } catch (e) { return []; }
      }

      if (!Array.isArray(results)) return [];

      return results.map((m: any) => {
        // Try to extract year from various date fields if available
        let extractedYear = null;
        const dateStr = m.LastPublicationDate || m.RegistrationDate || '';
        const yearMatch = dateStr.match(/\d{4}/);
        if (yearMatch) extractedYear = yearMatch[0];

        return {
          id: `inm:${m.Identification}`,
          type: 'manga',
          attributes: {
            title: { es: m.Name },
            description: { es: '' },
            status: m.Status || 'ongoing',
            originalLanguage: 'ja',
            year: extractedYear,
            lastChapter: m.LastChapterNumber?.toString(),
            coverUrl: `${BASE_URL}/thumbnails/manga/${m.Name.replace(/\s+/g, '-')}/${m.Identification}`
          },
          source: 'inmanga'
        };
      });
    } catch (err) {
      console.error('[InManga] Search failed:', err);
      return [];
    }
  },

  async getMangaDetails(id: string) {
    const cleanId = id.replace(/^(inm:)+/, '');
    
    try {
      // We need the name/slug for some operations, but we can usually get by with just the ID
      // To get full details (description), we might need to scrape the page
      // https://inmanga.com/ver/manga/Name/ID
      
      // For now, let's return basic info and let enrichment handle the rest
      return {
        data: {
          id: `inm:${cleanId}`,
          type: 'manga',
          attributes: {
            title: { es: 'Cargando...' },
            description: { es: '' },
            status: 'ongoing',
            originalLanguage: 'ja',
            tags: []
          }
        }
      };
    } catch (err) {
      console.error('[InManga] Get details failed:', err);
      throw err;
    }
  },

  async getMangaChapters(mangaId: string) {
    const cleanId = mangaId.replace(/^(inm:)+/, '');
    
    try {
      // https://inmanga.com/chapter/getChapters?mangaIdentification=UUID
      const url = `${API_BASE}/chapter/getChapters?mangaIdentification=${cleanId}`;
      const rawText = await proxyService.fetchProxied(url, 'html', {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      
      if (!rawText || rawText.trim().startsWith('<!DOCTYPE')) {
          return { data: [], total: 0 };
      }

      let data;
      try {
          data = JSON.parse(rawText);
      } catch (e) {
          return { data: [], total: 0 };
      }
      
      if (!data || !data.result) return { data: [], total: 0 };

      let chapters = data.result;
      if (typeof chapters === 'string') {
          try {
              chapters = JSON.parse(chapters);
          } catch (e) { return { data: [], total: 0 }; }
      }

      if (!Array.isArray(chapters)) return { data: [], total: 0 };

      const mapped = chapters.map((c: any) => {
        const chNum = c.Number != null ? String(c.Number) : '0';
        return {
          id: `inm:${cleanId}$${c.Identification}$${chNum}`,
          attributes: {
            chapter: chNum,
            title: c.FriendlyChapterNumber || `Capítulo ${chNum}`,
            translatedLanguage: 'es',
            pagesCount: c.PagesCount || 0
          }
        };
      });

      // Sort by chapter number descending
      mapped.sort((a, b) => parseFloat(b.attributes.chapter) - parseFloat(a.attributes.chapter));

      return {
        data: mapped,
        total: mapped.length
      };
    } catch (err) {
      console.error('[InManga] Get chapters failed:', err);
      return { data: [], total: 0 };
    }
  },

  // Cache de capítulos para evitar re-descargas masivas
  _chaptersCache: new Map<string, any[]>(),

  async getChapterPages(fullId: string) {
    // fullId: inm:MANGA_ID$CHAPTER_ID$CHAPTER_NUMBER
    const cleanId = fullId.replace(/^(inm:)+/, '');
    const parts = cleanId.split('$');
    if (parts.length < 3) throw new Error('Invalid InManga Chapter ID');
    
    const mangaId = parts[0];
    const chapterId = parts[1];
    const chapterNum = parts[2];
    
    try {
      let pageCount = 0;

      // 1. Intentar obtener el pageCount del cache primero
      const cached = this._chaptersCache.get(mangaId);
      if (cached) {
        const ch = cached.find(c => c.id === fullId || c.id === `inm:${fullId}`);
        if (ch) pageCount = ch.attributes.pagesCount || 0;
      }

      // 2. Si no hay cache, hacer la petición (y guardar en cache)
      if (pageCount === 0) {
        const chaptersRes = await this.getMangaChapters(mangaId);
        if (chaptersRes.data && chaptersRes.data.length > 0) {
          this._chaptersCache.set(mangaId, chaptersRes.data);
          const currentChapter = chaptersRes.data.find((c: any) => c.id === fullId || c.id === `inm:${fullId}`);
          pageCount = currentChapter?.attributes.pagesCount || 0;
        }
      }

      // 3. Si aún no tenemos pageCount, intentar con un rango razonable (probe hasta 100)
      if (pageCount === 0) {
        console.warn('[InManga] Page count unknown, probing up to 60 pages...');
        pageCount = 60; // Fallback razonable
      }

      const pages = [];
      for (let i = 1; i <= pageCount; i++) {
        const imageUrl = `https://pack-yak.inmanga.com/manga/page/Image/${mangaId}/${chapterId}/${i}`;
        pages.push(proxyService.proxyUrl(imageUrl, 'image'));
      }

      return {
        pages,
        total: pages.length
      };
    } catch (err) {
      console.error('[InManga] Get pages failed:', err);
      throw err;
    }
  }
};
