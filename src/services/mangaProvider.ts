import { mangadexService } from './mangadexService';
import { mangapillService } from './mangapillService';
import { weebcentralService } from './weebcentralService';

export type MangaSource = 'mangadex' | 'mangapill' | 'weebcentral';

let currentSource: MangaSource = 'mangadex';

// Helper: Normalizar títulos para comparación robusta
const normalizeTitle = (title: string): string => {
  if (!title) return '';
  return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Limpiar acentos
      .replace(/[^a-z0-9\s]/g, '')     // Solo alfanumérico y espacios
      .replace(/\s+/g, ' ')            // Espacios únicos
      .trim();
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
            if (saved === 'mangadex' || saved === 'mangapill' || saved === 'weebcentral') {
                currentSource = saved;
            }
        }
        return currentSource;
    },

    isExternalId(id: string) {
        return id && (id.startsWith('mp:') || id.startsWith('wc:'));
    },

    // --- UTILS ---
    
    getInternalId(id: string) {
        if (!id) return id;
        if (id.startsWith('mp:')) return id.substring(3);
        if (id.startsWith('wc:')) return id.substring(3);
        return id;
    },

    getServiceForId(id: string) {
        if (!id) return mangadexService;
        if (id.startsWith('mp:')) return mangapillService as any;
        if (id.startsWith('wc:')) return weebcentralService as any;
        return mangadexService;
    },

    getService() {
        if (currentSource === 'mangapill') return mangapillService as any;
        if (currentSource === 'weebcentral') return weebcentralService as any;
        return mangadexService;
    },

    // --- DELEGATE METHODS ---

    /**
     * Búsqueda en cascada Inteligente: 
     * 1. MangaDex (Metadata oficial y español)
     * 2. WeebCentral (Manhwas/Manhuas y alta disponibilidad)
     * 3. MangaPill (Manga rápido y capítulos actualizados)
     */
    async searchManga(query: string, filters: any = {}, limit = 20, offset = 0, order?: any, allowNSFW = false) {
        try {
            console.log(`[Search] Cascade for: "${query}" | Filters:`, filters);
            
            // Si el usuario ha seleccionado un idioma ESPECÍFICO (es, en, etc.), lo respetamos estrictamente.
            // No hacemos cascada de idiomas si hay una elección explícita.
            const userLang = filters.lang || null;
            
            if (userLang && userLang !== 'all') {
                console.log(`[Search] Using explicit language filter: ${userLang}`);
                return mangadexService.searchManga(query, filters, limit, offset, order, allowNSFW);
            }

            // --- Lógica de Priorización de Español (Default) ---
            
            // Etapa 1: MangaDex buscando estrictamente ESPAÑOL
            const mdSpanishResults = await mangadexService.searchManga(query, { ...filters, lang: 'es' }, limit, offset, order, allowNSFW);
            
            let allResults = mdSpanishResults.data || [];
            
            // Si tenemos pocos resultados en español, buscamos en otras fuentes e inglés como respaldo
            if (allResults.length < 8) {
                console.log('[Search] Low Spanish results. Triggering cascade fallbacks...');
                
                // Inteligencia de Selección de Fuente:
                // Si buscan Manhwa (ko), priorizar WeebCentral. Si buscan Manga (ja), priorizar MangaPill.
                const origin = filters.origin || null;
                const isManhwaSearch = origin === 'ko';
                const isMangaSearch = origin === 'ja';

                const [mdEnglishResults, wcResults, mpResults] = await Promise.all([
                    // Stage 2: Fallback to English on MangaDex
                    mangadexService.searchManga(query, { ...filters, lang: 'en' }, 10, 0, order, allowNSFW).catch(() => ({ data: [] })),
                    // Stage 3: External sources tailored to format
                    (!isMangaSearch ? weebcentralService.searchManga(query) : Promise.resolve([])).catch(() => []),
                    (!isManhwaSearch ? mangapillService.searchManga(query) : Promise.resolve([])).catch(() => [])
                ]);

                allResults = [
                    ...allResults,
                    ...((mdEnglishResults as any).data || []),
                    ...(wcResults as any[] || []),
                    ...(mpResults as any[] || [])
                ];
            }

            // Deduplicar (MangaDex Español siempre queda arriba)
            const combined = deduplicateResults(allResults);

            return {
                data: combined.slice(0, limit),
                pagination: {
                    limit,
                    offset,
                    total: combined.length
                }
            };
        } catch (err) {
            console.error('[Search] Cascade failed:', err);
            return { data: [], pagination: { limit, offset, total: 0 } };
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

    getLatestChapters(limit = 12, offset = 0, lang: string | null = null, allowNSFW = false) {
        const service = this.getService() as any;
        return service.getLatestChapters 
            ? service.getLatestChapters(limit, offset, lang, allowNSFW)
            : mangadexService.getLatestChapters(limit, offset, lang, allowNSFW);
    },

    async getMangaDetails(id: string, allowNSFW = false) {
        if (this.isExternalId(id)) {
            const service = this.getServiceForId(id);
            const details = await service.getMangaDetails(this.getInternalId(id), allowNSFW);
            
            // --- METADATA ENRICHMENT ---
            try {
                const title = details.data.attributes.title.en;
                if (title) {
                    const mdMatch = await mangadexService.searchManga(title, {}, 1, 0, null, allowNSFW);
                    if (mdMatch.data && mdMatch.data.length > 0) {
                        const mdManga = mdMatch.data[0];
                        const mdTitle = normalizeTitle(mdManga.attributes.title.en || Object.values(mdManga.attributes.title)[0] as string);
                        const extTitleNormalized = normalizeTitle(title);
                        
                        // Si el título coincide moderadamente, robar los metadatos de MangaDex (ID de tags, descripción en español)
                        if (mdTitle === extTitleNormalized || mdTitle.includes(extTitleNormalized) || extTitleNormalized.includes(mdTitle)) {
                            console.log(`[Enrichment] Found Spanish metadata on MangaDex for: ${title}`);
                            if (mdManga.attributes.description) {
                                details.data.attributes.description = {
                                    ...details.data.attributes.description,
                                    ...mdManga.attributes.description
                                };
                            }
                            if (mdManga.attributes.tags) {
                               details.data.attributes.tags = mdManga.attributes.tags;
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('[Enrichment] Failed to enrich metadata:', err);
            }
            
            return details;
        }
        return mangadexService.getMangaDetails(id);
    },

    getMangaById(id: string) {
        return this.getMangaDetails(id); 
    },

    async getMangaChapters(mangaId: string, lang: string | null = 'es', limit = 20, offset = 0, order: 'asc' | 'desc' = 'desc', allowNSFW = false) {
        if (this.isExternalId(mangaId)) {
            const providerStr = mangaId.split(':')[0];
            if (providerStr === 'mp' || mangaId.startsWith('mp:')) {
                return mangapillService.getMangaChapters(mangaId, lang, limit, offset, order);
            }
            if (providerStr === 'wc' || mangaId.startsWith('wc:')) {
                return weebcentralService.getMangaChapters(mangaId);
            }
            return { data: [], total: 0 };
        }
        return mangadexService.getMangaChapters(mangaId, lang, limit, offset, order, allowNSFW);
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

    getRecommendations(tags: string[] = [], limit = 10, allowNSFW = false) {
        // Recommendations are primarily powered by MangaDex for now
        return mangadexService.getRecommendations(tags, limit, allowNSFW);
    },

    getCoverUrl(manga: any, quality: 'original' | '256' | '512' = '256') {
        if (!manga) return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
        
        const service = this.getServiceForId(manga.id);
        if (this.isExternalId(manga.id)) {
            // Check for direct coverUrl in attributes (MangaPill/WeebCentral)
            if (manga.attributes?.coverUrl) return manga.attributes.coverUrl;
            
            // Check relationships
            const coverRel = manga.relationships?.find((rel: any) => rel.type === 'cover_art');
            if (coverRel?.attributes?.fileName) return coverRel.attributes.fileName;
            
            return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
        }
        
        return mangadexService.getCoverUrl(manga, quality);
    },

    getLocalizedTitle(manga: any) {
        if (!manga?.attributes?.title) return 'Desconocido';
        const titles = manga.attributes.title;
        if (typeof titles === 'string') return titles;
        return titles['en'] || titles['es-la'] || titles['es'] || titles['ja-ro'] || Object.values(titles)[0] || 'Desconocido';
    },

    getLocalizedDescription(manga: any) {
        if (!manga?.attributes?.description) return '';
        const desc = manga.attributes.description;
        if (typeof desc === 'string') return desc;
        return desc['es-la'] || desc['es'] || desc['en'] || Object.values(desc)[0] || '';
    },

    getOptimizedUrl(url: string) {
        return mangadexService.getOptimizedUrl(url);
    },

    getProxiedUrl(url: string) {
        return mangadexService.getProxiedUrl(url);
    },

    fetchVerifiedRecommendation(title: string, allowNSFW = false) {
        return mangadexService.fetchVerifiedRecommendation(title, allowNSFW);
    },

    // --- INTELLIGENT FALLBACK HELPERS ---
    
    async findBestExternalSource(manga: any): Promise<{ id: string, source: MangaSource } | null> {
        if (!manga || !manga.attributes) return null;
        
        // 1. Recopilar todos los títulos posibles (Principal + Alternativos)
        const targetTitles: string[] = [];
        
        // Títulos principales
        if (manga.attributes.title) {
            if (typeof manga.attributes.title === 'string') {
                targetTitles.push(manga.attributes.title);
            } else {
                Object.values(manga.attributes.title).forEach((t: any) => targetTitles.push(t));
            }
        }
        
        // Títulos alternativos
        if (manga.attributes.altTitles && Array.isArray(manga.attributes.altTitles)) {
            manga.attributes.altTitles.forEach((alt: any) => {
                if (typeof alt === 'string') {
                    targetTitles.push(alt);
                } else {
                    Object.values(alt).forEach((t: any) => targetTitles.push(t));
                }
            });
        }

        const normalizedTargets = targetTitles.map(t => normalizeTitle(t)).filter(Boolean);
        if (normalizedTargets.length === 0) return null;

        // 2. Determinar el mejor término de búsqueda
        const searchTitle = (typeof manga.attributes.title === 'string' ? manga.attributes.title : (manga.attributes.title?.['en'] || manga.attributes.title?.['ja-ro'] || targetTitles[0]));

        const isManhwa = manga.attributes?.originalLanguage === 'ko' || manga.attributes?.originalLanguage === 'zh';

        try {
            console.log(`[Intelligence] Searching for accurate match: "${searchTitle}"... (Manhwa: ${isManhwa})`);
            
            // Priority logic based on content type
            if (isManhwa) {
                // For Manhwas/Manhuas, WeebCentral is the absolute best
                const wcResults = await weebcentralService.searchManga(searchTitle as string);
                if (wcResults && wcResults.length > 0) {
                    for (const result of wcResults) {
                        const resultTitle = normalizeTitle(result.attributes?.title?.['en'] || '');
                        const isMatch = normalizedTargets.some(target => 
                            target === resultTitle || 
                            (target.length > 5 && resultTitle.includes(target)) || 
                            (resultTitle.length > 5 && target.includes(resultTitle))
                        );
                        if (isMatch) {
                            console.log(`[Intelligence] ✅ Accurate Manhwa match verified on WeebCentral: "${result.attributes?.title?.['en']}"`);
                            return { id: result.id, source: 'weebcentral' };
                        }
                    }
                }
            } else {
                // For regular Manga, MangaPill is fast
                const mpResults = await mangapillService.searchManga(searchTitle as string);
                if (mpResults && mpResults.length > 0) {
                    for (const result of mpResults) {
                        const resultTitle = normalizeTitle(result.attributes?.title?.['en'] || '');
                        const isMatch = normalizedTargets.some(target => 
                            target === resultTitle || 
                            (target.length > 5 && resultTitle.includes(target)) || 
                            (resultTitle.length > 5 && target.includes(resultTitle))
                        );
                        if (isMatch) {
                            console.log(`[Intelligence] ✅ Accurate Manga match verified on MangaPill: "${result.attributes?.title?.['en']}"`);
                            return { id: result.id, source: 'mangapill' };
                        }
                    }
                }
                
                // Final fallback for Manga to WeebCentral
                const wcResults = await weebcentralService.searchManga(searchTitle as string);
                if (wcResults && wcResults.length > 0) {
                    for (const result of wcResults) {
                        const resultTitle = normalizeTitle(result.attributes?.title?.['en'] || '');
                        const isMatch = normalizedTargets.some(target => 
                            target === resultTitle || 
                            (target.length > 5 && resultTitle.includes(target)) || 
                            (resultTitle.length > 5 && target.includes(resultTitle))
                        );
                        if (isMatch) {
                            console.log(`[Intelligence] ✅ Accurate match verified on WeebCentral (Final Fallback): "${result.attributes?.title?.['en']}"`);
                            return { id: result.id, source: 'weebcentral' };
                        }
                    }
                }
            }
            
            console.warn(`[Intelligence] ⚠️ No accurate match found among results for: ${searchTitle}`);
        } catch (err) {
            console.error('[Intelligence] Fallback search failed:', err);
        }
        return null;
    }
};
