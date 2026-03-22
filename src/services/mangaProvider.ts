import { mangadexService } from './mangadexService';
import { mangapillService } from './mangapillService';

export type MangaSource = 'mangadex' | 'mangapill';

let currentSource: MangaSource = 'mangadex';

// Helper: Normalizar títulos para comparación
const normalizeTitle = (title: string): string => {
  return title.toLowerCase().replace(/[^\w\s]/g, '').trim();
};

// Helper: Deduplicar resultados por ID y por título normalizado
const deduplicateResults = (results: any[]): any[] => {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  
  return results.filter(item => {
    const id = item.id;
    const title = normalizeTitle(item.attributes?.title?.['en'] || item.attributes?.title || item.name || '');
    
    // Descartar si el ID ya existe
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    
    // Descartar si el título normalizado ya existe (para títulos que no sean vacíos)
    if (title && seenTitles.has(title)) return false;
    if (title) seenTitles.add(title);
    
    return true;
  });
};

export const mangaProvider = {
    setSource(source: MangaSource) {
        currentSource = source;
        if (typeof window !== 'undefined') {
            localStorage.setItem('mangaSource', source);
        }
    },

    getSource(): MangaSource {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mangaSource') as MangaSource;
            if (saved === 'mangadex' || saved === 'mangapill') {
                currentSource = saved;
            }
        }
        return currentSource;
    },

    isExternalId(id: string) {
        return id && id.startsWith('mp:');
    },

    getInternalId(id: string) {
        return id && id.startsWith('mp:') ? id.substring(3) : id;
    },

    getServiceForId(id: string) {
        return this.isExternalId(id) ? (mangapillService as any) : mangadexService;
    },

    getService() {
        return this.getSource() === 'mangapill' ? (mangapillService as any) : mangadexService;
    },

    // ----------------------------------------------------------------------
    // Delegate Methods
    // ----------------------------------------------------------------------

    // Búsqueda en cascada: intenta MangaDex primero, luego MangaPill si es necesario
    async searchManga(query: string, filters: any = {}, limit = 20, offset = 0, order?: any, allowNSFW = false) {
        try {
            // Fase 1: Buscar en MangaDex
            const mangadexResults = await mangadexService.searchManga(query, filters, limit, offset, order, allowNSFW);
            const results = mangadexResults?.data || [];

            // Fase 2: Si los resultados son muy pocos o vacíos, buscar en MangaPill como fallback
            // Umbral: Si obtenemos menos del 50% de resultados solicitados
            if (results.length < Math.ceil(limit * 0.5) && !offset) {
                try {
                    console.log(`[SearchCascade] MangaDex retornó ${results.length} resultados. Buscando en MangaPill como fallback...`);
                    
                    // mangapillService.searchManga() solo acepta query, devuelve un array directo
                    const mangapillData = await mangapillService.searchManga(query);
                    const mangapillArray = Array.isArray(mangapillData) ? mangapillData : [];

                    // Los IDs de MangaPill YA vienen con prefijo 'mp:', no agregar nuevamente
                    const prefixedMangapill = mangapillArray.map((item: any) => ({
                        ...item,
                        _source: 'mangapill'
                    }));

                    // Combinar y deduplicar resultados
                    const combinedResults = deduplicateResults([...results, ...prefixedMangapill]);
                    
                    console.log(`[SearchCascade] Resultados finales: ${combinedResults.length} únicos (MangaDex: ${results.length} + MangaPill: ${mangapillArray.length})`);
                    
                    return {
                        data: combinedResults.slice(0, limit),
                        pagination: mangadexResults?.pagination || { limit, offset, total: combinedResults.length }
                    };
                } catch (fallbackError) {
                    console.error('[SearchCascade] Error en fallback de MangaPill:', fallbackError);
                    // Si MangaPill falla, devolver solo resultados de MangaDex
                    return mangadexResults;
                }
            }

            // Si MangaDex tiene suficientes resultados, devolver esos
            return mangadexResults;
        } catch (error) {
            console.error('[SearchCascade] Error en búsqueda MangaDex:', error);
            
            // Si MangaDex falla completamente, intentar MangaPill
            try {
                console.log('[SearchCascade] MangaDex falló. Intentando MangaPill...');
                const mangapillData = await mangapillService.searchManga(query);
                const mangapillArray = Array.isArray(mangapillData) ? mangapillData : [];
                
                // Los IDs de MangaPill YA vienen con prefijo 'mp:'
                const prefixedMangapill = mangapillArray.map((item: any) => ({
                    ...item,
                    _source: 'mangapill'
                }));
                
                return {
                    data: prefixedMangapill.slice(0, limit),
                    pagination: { limit, offset, total: prefixedMangapill.length }
                };
            } catch (fallbackError) {
                console.error('[SearchCascade] Error en MangaPill:', fallbackError);
                return { data: [], pagination: { limit, offset, total: 0 } };
            }
        }
    },

    getPopularManga(origin: string | null = null, lang: string | null = 'es', limit = 12, offset = 0, genre: string | null = null, fullColor = false, allowNSFW = false) {
        const service = this.getService() as any;
        return service.getPopularManga 
            ? service.getPopularManga(origin, lang, limit, offset, genre, fullColor, allowNSFW)
            : mangadexService.getPopularManga(origin, lang, limit, offset, genre, fullColor, allowNSFW);
    },

    getLatestUpdatedManga(limit = 12, offset = 0, lang = 'es', type = 'all', allowNSFW = false) {
        const service = this.getService() as any;
        return service.getLatestUpdatedManga 
            ? service.getLatestUpdatedManga(limit, offset, lang, type, allowNSFW)
            : mangadexService.getLatestUpdatedManga(limit, offset, lang, type, allowNSFW);
    },

    getFullyTranslatedMasterpieces(origin: string | null = null, lang = 'es', limit = 10, offset = 0, genre: string | null = null, fullColor = false, allowNSFW = false) {
        const service = this.getService() as any;
        return service.getFullyTranslatedMasterpieces 
            ? service.getFullyTranslatedMasterpieces(origin, lang, limit, offset, genre, fullColor, allowNSFW)
            : mangadexService.getFullyTranslatedMasterpieces(origin, lang, limit, offset, genre, fullColor, allowNSFW);
    },

    getLatestChapters(limit = 12, offset = 0, lang: string | null = null) {
        const service = this.getService() as any;
        return service.getLatestChapters 
            ? service.getLatestChapters(limit, offset, lang)
            : mangadexService.getLatestChapters(limit, offset, lang);
    },

    getMangaDetails(id: string) {
        const service = this.getServiceForId(id);
        return service.getMangaDetails(this.getInternalId(id));
    },

    getMangaById(id: string) {
        return this.getMangaDetails(id); // map it to getMangaDetails for compatibility
    },

    getMangaChapters(mangaId: string, lang: string | string[] | null = 'es', limit = 500, offsetInitial = 0, orderDir: 'asc' | 'desc' = 'desc') {
        const service = this.getServiceForId(mangaId);
        return service.getMangaChapters(this.getInternalId(mangaId), lang, limit, offsetInitial, orderDir);
    },

    getChapterPages(chapterId: string, quality: 'data' | 'data-saver' = 'data') {
        return this.getServiceForId(chapterId).getChapterPages(this.getInternalId(chapterId), quality);
    },

    getChapter(chapterId: string) {
        const service = this.getServiceForId(chapterId) as any;
        return service.getChapter ? service.getChapter(this.getInternalId(chapterId)) : Promise.reject(new Error("Method not implemented"));
    },

    getMangaStatistics(mangaId: string) {
        const service = this.getServiceForId(mangaId);
        return service.getMangaStatistics ? service.getMangaStatistics(this.getInternalId(mangaId)) : Promise.resolve({ rating: null, follows: 0 });
    },

    getCoverUrl(manga: any, quality: 'original' | '256' | '512' = '256') {
        if (!manga) return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
        
        // Comick uses our faked URL in relationships, or we can resolve it directly
        const service = this.getServiceForId(manga.id);
        if (this.isExternalId(manga.id)) {
            // MangaPill/External sources might have the cover URL in attributes or relations
            const coverRel = manga.relationships?.find((rel: any) => rel.type === 'cover_art');
            return coverRel?.attributes?.fileName || manga.attributes?.coverUrl || 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
        }
        
        return mangadexService.getCoverUrl(manga, quality);
    },

    getLocalizedTitle(manga: any) {
        if (!manga?.attributes?.title) return 'Desconocido';
        const titles = manga.attributes.title;
        return titles['en'] || titles['es-la'] || titles['es'] || titles['ja-ro'] || Object.values(titles)[0] || 'Desconocido';
    },

    getLocalizedDescription(manga: any) {
        if (!manga?.attributes?.description) return '';
        const desc = manga.attributes.description;
        return desc['es-la'] || desc['es'] || desc['en'] || Object.values(desc)[0] || '';
    },

    getOptimizedUrl(url: string) {
        return mangadexService.getOptimizedUrl(url);
    },

    getProxiedUrl(url: string) {
        return mangadexService.getProxiedUrl(url);
    },

    fetchVerifiedRecommendation(title: string) {
        return mangadexService.fetchVerifiedRecommendation(title);
    }
};
