import { Capacitor } from '@capacitor/core';
import { proxifyImage } from '../utils/imageUtils';

/**
 * MangaDex API Service
 */

// 1. Detectamos si estamos en desarrollo local
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const isNative = Capacitor.isNativePlatform();
const baseUrl = '/api-md';
const UPLOADS_URL = 'https://uploads.mangadex.org';
const CLOUDINARY_CLOUD_NAME = 'djzak5yb2';

/**
 * Simple rate limiter: ensures minimum 100ms between requests (≤10 req/s)
 * Updated to 100ms for more professional responsiveness while staying safe.
 */
let lastRequestTime = 0;
async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < 100) {
        await new Promise(r => setTimeout(r, 100 - elapsed));
    }
    lastRequestTime = Date.now();
    return fetch(url, options);
}

/**
 * Helper to construct proxied URLs for MangaDex
 */
function getProxyUrl(endpoint: string) {
    // 0. Si ya es una URL absoluta (empieza por http), no la modificamos
    if (endpoint.startsWith('http')) {
        return endpoint;
    }

    // 1. Si estamos en una app móvil nativa (Capacitor), NO hay problemas de CORS.
    // Hacemos la petición directa a la API de MangaDex para evitar saltos innecesarios.
    if (isNative) {
        return `https://api.mangadex.org${endpoint}`;
    }
    
    // 2. Web (Localhost o Producción): 
    // SEGUNDO INTENTO: Usamos BASE_URL (/api-md) por defecto en web.
    // Esto es lo más profesional ya que utiliza el proxy de Vite en local y el Rewrite de vercel.json en producción.
    return `${baseUrl}${endpoint}`; 
}

/**
 * Helper to fetch from MangaDex using proxy with automatic retry for 500 errors and ECONNRESET
 */
