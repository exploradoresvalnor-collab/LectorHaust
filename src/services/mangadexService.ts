/**
 * MangaDex API Service
 */

const BASE_URL = 'https://api.mangadex.org';
const IMAGE_PROXY_URL = ''; // Se puede configurar un proxy como https://cors-anywhere.herokuapp.com/ si es necesario
const CLOUDINARY_CLOUD_NAME = 'djzak5yb2';

/**
 * Simple rate limiter: ensures minimum 200ms between requests (≤5 req/s)
 */
let lastRequestTime = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 200) {
        await new Promise(r => setTimeout(r, 200 - elapsed));
    }
    lastRequestTime = Date.now();
    return fetch(url);
}

/**
 * Helper to fetch from MangaDex using proxy if needed
 */
async function apiFetch(endpoint: string) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const targetUrl = IMAGE_PROXY_URL ? `${IMAGE_PROXY_URL}${encodeURIComponent(url)}` : url;
    const response = await rateLimitedFetch(targetUrl);
    if (!response.ok) throw new Error(`MangaDex API Error: ${response.status}`);
    return response.json();
}

export interface Manga {
    id: string;
    attributes: {
        title: { [key: string]: string };
        description: { [key: string]: string };
        status: string;
        originalLanguage: string;
        tags: Array<{
            attributes: {
                name: { [key: string]: string };
            };
        }>;
    };
    relationships: Array<{
        id: string;
        type: string;
        attributes?: any;
    }>;
}

