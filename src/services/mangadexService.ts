/**
 * MangaDex API Service
 */

// Eliminamos la validación de isLocalhost. 
// Ahora TODOS (Local y Vercel) usarán el proxy para evitar bloqueos de operadoras.
const API_BASE = '/api-md';
const UPLOADS_URL = 'https://uploads.mangadex.org';
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
 * Helper to construct proxied URLs for MangaDex
 */
function getProxyUrl(endpoint: string) {
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    return fullUrl;
}

/**
 * Helper to fetch from MangaDex using proxy with automatic retry for 500 errors
 */
async function apiFetch(endpoint: string, retries = 2) {
    const proxiedUrl = getProxyUrl(endpoint);
    try {
        const response = await rateLimitedFetch(proxiedUrl);
        
        // If 500 and we have retries, wait a bit and try again
        if (response.status === 500 && retries > 0) {
            console.warn(`[MangaDex] API 500 Error. Retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s
            return apiFetch(endpoint, retries - 1);
        }

        if (!response.ok) throw new Error(`MangaDex API Error: ${response.status}`);
        return response.json();
    } catch (err) {
        if (retries > 0) {
            console.warn(`[MangaDex] Network Error. Retrying... (${retries} left)`, err);
            await new Promise(r => setTimeout(r, 1000));
            return apiFetch(endpoint, retries - 1);
        }
        throw err;
    }
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

const LONG_STRIP_TAG_ID = '3e130c23-d63d-4c3d-b4a4-f0ea7df5711c';
const FOUR_KOMA_TAG_ID = 'b11fda93-8f1d-4bef-b2ed-8803d3733170';
const WEB_COMIC_TAG_ID = 'e197df38-d0e7-43b5-9b09-2842d0c326dd';
const COLOR_TAG_ID = 'f5ba401b-8e31-480a-98b5-9e90989d3325';
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
    'isekai': 'ace04997-f6bd-436e-b261-779182193d3d',
    'adventure': '87db829e-ada1-4581-bb9d-90977d5d7425',
    'sports': '69960289-ad1e-45e4-bf72-74574e57e330',
    'supernatural': 'e1215448-a0fd-44f3-9529-16a2d9c464c0',
    'psychological': '3b60b75c-a2d7-4860-8d7a-b76e002da81f',
    'historical': '33771934-abc2-4c8a-a435-0810dbce2062',
    'cooking': 'ea5863d0-31cd-496d-896c-1372337cca54',
    'music': 'ac728339-231b-427d-83b1-06158a0a575a',
    'mecha': '5088fe6a-1c07-4de4-82b3-ef37d6e6abb9',
    'school life': 'caaa44ca-6df5-428a-9a36-71eeab971ec3',
    'gore': 'b29d6a3d-1514-4da3-b0e6-3482d708ca6d',
    'crime': '5ca48418-4447-49f3-96b6-aae782fc492d',
    'magical girls': '81c83e12-bb9d-4344-93d3-78430f78994a',
    'medical': 'c8cbe35b-1b2b-4a3f-9c37-db84c4514856',
    'philosophical': 'b1e97889-25b4-4258-b28b-cd7f4d28ea9b',
    // Missing Spanish translations mapped for safety
    'música': 'f42fbf9e-188a-447b-9fdc-f19dc1e4d685',
    'cocina': 'ea2bc92d-1c26-4930-9b7c-d5c0dc1d6869',
    'deportes': '69b626e5-1981-4148-9f5b-fc13bf733732',
    'sobrenatural': 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75'
};

export const mangadexService = {
    /**
     * Determines the type of manga (Manga, Manhwa, Manhua, Webtoon, Diario)
     */
    getMangaType(manga: any): string {
        const origin = manga.attributes?.originalLanguage;
        const tags = manga.attributes?.tags || [];
        
        const isLongStrip = tags.some((t: any) => t.id === LONG_STRIP_TAG_ID || t.attributes?.name?.en === 'Long Strip');
        const isDaily = tags.some((t: any) => 
            t.id === FOUR_KOMA_TAG_ID || 
            t.id === WEB_COMIC_TAG_ID || 
            t.attributes?.name?.en === '4-Koma' || 
            t.attributes?.name?.en === 'Web Comic'
        );

        if (isLongStrip) return 'Webtoon';
        if (origin === 'ko') return 'Manhwa';
        if (origin === 'zh' || origin === 'zh-hk') return 'Manhua';
        return 'Manga';
    },

    // Internal helper to check if daily for variety logic
    isDailyManga(manga: any): boolean {
        const tags = manga.attributes?.tags || [];
        return tags.some((t: any) => 
            t.id === FOUR_KOMA_TAG_ID || 
            t.id === WEB_COMIC_TAG_ID || 
            t.attributes?.name?.en === '4-Koma' || 
            t.attributes?.name?.en === 'Web Comic'
        );
    },

    /**
     * Gets a localized language name
     */
    getLangName(lang: string): string {
        const names: Record<string, string> = {
            'ja': 'Japón',
            'ko': 'Corea',
            'zh': 'China',
            'zh-hk': 'China (HK)',
            'en': 'Inglés',
            'es': 'Español',
            'es-la': 'Español (Lat)'
        };
        return names[lang] || lang;
    },
    /**
     * Search for manga with various filters
     */
    async searchManga(query: string, filters: { origin?: string, lang?: string, tags?: string[], status?: string, demographic?: string, fullColor?: boolean } = {}, limit = 20, offset = 0, order?: any) {
        let url = `/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive`;
        
        if (query) {
            url += `&title=${encodeURIComponent(query)}`;
        }

        // BLIND SEARCH: Only show manga with available chapters in user's languages
        url += '&hasAvailableChapters=true';
        if (!filters.lang) {
            url += '&availableTranslatedLanguage[]=es&availableTranslatedLanguage[]=es-la&availableTranslatedLanguage[]=en';
        }

        if (order) {
            Object.keys(order).forEach(key => {
                url += `&order[${key}]=${order[key]}`;
            });
        }

        if (filters.origin) {
            url += `&originalLanguage[]=${filters.origin}`;
        }

        if (filters.lang) {
            url += `&availableTranslatedLanguage[]=${filters.lang}`;
        }

        if (filters.tags && filters.tags.length > 0) {
            filters.tags.forEach(tag => {
                const uuid = GENRE_UUIDS[tag.toLowerCase()] || tag;
                url += `&includedTags[]=${uuid}`;
            });
        }

        if (filters.fullColor) {
            url += `&includedTags[]=${COLOR_TAG_ID}`;
        }

        return apiFetch(url);
    },

    /**
     * Get popular manga filtered by language and origin
     */
    async getPopularManga(origin: string | null = null, lang: string | null = 'es', limit = 12, offset = 0, genre: string | null = null, fullColor = false): Promise<any> {
        let url = `/manga?limit=${limit}&offset=${offset}&hasAvailableChapters=true&contentRating[]=safe&contentRating[]=suggestive&order[followedCount]=desc&includes[]=cover_art`;
        
        if (lang) {
            url += `&availableTranslatedLanguage[]=${lang}`;
            if (lang === 'es') {
                url += `&availableTranslatedLanguage[]=es-la`;
            }
        }

        if (genre) {
            const uuid = GENRE_UUIDS[genre.toLowerCase()] || genre;
            url += `&includedTags[]=${uuid}`;
        }

        if (fullColor) {
            url += `&includedTags[]=${COLOR_TAG_ID}`;
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
                return await this.getPopularManga(origin, null as any, limit, offset, genre);
            }
            return data;
        } catch (err) {
            console.error('Error fetching popular manga:', err);
            throw err;
        }
    },

    /**
     * Deep Fetch: Gets completed mangas and strictly verifies if all published chapters 
     * are translated to the target language (default 'es').
     */
    async getFullyTranslatedMasterpieces(origin: string | null = null, lang: string | null = 'es', limit = 12, offset = 0, genre: string | null = null, fullColor = false): Promise<any> {
        // Lower limit pool to avoid 500 timeouts on complex queries
        const fetchLimit = limit * 2; 
        let url = `/manga?limit=${fetchLimit}&offset=${offset}&hasAvailableChapters=true&contentRating[]=safe&contentRating[]=suggestive&order[rating]=desc&includes[]=cover_art`;
        
        if (fullColor) {
            // Include both completed and ongoing for color content, as many finished manhwas are still ongoing in MD
            url += `&status[]=completed&status[]=ongoing`;
        } else {
            url += `&status[]=completed`;
        }
        
        const aggregatedLang = lang === 'es' ? ['es', 'es-la'] : [lang || 'en'];
        
        aggregatedLang.forEach(l => {
            url += `&availableTranslatedLanguage[]=${l}`;
        });

        if (genre) {
            const uuid = GENRE_UUIDS[genre.toLowerCase()] || genre;
            url += `&includedTags[]=${uuid}`;
        }

        if (fullColor) {
            url += `&includedTags[]=${COLOR_TAG_ID}`;
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
            const response = await apiFetch(url);
            if (!response.data || response.data.length === 0) {
                return { data: [], total: 0, offset };
            }

            const validMangas: any[] = [];

            // Parallel validation
            const validationPromises = response.data.map(async (manga: any) => {
                try {
                    const lastChapterStr = manga.attributes.lastChapter;
                    if (!lastChapterStr) return null; // If we don't know the end, discard it

                    const lastChapterNum = parseFloat(lastChapterStr);
                    if (isNaN(lastChapterNum)) return null;

                    let aggUrl = `/manga/${manga.id}/aggregate?`;
                    aggregatedLang.forEach(l => {
                        aggUrl += `translatedLanguage[]=${l}&`;
                    });
                    
                    const aggData = await apiFetch(aggUrl.slice(0, -1));
                    if (!aggData || !aggData.volumes) return null;

                    const volumes = Object.values(aggData.volumes) as any[];
                    let hasLastChapter = false;

                    for (const vol of volumes) {
                        if (vol.chapters && typeof vol.chapters === 'object') {
                            const chapterKeys = Object.keys(vol.chapters);
                            
                            // Strict check
                            if (chapterKeys.includes(lastChapterStr)) {
                                hasLastChapter = true;
                                break;
                            }

                            // Flexible check (1 chapter margin)
                            const maxTranslated = Math.max(...chapterKeys.map(k => parseFloat(k)).filter(n => !isNaN(n)));
                            if (maxTranslated >= lastChapterNum - 1) {
                                hasLastChapter = true;
                                break;
                            }
                        }
                    }

                    if (hasLastChapter) {
                        // Inyectamos el tipo de manga
                        manga.attributes.mangaType = this.getMangaType(manga);
                        return manga;
                    }
                    return null;
                } catch (err) {
                    console.warn(`[MangaDex] Failed to parse aggregate for ${manga.id}`, err);
                    return null;
                }
            });

            const results = await Promise.all(validationPromises);
            validMangas.push(...results.filter(m => m !== null));

            return {
                data: validMangas.slice(0, limit),
                total: validMangas.length, // Rough estimate for the UI
                offset: offset,
                rawOffsetNext: offset + fetchLimit // Next fetch offset for the caller
            };
        } catch (err) {
            console.error('Error fetching deep completed manga:', err);
            throw err;
        }
    },

    async getLatestUpdatedManga(limit = 12, offset = 0, lang = 'es') {
        // Increase initial fetch to find enough variety
        const fetchLimit = limit * 4; 
        let url = `/chapter?limit=${fetchLimit}&offset=${offset}&contentRating[]=safe&contentRating[]=suggestive&order[readableAt]=desc&includes[]=manga`;
        
        if (lang === 'es') {
            url += `&translatedLanguage[]=es&translatedLanguage[]=es-la`;
        } else if (lang) {
            url += `&translatedLanguage[]=${lang}`;
        }

        try {
            const resp = await apiFetch(url);
            const chapters = resp.data || [];
            
            const seenMangaIds = new Set<string>();
            const mangaIdToChapterData: Record<string, { readableAt: string, chapter: string }> = {};

            for (const chapter of chapters) {
                const mangaRel = chapter.relationships.find((r: any) => r.type === 'manga');
                
                // CRITICAL: Filter out external links (MangaPlus, etc.) and empty chapters
                const isExternal = !!chapter.attributes.externalUrl;
                const pageCount = chapter.attributes.pages || 0;
                
                if (!mangaRel || seenMangaIds.has(mangaRel.id) || isExternal || pageCount === 0) continue;

                seenMangaIds.add(mangaRel.id);
                mangaIdToChapterData[mangaRel.id] = {
                    readableAt: chapter.attributes.readableAt,
                    chapter: chapter.attributes.chapter
                };
            }

            const uniqueIds = Array.from(seenMangaIds);
            if (uniqueIds.length === 0) return { data: [] };

            // Fetch full manga details (Batch) - 50 max to stay safe
            let mangaUrl = `/manga?limit=${Math.min(uniqueIds.length, 50)}&includes[]=cover_art&includes[]=author`;
            uniqueIds.slice(0, 50).forEach(id => mangaUrl += `&ids[]=${id}`);
            
            const mangaResp = await apiFetch(mangaUrl);
            const fullMangas = mangaResp.data || [];

            // Merge details and Identify Type
            const mergedMangas = fullMangas.map((manga: any) => ({
                ...manga,
                attributes: {
                    ...manga.attributes,
                    latestChapterReadableAt: mangaIdToChapterData[manga.id]?.readableAt,
                    latestChapterNumber: mangaIdToChapterData[manga.id]?.chapter,
                    mangaType: this.getMangaType(manga)
                }
            }));

            // Re-sort by actual chapter date (batch might return unsorted)
            const sorted = mergedMangas.sort((a: any, b: any) => {
                const dateA = new Date(a.attributes.latestChapterReadableAt).getTime();
                const dateB = new Date(b.attributes.latestChapterReadableAt).getTime();
                return dateB - dateA;
            });

            // Diversification Strategy: Mix origins and "Diario" content
            const result: any[] = [];
            const variety = sorted.filter((m: any) => 
                m.attributes.originalLanguage !== 'ja' || 
                this.isDailyManga(m)
            );
            const japaneseRegular = sorted.filter((m: any) => 
                m.attributes.originalLanguage === 'ja' && 
                !this.isDailyManga(m)
            );

            // Interleave: 1 Variety every 2 Japanese Regular to ensure variety
            let vIdx = 0;
            let jIdx = 0;
            while (result.length < limit && (vIdx < variety.length || jIdx < japaneseRegular.length)) {
                // Add 1 variety (Manhwa, Manhua, Webtoon or Diario)
                if (vIdx < variety.length) {
                    result.push(variety[vIdx++]);
                }
                // Add up to 2 Japanese
                for (let i = 0; i < 2 && jIdx < japaneseRegular.length && result.length < limit; i++) {
                    result.push(japaneseRegular[jIdx++]);
                }
            }
            
            // Fill remaining if needed
            while (result.length < limit && vIdx < variety.length) result.push(variety[vIdx++]);
            while (result.length < limit && jIdx < japaneseRegular.length) result.push(japaneseRegular[jIdx++]);

            return { data: result };
        } catch (err) {
            console.error('Error fetching latest updated manga:', err);
            throw err;
        }
    },

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
     * Get chapters for a specific manga (GOD TIER exhaustive fetching)
     */
    async getMangaChapters(mangaId: string, lang: string | string[] | null = 'es', limit = 500, offsetInitial = 0, orderDir: 'asc' | 'desc' = 'desc') {
        let allChapters: any[] = [];
        let offset = offsetInitial;
        let hasMore = true;
        let total = 0;

        // Bucle para descargar TODOS los capítulos (paginado de 500 en 500)
        while (hasMore) {
            let url = `/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&order[volume]=${orderDir}&order[chapter]=${orderDir}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&includes[]=scanlation_group`;
            
            if (lang) {
                let langsArray = Array.isArray(lang) ? lang : [lang];
                // Si piden español, incluir latam
                if (langsArray.includes('es') && !langsArray.includes('es-la')) {
                    langsArray.push('es-la');
                }
                langsArray.forEach(l => url += `&translatedLanguage[]=${l}`);
            } else {
                // Fallback de idiomas si no se especifica para asegurar contenido
                url += `&translatedLanguage[]=es&translatedLanguage[]=es-la&translatedLanguage[]=en`;
            }

            const data = await apiFetch(url);
            
            if (!data.data || data.data.length === 0) {
                hasMore = false;
                break;
            }

            total = data.total || total;

            // FILTRO ANTI-FALLOS: externalUrl === null y pages > 0
            const validChapters = data.data.filter((ch: any) => 
                ch.attributes.externalUrl === null && ch.attributes.pages > 0
            );

            allChapters = [...allChapters, ...validChapters];

            // Si MangaDex nos dio menos del límite, llegamos al final de la BD
            if (data.data.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
                // Si solo queríamos un pedazo pequeño (ej: página de 20), rompemos aquí
                if (limit < 500) {
                    hasMore = false;
                }
            }
        }

        // Deduplicación por número de capítulo (preserva capítulos sin número como one-shots)
        const uniqueChapters = allChapters.filter((chapter, index, self) =>
            chapter.attributes.chapter === null || chapter.attributes.chapter === undefined
              ? true
              : index === self.findIndex((c) => c.attributes.chapter === chapter.attributes.chapter)
        );

        return { data: uniqueChapters, total: total };
    },

    /**
     * Get chapter pages (At-Home server)
     */
    async getChapterPages(chapterId: string, quality: 'data' | 'data-saver' = 'data') {
        const resp = await apiFetch(`/at-home/server/${chapterId}`);
        const { baseUrl, chapter } = resp;
        
        // Detectamos si está en móvil para usar el modo rápido
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
        const folder = isMobile ? 'data-saver' : quality;
        const files = folder === 'data-saver' ? chapter.dataSaver : chapter.data;
        
        const pageUrls = files.map((file: string) => {
            const rawUrl = `${baseUrl}/${folder}/${chapter.hash}/${file}`;
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
     * Helper to get cover URL (HD para PC y Móvil gracias a Cloudinary)
     */
    getCoverUrl(manga: any) {
        try {
            if (!manga || !manga.relationships) return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
            
            const coverRel = manga.relationships.find((r: any) => r.type === 'cover_art');
            const fileName = coverRel?.attributes?.fileName;
            
            if (fileName) {
                // Pedimos SIEMPRE la versión original (sin .256.jpg ni .512.jpg)
                const rawUrl = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
                
                // Cloudinary se encarga de optimizar el peso sin dañar la calidad visual
                return mangadexService.getOptimizedUrl(rawUrl);
            }
        } catch (err) {
            console.warn('[MangaDex] Error generating cover URL:', err);
        }
        return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
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
        return getProxyUrl(url);
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