async function apiFetch(endpoint: string, retries = 3, delay = 1500): Promise<any> {
    const proxiedUrl = getProxyUrl(endpoint);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

        const response = await rateLimitedFetch(proxiedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            if ((response.status >= 500 || response.status === 429) && retries > 0) {
                console.warn(`[MangaDex] API ${response.status} Error. Retrying in ${delay}ms... (${retries} left)`);
                await new Promise(res => setTimeout(res, delay));
                return apiFetch(endpoint, retries - 1, delay * 2);
            }
            throw new Error(`MangaDex API Error: ${response.status}`);
        }
        return await response.json();
    } catch (err: any) {
        // Handle ECONNRESET, Timeout and other Network errors
        if (retries > 0) {
            const isAborted = err.name === 'AbortError' || err.message?.includes('aborted');
            const isReset = err.message?.includes('reset') || err.message?.includes('ECONNRESET');
            
            console.warn(`[MangaDex] ${isAborted ? 'Timeout' : (isReset ? 'Connection Reset' : 'Network Error')}. Retrying in ${delay}ms... (${retries} left)`);
            
            await new Promise(res => setTimeout(res, delay));
            return apiFetch(endpoint, retries - 1, delay * 2);
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
    getContentRatingParams(allowNSFW: boolean): string {
        let params = '&contentRating[]=safe&contentRating[]=suggestive';
        if (allowNSFW) {
            // Se elimina 'pornographic' porque causa errores 500/403 en MangaDex sin autenticación OAuth.
            params += '&contentRating[]=erotica';
        }
        return params;
    },

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
     * Comprehensive mapping of ISO 639-1 language codes to readable names
     */
    getLangMapping(): Record<string, string> {
        return {
            'ja': 'Japonés',
            'en': 'Inglés',
            'es': 'Español',
            'es-la': 'Español Lat.',
            'ko': 'Coreano',
            'zh': 'Chino (Simp)',
            'zh-hk': 'Chino (Trad)',
            'fr': 'Francés',
            'pt-br': 'Portugués (BR)',
            'pt': 'Portugués',
            'it': 'Italiano',
            'de': 'Alemán',
            'ru': 'Ruso',
            'tr': 'Turco',
            'vi': 'Vietnamita',
            'th': 'Tailandés',
            'id': 'Indonesio',
            'pl': 'Polaco',
            'ar': 'Árabe',
            'hu': 'Húngaro',
            'cs': 'Checo',
            'el': 'Griego',
            'he': 'Hebreo',
            'hi': 'Hindi',
            'sv': 'Sueco',
            'uk': 'Ucraniano',
            'ms': 'Malayo',
            'bn': 'Bengalí',
            'fa': 'Persa'
        };
    },

    /**
     * Supported original language origins for filtering
     */
    getOriginMapping(): Record<string, string> {
        return {
            'ja': 'Manga (JP)',
            'ko': 'Manhwa (KR)',
            'zh': 'Manhua (CN)',
            'en': 'Western (EN)',
            'fr': 'Francés (FR)',
            'vi': 'Vietnamita (VI)',
            'th': 'Tailandés (TH)',
            'ru': 'Ruso (RU)',
            'id': 'Indonesio (ID)'
        };
    },

    /**
     * Gets a localized language name
     */
    getLangName(lang: string): string {
        const names = this.getLangMapping();
        return names[lang] || lang.toUpperCase();
    },
    /**
     * Search for manga with various filters
     */
    async searchManga(query: string, filters: { origin?: string, lang?: string, tags?: string[], status?: string, demographic?: string, fullColor?: boolean } = {}, limit = 20, offset = 0, order?: any, allowNSFW = false) {
        let url = `/manga?limit=${limit}&offset=${offset}&includes[]=cover_art&includes[]=author`;
        url += this.getContentRatingParams(allowNSFW);
        
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

        if (filters.lang && filters.lang !== 'all') {
            url += `&availableTranslatedLanguage[]=${filters.lang}`;
        }

        if (filters.tags && filters.tags.length > 0) {
            filters.tags.forEach(tag => {
                const uuid = GENRE_UUIDS[tag.toLowerCase()] || tag;
                url += `&includedTags[]=${uuid}`;
            });
        }

        if (filters.status) {
            url += `&status[]=${filters.status}`;
        }

        if (filters.demographic) {
            url += `&publicationDemographic[]=${filters.demographic}`;
        }

        if (filters.fullColor) {
            url += `&includedTags[]=${COLOR_TAG_ID}`;
        }

        return apiFetch(url);
    },

    /**
     * Get popular manga filtered by language and origin
     */
    async getPopularManga(origin: string | null = null, lang: string | null = 'es', limit = 12, offset = 0, genre: string | null = null, fullColor = false, allowNSFW = false): Promise<any> {
        let url = `/manga?limit=${limit}&offset=${offset}&hasAvailableChapters=true&order[followedCount]=desc&includes[]=cover_art&includes[]=author`;
        url += this.getContentRatingParams(allowNSFW);
        
        if (lang && lang !== 'all') {
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
            const originValue = origin.toLowerCase();
            url += `&originalLanguage[]=${originValue}`;
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
    async getFullyTranslatedMasterpieces(origin: string | null = null, lang = 'es', limit = 10, offset = 0, genre: string | null = null, fullColor = false, allowNSFW = false) {
        // 1. Try Cache First (Fast Path)
        // Updated cache version (v2) to force fresh validation with new rules
        const cacheKey = `masterpieces_v2_${origin || 'ALL'}_${lang}_${genre || 'NONE'}_${fullColor}_${allowNSFW}_${offset}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { data, timestamp } = JSON.parse(cached);
                const isFresh = Date.now() - timestamp < 1000 * 60 * 60 * 12; // 12 hours
                if (isFresh && data.length >= limit) {
                    console.log(`[Cache] Returning cached masterpieces for ${origin}`);
                    return { data: data.slice(0, limit), total: data.length, offset };
                }
            } catch (e) {
                localStorage.removeItem(cacheKey);
            }
        }

        // 2. Fetch from API (Slow Path)
        // Reduced from limit * 6 (80) to limit * 4 (max 48) for faster validation
        const fetchLimit = Math.min(limit * 4, 48); 
        let url = `/manga?limit=${fetchLimit}&offset=${offset}&hasAvailableChapters=true&order[followedCount]=desc&includes[]=cover_art&includes[]=author`;
        url += this.getContentRatingParams(allowNSFW);
        
        console.log(`[Masterpieces] Fetching with URL: ${url}`);
        if (fullColor) {
            url += `&status[]=completed&status[]=ongoing`;
        } else {
            url += `&status[]=completed`;
        }
        
        const isWorldMode = lang === 'all';
        const aggregatedLang = isWorldMode ? [] : (lang === 'es' ? ['es', 'es-la', 'en'] : [lang || 'en']);
        
        if (!isWorldMode) {
            aggregatedLang.forEach(l => {
                url += `&availableTranslatedLanguage[]=${l}`;
            });
        }

        if (genre) {
            const uuid = GENRE_UUIDS[genre.toLowerCase()] || genre;
            url += `&includedTags[]=${uuid}`;
        }

        if (fullColor) {
            url += `&includedTags[]=${COLOR_TAG_ID}`;
        }

        if (origin) {
            const langMap: { [key: string]: string } = { 'JP': 'ja', 'KR': 'ko', 'CN': 'zh' };
            const originValue = langMap[origin] || origin;
            url += `&originalLanguage[]=${originValue.toLowerCase()}`;
        }

        try {
            const response = await apiFetch(url);
            if (!response.data || response.data.length === 0) {
                return { data: [], total: 0, offset };
            }

            const validMangas: any[] = [];
            const chunkSize = 10; // Increased to 10 for professional-grade loading speed

            for (let i = 0; i < response.data.length; i += chunkSize) {
                // Short-circuit: If we already have enough valid mangas, STOP checking the rest
                if (validMangas.length >= limit) break;

                const chunk = response.data.slice(i, i + chunkSize);
                const chunkPromises = chunk.map(async (manga: any) => {
                    try {
                        const lastChapterStr = manga.attributes.lastChapter;
                        const status = manga.attributes.status;

                        // If we don't have a last chapter but it's completed, we try to use the latest from aggregate
                        // instead of just discarding it immediately (lenient for KR/CN)
                        if (!lastChapterStr && status !== 'completed') {
                            // HAUS INTELLIGENCE: Even if not completed, check if it has a decent amount of chapters in Lang
                        }

                        let aggUrl = `/manga/${manga.id}/aggregate?`;
                        if (!isWorldMode) {
                            aggregatedLang.forEach(l => {
                                aggUrl += `translatedLanguage[]=${l}&`;
                            });
                        }
                        
                        const aggData = await apiFetch(aggUrl.endsWith('?') || aggUrl.endsWith('&') ? aggUrl.slice(0, -1) : aggUrl);
                        if (!aggData || !aggData.volumes) return null;

                        const volumes = Object.values(aggData.volumes) as any[];
                        let totalChaptersInLang = 0;
                        const uniqueChapters = new Set();
                        
                        for (const vol of volumes) {
                            if (vol.chapters && typeof vol.chapters === 'object') {
                                Object.keys(vol.chapters).forEach(k => uniqueChapters.add(k));
                            }
                        }
                        totalChaptersInLang = uniqueChapters.size;

                        // RULES FOR A "JOYITA" (Balanced for Manhwas)
                        // 1. Must have at least 3 chapters in the target language (relaxed from 5 to catch fresh Manhwas)
                        if (totalChaptersInLang < 3) return null;

                        // 2. Coverage calculation
                        let hasEnoughCoverage = false;
                        if (lastChapterStr) {
                            const lastChapterNum = parseFloat(lastChapterStr);
                            if (!isNaN(lastChapterNum) && lastChapterNum > 0) {
                                const coverage = totalChaptersInLang / lastChapterNum;
                                // RELAXED: 70% coverage instead of 80% to account for fast Korean scanlation gaps
                                if (coverage >= 0.7) hasEnoughCoverage = true;
                            }
                        } else {
                            // 3. Fallback: If status is completed and we have chapters, it's good
                            if (status === 'completed' && totalChaptersInLang >= 3) {
                                hasEnoughCoverage = true;
                            } else if (totalChaptersInLang > 20) {
                                // Ongoing with many chapters is usually safe
                                hasEnoughCoverage = true;
                            }
                        }

                        if (hasEnoughCoverage) {
                            manga.attributes.mangaType = this.getMangaType(manga);
                            manga.attributes.calculatedTotalChapters = totalChaptersInLang; // Source of truth for UI
                            const desc = manga.attributes.description || {};
                            manga.attributes.hasSpanishDesc = !!(desc.es || desc['es-la'] || desc['es-419']);
                            return manga;
                        }
                        return null;
                    } catch (err) {
                        return null;
                    }
                });

                const chunkResults = await Promise.all(chunkPromises);
                for (const result of chunkResults) {
                    if (result && validMangas.length < limit) {
                        validMangas.push(result);
                    }
                }
            }

            // Final Sort: Prioritize those with Spanish description
            const sortedByDesc = validMangas.sort((a, b) => {
                const aHas = a.attributes.hasSpanishDesc ? 1 : 0;
                const bHas = b.attributes.hasSpanishDesc ? 1 : 0;
                return bHas - aHas;
            });

            // 3. Save to Cache
            if (sortedByDesc.length > 0) {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: sortedByDesc,
                    timestamp: Date.now()
                }));
            }

            return {
                data: sortedByDesc.slice(0, limit),
                total: sortedByDesc.length,
                offset: offset,
                rawOffsetNext: offset + fetchLimit
            };
        } catch (err) {
            console.error('Error fetching deep completed manga:', err);
            throw err;
        }
    },

    async getLatestUpdatedManga(limit = 12, offset = 0, lang = 'es', type = 'all', allowNSFW = false) {
        // Mode 1: Manga-first (Best for filtered views like Manhwa/Manhua)
        if (type !== 'all') {
            const typeValue = type.toLowerCase();
            // If it's a known mapping key (manga, manhwa, manhua), use the code. 
            // Otherwise, assume it's already an origin code (ja, ko, zh, fr, etc.)
            const typeMap: Record<string, string> = { 'manga': 'ja', 'manhwa': 'ko', 'manhua': 'zh' };
            const targetOrigin = typeMap[typeValue] || typeValue;
            
            let url = `/manga?limit=${limit}&offset=${offset}&hasAvailableChapters=true&includes[]=cover_art&includes[]=author&order[latestUploadedChapter]=desc&originalLanguage[]=${targetOrigin}`;
            url += this.getContentRatingParams(allowNSFW);
            
            if (lang === 'all') {
                // World mode: No language filter
            } else if (lang === 'es') {
                url += `&availableTranslatedLanguage[]=es&availableTranslatedLanguage[]=es-la`;
            } else if (lang) {
                url += `&availableTranslatedLanguage[]=${lang}`;
            }

            try {
                const resp = await apiFetch(url);
                const mangas = resp.data || [];
                
                // Add mangaType and placeholder for compatibility
                return {
                    data: mangas.map((m: any) => ({
                        ...m,
                        attributes: {
                            ...m.attributes,
                            mangaType: this.getMangaType(m)
                        }
                    }))
                };
            } catch (err) {
                console.error('Error fetching filtered latest manga:', err);
                return { data: [] };
            }
        }

        // Mode 2: Chapter-first (Best for the "All" view with maximum variety)
        // Fetch more chapters to ensure we find enough UNIQUE manga (even with bulk uploads)
        const fetchLimit = 100; 
        let url = `/chapter?limit=${fetchLimit}&offset=${offset}&order[readableAt]=desc&includes[]=manga`;
        url += this.getContentRatingParams(allowNSFW);
        
        if (lang === 'all') {
            // World mode: No language filter
        } else if (lang === 'es') {
            url += `&translatedLanguage[]=es&translatedLanguage[]=es-la`;
        } else if (lang) {
            url += `&translatedLanguage[]=${lang}`;
        }

        try {
            const resp = await apiFetch(url);
            const chapters = resp.data || [];
            
            const seenMangaIds = new Set<string>();
            const mangaIdToChapterData: Record<string, { readableAt: string, chapter: string, lang: string }> = {};

            for (const chapter of chapters) {
                const mangaRel = chapter.relationships.find((r: any) => r.type === 'manga');
                const isExternal = !!chapter.attributes.externalUrl;
                
                // Be more lenient: some valid chapters might have pageCount=0 initially in MD's feed
                // but we definitely skip external links we can't read.
                if (!mangaRel || seenMangaIds.has(mangaRel.id) || isExternal) continue;

                seenMangaIds.add(mangaRel.id);
                mangaIdToChapterData[mangaRel.id] = {
                    readableAt: chapter.attributes.readableAt,
                    chapter: chapter.attributes.chapter,
                    lang: chapter.attributes.translatedLanguage
                };
            }

            const uniqueIds = Array.from(seenMangaIds);
            if (uniqueIds.length === 0) return { data: [] };

            let mangaUrl = `/manga?limit=${Math.min(uniqueIds.length, 50)}&includes[]=cover_art&includes[]=author`;
            uniqueIds.slice(0, 50).forEach(id => mangaUrl += `&ids[]=${id}`);
            
            const mangaResp = await apiFetch(mangaUrl);
            const fullMangas = mangaResp.data || [];

            const mergedMangas = fullMangas.map((manga: any) => ({
                ...manga,
                attributes: {
                    ...manga.attributes,
                    latestChapterReadableAt: mangaIdToChapterData[manga.id]?.readableAt,
                    latestChapterNumber: mangaIdToChapterData[manga.id]?.chapter,
                    latestChapterLang: mangaIdToChapterData[manga.id]?.lang,
                    mangaType: this.getMangaType(manga)
                }
            }));

            const sorted = mergedMangas.sort((a: any, b: any) => {
                const dateA = new Date(a.attributes.latestChapterReadableAt).getTime();
                const dateB = new Date(b.attributes.latestChapterReadableAt).getTime();
                return dateB - dateA;
            });

            const variety = sorted.filter((m: any) => 
                m.attributes.originalLanguage !== 'ja' || 
                this.isDailyManga(m)
            );
            
            const japaneseRegular = sorted.filter((m: any) => 
                m.attributes.originalLanguage === 'ja' && 
                !this.isDailyManga(m)
            );

            const result: any[] = [];
            let vIdx = 0;
            let jIdx = 0;
            
            while (result.length < limit && (vIdx < variety.length || jIdx < japaneseRegular.length)) {
                if (vIdx < variety.length) result.push(variety[vIdx++]);
                if (result.length < limit && jIdx < japaneseRegular.length) result.push(japaneseRegular[jIdx++]);
            }

            return { data: result };
        } catch (err) {
            console.error('Error fetching latest updated manga:', err);
            throw err;
        }
    },

    async getLatestChapters(limit = 12, offset = 0, lang: string | null = null, allowNSFW = false) {
        let url = `/chapter?limit=${limit}&offset=${offset}&order[readableAt]=desc&includes[]=manga`;
        url += this.getContentRatingParams(allowNSFW);
        
        if (lang === 'all') {
            // World mode: No language filter
        } else if (lang === 'es') {
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
    async getMangaChapters(mangaId: string, lang: string | string[] | null = 'es', limit = 500, offsetInitial = 0, orderDir: 'asc' | 'desc' = 'desc', allowNSFW = false) {
        let allChapters: any[] = [];
        let offset = offsetInitial;
        let hasMore = true;
        let total = 0;

        // Bucle para descargar TODOS los capítulos (paginado de 500 en 500)
        while (hasMore) {
            let url = `/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&order[volume]=${orderDir}&order[chapter]=${orderDir}&includes[]=scanlation_group`;
            url += this.getContentRatingParams(allowNSFW);
            
            if (lang && lang !== 'all') {
                let langsArray = Array.isArray(lang) ? lang : [lang];
                // Si piden español, incluir latam
                if (langsArray.includes('es') && !langsArray.includes('es-la')) {
                    langsArray.push('es-la');
                }
                langsArray.forEach(l => url += `&translatedLanguage[]=${l}`);
            } else if (!lang) {
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

    getCoverUrl(manga: any, quality: 'original' | '256' | '512' = '256') {
        try {
            if (!manga) return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
            
            const id = manga.id;
            const coverRel = manga.relationships?.find((rel: any) => rel.type === 'cover_art');
            const fileName = coverRel?.attributes?.fileName;
            
            if (fileName) {
                const suffix = quality === 'original' ? '' : `.${quality}.jpg`;
                const rawUrl = `${UPLOADS_URL}/covers/${id}/${fileName}${suffix}`;
                // Cloudinary fetch for additional performance if available
                return this.getOptimizedUrl(rawUrl);
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
    async fetchMangaDexIdByTitle(title: string): Promise<string | null> {
        if (!title) return null;
        try {
            // Clean title for better matching
            const cleanTitle = title.replace(/[^\w\s]/gi, '').trim();
            const url = `/manga?title=${encodeURIComponent(cleanTitle)}&limit=1&order[relevance]=desc`;
            const data = await apiFetch(url);
            if (data.data && data.data.length > 0) {
                return data.data[0].id;
            }
            return null;
        } catch (err) {
            console.error(`[MangaDex] Bridging error for title: ${title}`, err);
            return null;
        }
    },

    /**
     * Find MangaDex ID by title AND verify it has chapters.
     * Returns { id, hasChapters } or null if not found.
     */
    async fetchVerifiedRecommendation(title: string, allowNSFW = false): Promise<{ id: string; title: string; hasChapters: boolean } | null> {
        if (!title) return null;
        try {
            const cleanTitle = title.replace(/[^\w\s]/gi, '').trim();
            let url = `/manga?title=${encodeURIComponent(cleanTitle)}&limit=1&order[relevance]=desc&includes[]=cover_art`;
            url += this.getContentRatingParams(allowNSFW);
            const data = await apiFetch(url);
            if (!data.data || data.data.length === 0) return null;

            const mangaId = data.data[0].id;
            // Check if it has at least 1 chapter in ANY language
            const chapUrl = `/manga/${mangaId}/feed?limit=1&offset=0&order[chapter]=desc`;
            const chapData = await apiFetch(chapUrl);
            const hasChapters = chapData.data && chapData.data.length > 0;

            return { id: mangaId, title: cleanTitle, hasChapters };
        } catch (err) {
            console.warn(`[MangaDex] Verify recommendation failed for: ${title}`, err);
            return null;
        }
    },

    /**
     * Fetch a single manga by ID with cover_art included
     */
    async getMangaById(mangaId: string) {
        try {
            const data = await apiFetch(`/manga/${mangaId}?includes[]=cover_art`);
            return data;
        } catch (err) {
            console.warn(`[MangaDex] Failed to fetch manga ${mangaId}:`, err);
            return null;
        }
    },

    /**
     * Get recommendations based on tags or high rating
     */
    async getRecommendations(tags: string[] = [], limit = 10, allowNSFW = false) {
        let url = `/manga?limit=${limit}&includes[]=cover_art&order[rating]=desc`;
        url += this.getContentRatingParams(allowNSFW);
        
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
     * Get optimized URL via Cloudinary Fetch with WordPress Photon fallback
     */
    getOptimizedUrl(url: string, params = 'f_auto,q_auto:best') {
        if (!url) return '';
        
        // Evitar doble prefijo si ya está optimizada
        if (url.includes('res.cloudinary.com') || url.includes('i0.wp.com')) return url;

        // MangaDex has blocked WordPress Photon (i0.wp.com). 
        // We now bypass Photon and rely on our own Worker Proxy.
        // We add ?v=haus to bust any previously cached placeholder images.
        if (url.includes('mangadex.org') || url.includes('mangadex.network')) {
            return proxifyImage(url); 
        }

        if (!CLOUDINARY_CLOUD_NAME) {
            return `https://i0.wp.com/${url.replace(/^https?:\/\//, '')}?quality=100&strip=all`;
        }

        // 3. Para otros dominios, usamos Cloudinary como fallback
        return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${params}/${encodeURIComponent(url)}`;
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
        // Priority: ES (Spain) -> ES-LA (Legacy) -> ES-419 (Standard Latam) -> PT-BR (Brazilian) -> PT (Portuguese) -> EN (English)
        const rawDesc = desc.es || desc['es-la'] || desc['es-419'] || desc['pt-br'] || desc.pt || desc.en || Object.values(desc)[0] || '';
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
