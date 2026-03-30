/**
 * WeebCentral Service
 * Powerhouse for Manhvas and Manhuas (Solo Leveling, etc.)
 * Provides high-availability content when MangaDex/MangaPill fails.
 */

const BASE_URL = 'https://weebcentral.com';
const PROXY_BASE = 'https://manga-proxy.mchaustman.workers.dev/';

export const weebcentralService = {
  
  async fetchHtml(url: string) {
    const finalUrl = `${PROXY_BASE}?url=${encodeURIComponent(url)}`;
    // REMOVED custom headers to avoid CORS Preflight blocks
    const response = await fetch(finalUrl);
    if (!response.ok) throw new Error(`WeebCentral fetch failed: ${response.status}`);
    return await response.text();
  },

  async searchManga(query: string, filters: { status?: string, origin?: string, order?: string } = {}) {
    // Search endpoint discovered via browser research
    // https://weebcentral.com/search/data?author=&text=Solo+Leveling&sort=Best+Match&order=Ascending&status=&type=&official=&anime=&adult=&mini=true
    
    let statusParam = '';
    if (filters.status) {
      const statusMap: Record<string, string> = {
        'ongoing': 'Ongoing',
        'completed': 'Completed',
        'hiatus': 'Hiatus',
        'cancelled': 'Canceled'
      };
      statusParam = statusMap[filters.status] || '';
    }

    let typeParam = '';
    if (filters.origin) {
      const typeMap: Record<string, string> = {
        'ja': 'Manga',
        'ko': 'Manhwa',
        'zh': 'Manhua'
      };
      typeParam = typeMap[filters.origin] || '';
    }

    let sortParam = 'Best+Match';
    if (filters.order) {
      const sortMap: Record<string, string> = {
        'relevance': 'Best+Match',
        'followedCount': 'Most+Follows',
        'latestUploadedChapter': 'Latest+Updates',
        'rating': 'Best+Match'
      };
      sortParam = sortMap[filters.order] || 'Best+Match';
    }

    const url = `${BASE_URL}/search/data?text=${encodeURIComponent(query)}&sort=${sortParam}&order=Ascending&status=${statusParam}&type=${typeParam}&mini=true`;
    const html = await this.fetchHtml(url);
    
    // Pattern: <a href="https://weebcentral.com/series/01J76XYCPSY3C4BNPBRY8JMCBE/Solo-Leveling">
    // Result includes image and title in a grid
    const matches = [...html.matchAll(/href="https:\/\/weebcentral.com\/series\/([^/"]+)\/([^/"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    
    return matches.map(m => {
      const id = m[1];
      const slug = m[2];
      const content = m[3];
      
      // Extract title: <img ... alt="Solo Leveling"
      const titleMatch = content.match(/alt="([^"]+)"/);
      const title = titleMatch ? titleMatch[1] : slug.replace(/-/g, ' ');
      
      // Extract cover: src="https://hot.planeptune.us/manga/Solo-Leveling.png"
      const coverMatch = content.match(/src="([^"]+)"/);
      const cover = coverMatch ? coverMatch[1] : '';

      return {
        id: `wc:${id}$${slug}`,
        attributes: {
          title: { en: title },
          description: { en: '' }, // Details fetched later
          status: filters.status || 'ongoing',
          originalLanguage: filters.origin || 'ko' // Default to ko if searched on weebcentral
        },
        relationships: cover ? [{
          type: 'cover_art',
          attributes: { fileName: `${PROXY_BASE}?image=${encodeURIComponent(cover)}` }
        }] : []
      };
    });
  },

  async getMangaDetails(fullId: string) {
    const [id, slug] = fullId.replace('wc:', '').split('$');
    const url = `${BASE_URL}/series/${id}/${slug}`;
    const html = await this.fetchHtml(url);
    
    // Extract description from meta or specific div
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    const description = descMatch ? descMatch[1] : '';

    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ');

    const coverMatch = html.match(/src="(https:\/\/hot\.planeptune\.us\/manga\/[^"]+)"/);
    const cover = coverMatch ? coverMatch[1] : '';

    return {
      data: {
        id: `wc:${id}$${slug}`,
        attributes: {
          title: { en: title },
          description: { en: description },
          status: 'ongoing'
        },
        relationships: cover ? [{
          type: 'cover_art',
          attributes: { fileName: `${PROXY_BASE}?image=${encodeURIComponent(cover)}` }
        }] : [],
        source: 'weebcentral' as const
      }
    };
  },

  async getMangaChapters(fullId: string) {
    const [id, slug] = fullId.replace('wc:', '').split('$');
    // HTMX endpoint for full chapter list
    const url = `${BASE_URL}/series/${id}/full-chapter-list`;
    const html = await this.fetchHtml(url);
    
    // Pattern: href="https://weebcentral.com/chapters/01J76XZ666GREP4DQDKEP1YDZG"><span>Chapter 200</span>
    const matches = [...html.matchAll(/href=['"]https:\/\/weebcentral.com\/chapters\/([^'"]+)['"]>\s*<span>Chapter\s*([\d.]+)</g)];
    
    const chapters = matches.map(m => ({
      id: `wc:${id}$${slug}$${m[1]}`, // COMPLEX ID: wc:SERIES_ID$SLUG$CHAPTER_ID
      attributes: {
        chapter: m[2],
        title: `Chapter ${m[2]}`,
        translatedLanguage: 'en'
      }
    }));

    return {
      data: chapters,
      total: chapters.length
    };
  },

  async getChapterPages(fullChapterId: string) {
    const parts = fullChapterId.replace('wc:', '').split('$');
    const id = parts.length > 2 ? parts[2] : parts[0]; 
    const url = `${BASE_URL}/chapters/${id}`;
    const html = await this.fetchHtml(url);
    
    // Pattern: <img alt="Chapter 200 Page 1" ... src="https://hot.planeptune.us/manga/Solo-Leveling/0200-001.png" />
    const imgMatches = [...html.matchAll(/src=['"](https:\/\/hot\.planeptune\.us\/manga\/[^'"]+)['"]/g)];
    
    const pages = [...new Set(imgMatches.map(m => m[1]))]
      .map(url => `${PROXY_BASE}?image=${encodeURIComponent(url)}`);

    return {
      pages,
      total: pages.length
    };
  }
};