export const mangadexService = {
    /**
     * Search for manga with various filters
     */
    async searchManga(query: string, filters: { origin?: string, lang?: string, tags?: string[] } = {}, limit = 20, offset = 0) {
        let url = `/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive`;
        
        if (query) {
            url += `&title=${encodeURIComponent(query)}`;
        }

        if (filters.origin) {
            url += `&originalLanguage[]=${filters.origin}`;
        }

        if (filters.lang) {
            url += `&availableTranslatedLanguage[]=${filters.lang}`;
        }

        if (filters.tags && filters.tags.length > 0) {
            // Common MangaDex Genre UUIDs
            const GENRE_UUIDS: Record<string, string> = {
                'action': '391b0423-d847-456f-aff0-8b0cfc03066b',
                'romance': '423e2eae-a7a2-4a8b-ac03-a8351462d71d',
                'fantasy': 'cdc58593-87dd-415e-bbc0-2ec27bf404cc',
                'comedy': '4d32cc48-9f00-4cca-9b5a-a839f0764984',
                'slice of life': 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9',
                'drama': 'b9af3a63-f058-46de-a9a0-e0c13906197a',
                'sci-fi': '256c8bd9-4904-4360-bf4f-508a76d67183',
                'mystery': 'ee968100-4191-4968-93d3-f82d72be7e46',
                'horror': 'cdad7e68-1419-41dd-bdce-27753074a640',
                'thriller': '07251805-a27e-4d59-b469-f980d8e14f56',
                'isekai': 'ace04997-f6bd-436e-b261-779182193d3d'
            };
            
            filters.tags.forEach(tag => {
                const uuid = GENRE_UUIDS[tag.toLowerCase()];
                if (uuid) {
                    url += `&includedTags[]=${uuid}`;
                }
            });
        }

        return apiFetch(url);
    },

    /**
     * Get popular manga filtered by language and origin
     */
    async getPopularManga(origin: string | null = null, lang = 'es', limit = 12, offset = 0, genre: string | null = null) {
        let url = `/manga?limit=${limit}&offset=${offset}&hasAvailableChapters=true&contentRating[]=safe&contentRating[]=suggestive&order[followedCount]=desc&includes[]=cover_art`;
        
        if (lang) {
            url += `&availableTranslatedLanguage[]=${lang}`;
            if (lang === 'es') {
                url += `&availableTranslatedLanguage[]=es-la`;
            }
        }

        if (genre) {
            url += `&includedTags[]=${genre}`;
        }

        if (origin) {
            const langMap: { [key: string]: string } = { 
                'JP': 'ja', 
                'KR': 'ko', 
                'CN': 'zh'
            };
            const originValue = langMap[origin] || origin;
            url += `&originalLanguage[]=${originValue.toLowerCase()}`;
        }

        try {
            const data = await apiFetch(url);
            
            // If zero results with language filter, retry without it to show SOMETHING
            // but log a warning.
            if ((!data.data || data.data.length === 0) && lang) {
                console.warn(`[MangaDex] No ${origin || ''} manga found in ${lang}. Retrying without language filter...`);
                const retryUrl = url
                    .replace(`&availableTranslatedLanguage[]=${lang}`, '')
                    .replace(`&availableTranslatedLanguage[]=es-la`, '');
                return await apiFetch(retryUrl);
            }
            return data;
        } catch (err) {
            console.error('Error fetching popular manga:', err);
            throw err;
        }
    },

    /**
     * Get latest chapters
     */
    async getLatestChapters(limit = 12, offset = 0, lang: string | null = null) {
        let url = `/chapter?limit=${limit}&offset=${offset}&contentRating[]=safe&contentRating[]=suggestive&order[readableAt]=desc&includes[]=manga`;
        
        if (lang === 'es') {
            // Include both Spain and Latin American Spanish
            url += `&translatedLanguage[]=es&translatedLanguage[]=es-la`;
        } else if (lang) {
            url += `&translatedLanguage[]=${lang}`;
        } else {
            url += `&translatedLanguage[]=es-la&translatedLanguage[]=es&translatedLanguage[]=en`;
        }
        
        return apiFetch(url);
    },

    /**
     * Get manga details by ID
     */
    async getMangaDetails(id: string) {
        return apiFetch(`/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`);
    },

    /**
     * Get chapters for a specific manga
     */
    async getMangaChapters(mangaId: string, lang: string | string[] = 'es', limit = 500, offset = 0, orderDir: 'asc' | 'desc' = 'desc') {
        let url = `/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&order[volume]=${orderDir}&order[chapter]=${orderDir}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&includes[]=scanlation_group`;
        
        if (lang) {
            let langsArray = Array.isArray(lang) ? lang : [lang];
            
            // If they asked for 'es', proactively include 'es-la' so we don't miss LATAM chapters
            if (langsArray.includes('es') && !langsArray.includes('es-la')) {
                langsArray.push('es-la');
            }

            langsArray.forEach(l => url += `&translatedLanguage[]=${l}`);
        }

        return apiFetch(url);
    },

    /**
     * Get chapter pages (At-Home server)
     */
    async getChapterPages(chapterId: string, quality: 'data' | 'data-saver' = 'data') {
        const resp = await apiFetch(`/at-home/server/${chapterId}`);
        const { baseUrl, chapter } = resp;
        const files = quality === 'data-saver' ? chapter.dataSaver : chapter.data;
        const pageUrls = files.map((file: string) => {
            const rawUrl = `${baseUrl}/${quality}/${chapter.hash}/${file}`;
            return mangadexService.getOptimizedUrl(rawUrl);
        });
        return { pages: pageUrls, hash: chapter.hash, baseUrl };
    },

    /**
     * Get chapter details by ID
     */
    async getChapter(id: string) {
        return apiFetch(`/chapter/${id}?includes[]=manga`);
    },

    /**
     * Helper to get cover URL (with optional thumbnail size: 256 or 512)
     */
    getCoverUrl(manga: any, size?: 256 | 512) {
        try {
            if (!manga || !manga.relationships) return 'https://via.placeholder.com/256x384.png?text=Sin+Portada';
            
            const coverRel = manga.relationships.find((r: any) => r.type === 'cover_art');
            const fileName = coverRel?.attributes?.fileName;
            
            if (fileName) {
                const base = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
                const rawUrl = size ? `${base}.${size}.jpg` : base;
                return mangadexService.getOptimizedUrl(rawUrl);
            }
        } catch (err) {
            console.warn('[MangaDex] Error generating cover URL:', err);
        }
        return 'https://via.placeholder.com/256x384.png?text=Sin+Portada';
    },

    /**
     * Get manga statistics (rating, follows) from MangaDex
     */
    async getMangaStatistics(mangaId: string) {
        try {
            const data = await apiFetch(`/statistics/manga/${mangaId}`);
            const stats = data.statistics?.[mangaId];
            return {
                rating: stats?.rating?.bayesian || stats?.rating?.average || null,
                follows: stats?.follows || 0
            };
        } catch (err) {
            console.warn('[MangaDex] Failed to fetch statistics:', err);
            return { rating: null, follows: 0 };
        }
    },

    /**
     * Find MangaDex ID by title (for AniList mapping)
     */
    async fetchMangaDexIdByTitle(title: string) {
        try {
            const url = `/manga?title=${encodeURIComponent(title)}&limit=1&order[relevance]=desc`;
            const data = await apiFetch(url);
            if (data.data && data.data.length > 0) {
                return data.data[0].id;
            }
        } catch (err) {
            console.error(`Error searching MangaDex for title "${title}":`, err);
        }
        return null;
    },

    /**
     * Get recommendations based on tags or high rating
     */
    async getRecommendations(tags: string[] = [], limit = 10) {
        let url = `/manga?limit=${limit}&includes[]=cover_art&contentRating[]=safe&contentRating[]=suggestive&order[rating]=desc`;
        
        if (tags.length > 0) {
            tags.forEach(tag => {
                url += `&includedTags[]=${tag}`;
            });
        }

        try {
            const data = await apiFetch(url);
            return data.data || [];
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            return [];
        }
    },

    /**
     * Helper to proxy URLs if configured
     */
    getProxiedUrl(url: string) {
        if (!IMAGE_PROXY_URL) return url;
        return `${IMAGE_PROXY_URL}${encodeURIComponent(url)}`;
    },

    /**
     * Get optimized URL via Cloudinary Fetch
     */
    getOptimizedUrl(url: string) {
        if (!CLOUDINARY_CLOUD_NAME || !url) return url;
        // Avoid double-prefixing if already optimized
        if (url.includes('res.cloudinary.com')) return url;
        
        // Skip Cloudinary for MangaDex At-Home nodes (mangadex.network)
        // Cloudinary fetch often fails with these temporary/volatile nodes (404)
        if (url.includes('mangadex.network')) {
            return url;
        }

        // f_auto: automatic format (webp/avif), q_auto: automatic quality, c_limit: limit size to original
        return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/f_auto,q_auto,c_limit/${encodeURIComponent(url)}`;
    },

    /**
     * Centralized cleaning for MangaDex descriptions
     */
    cleanDescription(text: string) {
        if (!text) return '';
        return text
            .split('\n---')[0] // Remove everything after the separator usually found in MD
            .replace(/\[.*\]\(http.*\)/g, '') // Remove markdown links like [Text](URL)
            .replace(/\*\*\*.*\*\*\*/g, '') // Remove italic/bold blocks
            .replace(/&nbsp;/g, ' ')
            .replace(/\r/g, '')
            .trim();
    },

    /**
     * Get localized description prioritizing Spanish
     */
    getLocalizedDescription(manga: any) {
        if (!manga?.attributes?.description) return 'No hay descripción disponible.';
        const desc = manga.attributes.description;
        const rawDesc = desc.es || desc['es-la'] || desc.en || Object.values(desc)[0] || '';
        return this.cleanDescription(rawDesc as string);
    },

    /**
     * Get localized title prioritizing English/Original
     */
    getLocalizedTitle(manga: any) {
        if (!manga?.attributes?.title) return 'Manga';
        const titles = manga.attributes.title;
        return titles.en || titles.ja || titles['ja-ro'] || Object.values(titles)[0];
    }
};
