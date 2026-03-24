/**
 * ManhwaWeb API Service
 * 
 * REST API provider for manhwa content in Spanish.
 * Used as a fallback for titles blocked/licensed on MangaDex.
 * API Base: https://manhwawebbackend-production.up.railway.app
 * 
 * Endpoints:
 *   /manhwa/library   - Search & Browse (paginated)
 *   /manhwa/nuevos    - Home data + Weekly/Global Tops
 *   /manhwa/see/{id}  - Manga details + chapter list
 *   /chapters/see/{id}-{num} - Chapter images
 *   /manhwa/rank      - Rankings
 */

const API_BASE = 'https://manhwawebbackend-production.up.railway.app';
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

async function apiFetch(endpoint: string): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const resp = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
  if (!resp.ok) throw new Error(`ManhwaWeb API Error: ${resp.status}`);
  return resp.json();
}

export const manhwawebService = {

  /**
   * Search manhwa by title and filters
   */
  async searchManga(query: string, filters: any = {}) {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (query) params.append('buscar', query);
      params.append('page', '0');
      
      // Map app filters to ManhwaWeb API filters
      if (filters.status) {
        const statusMap: any = { 'ongoing': 'Activo', 'completed': 'Finalizado' };
        if (statusMap[filters.status]) params.append('estado', statusMap[filters.status]);
      }
      if (filters.demographic) {
        const demoMap: any = { 'shonen': 'shonen', 'shoujo': 'shoujo', 'seinen': 'seinen', 'josei': 'josei' };
        if (demoMap[filters.demographic]) params.append('demografia', demoMap[filters.demographic]);
      }

      const data = await apiFetch(`/manhwa/library?${params.toString()}`);
      const items = data?.data || [];
      if (!Array.isArray(items)) return [];

      return items.slice(0, 20).map((m: any) => ({
        id: `mweb:${m._id || m.id_manhwa || m.slug || m.real_id}`,
        type: 'manga',
        attributes: {
          title: { 
            en: m.the_real_name || m.name_esp || m.name || m.nombre || 'Sin título', 
            es: m.name_esp || m.the_real_name || m.nombre || '' 
          },
          originalLanguage: 'ko',
          status: m._status === 'finalizado' || m._estado === 'Finalizado' ? 'completed' : 'ongoing',
          tags: (m._generos || m._categoris || []).map((g: any, i: number) => ({
            id: `g-${i}`,
            attributes: { name: { en: String(g), es: String(g) }, group: 'genre' }
          }))
        },
        relationships: [{
          type: 'cover_art',
          attributes: { fileName: m._imagen || m.imagen || '' }
        }],
        _mwebCover: m._imagen || m.imagen || '',
        _mwebSlug: m._id || m.id_manhwa || m.slug || m.real_id
      }));
    } catch (err) {
      console.warn('[ManhwaWeb] Search failed:', err);
      return [];
    }
  },

  /**
   * Get manga details by slug
   */
  async getMangaDetails(slug: string) {
    const cleanSlug = slug.replace('mweb:', '');
    const data = await apiFetch(`/manhwa/see/${cleanSlug}`);
    if (!data) throw new Error('No data');

    const title = data.the_real_name || data.name_esp || data.name || data.nombre || '';
    const cover = data._imagen || data.imagen || '';

    return {
      data: {
        id: `mweb:${cleanSlug}`,
        type: 'manga',
        attributes: {
          title: { en: title, es: data.name_esp || title },
          description: { es: data._sinopsis || '', en: data._sinopsis || '' },
          originalLanguage: 'ko',
          status: data._estado === 'Finalizado' || data._status === 'finalizado' ? 'completed' : 'ongoing',
          tags: (data._generos || data._categoris || []).map((g: any, i: number) => ({
            id: `g-${i}`,
            attributes: { name: { en: String(g), es: String(g) }, group: 'genre' }
          }))
        },
        relationships: [{
          type: 'cover_art',
          attributes: { fileName: cover }
        }],
        _mwebCover: cover
      }
    };
  },

  /**
   * Get chapters for a manga
   */
  async getMangaChapters(slug: string) {
    const cleanSlug = slug.replace('mweb:', '');
    const data = await apiFetch(`/manhwa/see/${cleanSlug}`);
    if (!data?.chapters) return { data: [], total: 0 };

    const chapters = (Array.isArray(data.chapters) ? data.chapters : [])
      .map((ch: any) => {
        const rawNum = String(ch.numero || ch.chapter || ch.name || '0');
        // Extract only the numeric part (e.g. "Capitulo 15" -> "15")
        const match = rawNum.match(/(\d+(\.\d+)?)/);
        const num = match ? match[1] : rawNum;
        
        return {
          id: `mweb:${cleanSlug}-${num}`,
          type: 'chapter',
          attributes: {
            chapter: String(num),
            title: ch.titulo || ch.title || `Capítulo ${num}`,
            translatedLanguage: 'es'
          }
        };
      })
      .sort((a: any, b: any) => parseFloat(a.attributes.chapter) - parseFloat(b.attributes.chapter));

    return { data: chapters, total: chapters.length };
  },

  /**
   * Get chapter page images
   */
  async getChapterPages(chapterId: string): Promise<{ pages: string[] }> {
    const cleanId = chapterId.replace('mweb:', '');
    const data = await apiFetch(`/chapters/see/${cleanId}`);
    
    if (!data?.chapter?.img) {
      console.warn('[ManhwaWeb] No images found for chapter:', cleanId);
      return { pages: [] };
    }

    const pages = data.chapter.img
      .filter((url: string) => url && url.startsWith('http'))
      .map((url: string) => `${PROXY_URL}${encodeURIComponent(url)}`);
    return { pages };
  },

  /**
   * Get single chapter metadata
   */
  async getChapter(chapterId: string): Promise<any> {
    const cleanId = chapterId.replace('mweb:', '');
    const data = await apiFetch(`/chapters/see/${cleanId}`);
    
    return {
      data: {
        id: chapterId,
        type: 'chapter',
        attributes: {
          chapter: data?.chapter?.chapter_number || '1',
          title: data?.chapter?.name || '',
          translatedLanguage: 'es'
        },
        relationships: [
          { 
            id: `mweb:${data?.chapter?.manhwa_link || ''}`, 
            type: 'manga',
            attributes: { originalLanguage: 'ko' } 
          }
        ]
      }
    };
  },

  /**
   * Get weekly top manhwas
   */
  async getTopWeekly(): Promise<any[]> {
    try {
      const data = await apiFetch('/manhwa/nuevos');
      const weeklyTop = data?.top?.manhwas_esp || [];
      return weeklyTop.map((m: any) => {
        let id = m.id_manhwa || m._id || m.slug || m.link || m.real_id;
        if (typeof id === 'string' && id.includes('/')) {
            const parts = id.split('/');
            id = parts[parts.length - 1]; // Take only the slug part
        }
        return {
          id: `mweb:${id}`,
          attributes: {
            title: { en: m.name || m.the_real_name || '', es: m.name || '' },
            originalLanguage: 'ko'
          },
          _mwebCover: m.imagen || m._imagen || '',
          _mwebSlug: id
        };
      });
    } catch (err) {
      console.warn('[ManhwaWeb] Top weekly failed:', err);
      return [];
    }
  },

  /**
   * Get global/all-time top manhwas
   */
  async getTopGlobal(): Promise<any[]> {
    try {
      const data = await apiFetch('/manhwa/nuevos');
      const globalTop = data?.top?.manhwas_raw || [];
      return globalTop.map((m: any) => {
        let id = m.id_manhwa || m._id || m.slug || m.link || m.real_id;
        if (typeof id === 'string' && id.includes('/')) {
            const parts = id.split('/');
            id = parts[parts.length - 1];
        }
        return {
          id: `mweb:${id}`,
          attributes: {
            title: { en: m.name || m.the_real_name || '', es: m.name || '' },
            originalLanguage: 'ko'
          },
          _mwebCover: m.imagen || m._imagen || '',
          _mwebSlug: id
        };
      });
    } catch (err) {
      console.warn('[ManhwaWeb] Top global failed:', err);
      return [];
    }
  },

  /**
   * Check if an ID belongs to ManhwaWeb
   */
  isManhwaWebId(id: string): boolean {
    return id.startsWith('mweb:');
  },

  /**
   * Get cover URL for a ManhwaWeb manga
   */
  getCoverUrl(manga: any): string {
    const rawUrl = manga?._mwebCover || '';
    if (!rawUrl) return '';
    return `${PROXY_URL}${encodeURIComponent(rawUrl)}`;
  }
};
