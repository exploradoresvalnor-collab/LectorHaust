import { mangadexService } from './mangadexService';
import { mangapillService } from './mangapillService';
import { weebcentralService } from './weebcentralService';
import { manhwawebService } from './manhwawebService';

export type MangaSource = 'mangadex' | 'mangapill' | 'weebcentral' | 'manhwaweb';

let currentSource: MangaSource = 'mangadex';

// Helper: Normalizar títulos para comparación robusta
const normalizeTitle = (title: any): string => {
  try {
      if (title === null || title === undefined) return '';
      const safeTitle = typeof title === 'string' ? title : String(title);
      if (!safeTitle || typeof safeTitle.toLowerCase !== 'function') return '';
      
      return safeTitle
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Limpiar acentos
          .replace(/[^a-z0-9\s]/g, '')     // Solo alfanumérico y espacios
          .replace(/\s+/g, ' ')            // Espacios únicos
          .trim();
  } catch (e) {
      console.error('[normalizeTitle] Critical failure:', e, 'Input:', title);
      return '';
  }
};

// Helper: Limpiar sufijos comunes de capítulos/escaneos para comparación de títulos
const cleanJunkSuffixes = (title: string): string => {
    // Eliminar: "Capitulo X", "Chapter X", "Ch.X", "Ep.X", "Scan", etc.
    const junkRegex = / (capitulo|chapter|cap|ch|episode|ep|scan|tv|vol|volume)[\s-]*\d+(\.\d+)?/gi;
    return title.replace(junkRegex, '').replace(/\s+/g, ' ').trim();
};

// Helper: Coincidencia Robusta de Títulos
const isRobustMatch = (targetNom: string, targetDeleet: string, resultNom: string, resultDeleet: string): boolean => {
    // 1. Coincidencia exacta o de-leeted
    if (targetNom === resultNom || targetDeleet === resultDeleet) return true;

    // 2. Limpieza de sufijos (Capítulo 15, etc)
    const cleanResult = cleanJunkSuffixes(resultNom);
    const cleanResultDeleet = cleanJunkSuffixes(resultDeleet);
    
    if (targetNom === cleanResult || targetDeleet === cleanResultDeleet) return true;

    // 3. Bloqueo de secuelas/spin-offs (si el resultado tiene estas palabras pero el target no)
    const sequelKeywords = ['ragnarok', 'sequel', 'side story', 'gaiden', 'anthology', 'spin off', 'special', 'arise', 'hunter origin', 'hunter-origin', 'origin', 'reboot', 'remake'];
    const resultHasSequel = sequelKeywords.some(word => resultNom.includes(word));
    const targetHasSequel = sequelKeywords.some(word => targetNom.includes(word));
    if (resultHasSequel && !targetHasSequel) return false;

    // 4. Coincidencia de prefijo (si es casi igual pero tiene algo al final no captado por junkRegex)
    if (resultNom.startsWith(targetNom) && (resultNom.length - targetNom.length) < 12) return true;
    if (targetNom.startsWith(resultNom) && (targetNom.length - resultNom.length) < 12) return true;

    // 5. Soporte para prefijo deleeted
    if (resultDeleet.startsWith(targetDeleet) && (resultDeleet.length - targetDeleet.length) < 12) return true;

    return false;
};

// Helper: Deduplicar resultados por ID y por título normalizado (resistente a leetspeak y duplicidad entre fuentes)
const deduplicateResults = (results: any[]): any[] => {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  
  // Leetspeak mapping to handle 'Solo L3vel1ng' -> 'solo leveling'
  const deLeet = (s: string) => s.replace(/3/g, 'e').replace(/1/g, 'i').replace(/0/g, 'o').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');

  return results.filter(item => {
    if (!item) return false;
    const id = item.id;
    
    // Safely extract the title string before normalizing
    let titleStr = '';
    const rawTitle = item.attributes?.title || item.name || '';
    if (typeof rawTitle === 'string') {
        titleStr = rawTitle;
    } else if (typeof rawTitle === 'object' && rawTitle !== null) {
        titleStr = rawTitle['en'] || rawTitle['es'] || Object.values(rawTitle)[0] as string || '';
    }
    
    const titleNom = normalizeTitle(titleStr);
    const titleDeleeted = deLeet(titleNom);
    const cleanTitle = cleanJunkSuffixes(titleDeleeted);
    
    // Descartar si el ID ya existe
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    
    // Descartar si el título limpio (deleeted y sin caps) ya existe
    if (cleanTitle && seenTitles.has(cleanTitle)) return false;
    if (cleanTitle) seenTitles.add(cleanTitle);
    
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
            if (saved === 'mangadex' || saved === 'mangapill' || saved === 'weebcentral' || saved === 'manhwaweb') {
                currentSource = saved;
            }
        }
        return currentSource;
    },

    isExternalId(id: string) {
        return id && (id.startsWith('mp:') || id.startsWith('wc:') || id.startsWith('mweb:'));
    },

    // --- UTILS ---
    
    getInternalId(id: string) {
        if (!id) return id;
        if (id.startsWith('mp:')) return id.substring(3);
        if (id.startsWith('wc:')) return id.substring(3);
        if (id.startsWith('mweb:')) return id.substring(5);
        return id;
    },

    getServiceForId(id: string) {
        if (!id) return mangadexService;
        if (id.startsWith('mp:')) return mangapillService as any;
        if (id.startsWith('wc:')) return weebcentralService as any;
        if (id.startsWith('mweb:')) return manhwawebService as any;
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
            
            const hasStrictFilters = filters.demographic || filters.status || (filters.tags && filters.tags.length > 0) || filters.fullColor;
            const hasQuery = query && query.trim().length > 1;

            // 🔄 HAUS INTELLIGENT SEARCH (v2):
            // Si hay pocos resultados O el usuario busca específicamente Manhwa/Manhua/Manga,
            // activamos la cascada inteligente hacia fuentes externas.
            const isManhwaSearch = filters.origin === 'ko';
            const isManhuaSearch = filters.origin === 'zh';
            const isMangaSearch = filters.origin === 'ja';
            
            if ((allResults.length < 10 || isManhwaSearch || isManhuaSearch || isMangaSearch) && hasQuery && !hasStrictFilters) {
                console.log(`[Search] Low results or specific origin (${filters.origin}). Triggering Haus Intelligence...`);
                
                // Intelligent Source Selection:
                // Map the results back to their variables
                const fallbackPromises = [
                    mangadexService.searchManga(query, { ...filters, lang: 'en' }, limit, offset, order, allowNSFW),
                    manhwawebService.searchManga(query, filters),
                    weebcentralService.searchManga(query, { ...filters, order: order ? Object.keys(order)[0] : undefined }),
                    mangapillService.searchManga(query, allowNSFW)
                ];
                const [mdEnglishResults, mwebResults, wcResults, mpResults] = await Promise.all(fallbackPromises);

                allResults = [
                    ...allResults,
                    ...(mwebResults as any[] || []), // ManhwaWeb (ES) comes before EN sources
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
   
    async getPopularManga(origin: string | null = null, lang: string | null = 'es', limit = 12, offset = 0, genre: string | null = null, fullColor = false, allowNSFW = false) {
        try {
            const mdResp = await mangadexService.getPopularManga(origin, lang, limit, offset, genre, fullColor, allowNSFW);
            
            // Enrichment with ManhwaWeb for Spanish rankings
            if (lang === 'es' && offset === 0 && (!origin || origin === 'ko')) {
                const mwebTop = await manhwawebService.getTopWeekly();
                if (mwebTop && mwebTop.length > 0) {
                    // Normalize for mapping
                    const mappedMweb = mwebTop.map((m: any) => ({
                        id: m.id,
                        type: 'manga',
                        attributes: {
                            title: m.attributes.title,
                            originalLanguage: 'ko',
                            status: 'ongoing',
                            tags: []
                        },
                        _mwebCover: m._mwebCover,
                        _mwebSlug: m._mwebSlug
                    }));
                    
                    // Prepend/Merge (MangaDex results are generally higher quality, but mweb has the "missing" ones)
                    const combined = deduplicateResults([...mappedMweb.slice(0, 6), ...mdResp.data]);
                    return { ...mdResp, data: combined.slice(0, limit) };
                }
            }
            
            return mdResp;
        } catch (err) {
            console.warn('[Provider] popular manga fetch failed, falling back:', err);
            return mangadexService.getPopularManga(origin, lang, limit, offset, genre, fullColor, allowNSFW);
        }
    },

    getTopWeekly() {
        return manhwawebService.getTopWeekly();
    },

    getTopGlobal() {
        return manhwawebService.getTopGlobal();
    },

    getLatestUpdatedManga(limit = 12, offset = 0, lang = 'es', type = 'all', allowNSFW = false) {
        return mangadexService.getLatestUpdatedManga(limit, offset, lang, type, allowNSFW);
    },

    async getFullyTranslatedMasterpieces(origin: string | null = null, lang = 'es', limit = 10, offset = 0, genre: string | null = null, fullColor = false, allowNSFW = false) {
        const mdResp = await mangadexService.getFullyTranslatedMasterpieces(origin, lang, limit, offset, genre, fullColor, allowNSFW);
        
        // No specific masterpiece endpoint on ManhwaWeb, so we just return MD results for now
        // But we could enrich with global top if needed
        return mdResp;
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
            let rawData: any = { data: [], total: 0 };

            if (providerStr === 'mp' || mangaId.startsWith('mp:')) {
                rawData = await mangapillService.getMangaChapters(mangaId, lang, limit, offset, order);
            } else if (providerStr === 'wc' || mangaId.startsWith('wc:')) {
                rawData = await weebcentralService.getMangaChapters(mangaId);
            } else if (providerStr === 'mweb' || mangaId.startsWith('mweb:')) {
                rawData = await manhwawebService.getMangaChapters(mangaId);
            }
            
            // Client-side sorting for external providers that return everything at once
            if (rawData?.data && rawData.data.length > 0) {
               rawData.data.sort((a: any, b: any) => {
                 const chapA = parseFloat(a.attributes?.chapter || '0');
                 const chapB = parseFloat(b.attributes?.chapter || '0');
                 return order === 'asc' ? chapA - chapB : chapB - chapA;
               });
            }
            return rawData;
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

    getCoverUrl(manga: any, quality: 'original' | '256' | '512' = '256', aniListCover?: string) {
        if (aniListCover) return aniListCover;
        
        if (!manga) return 'https://placehold.co/512x768/222222/cccccc?text=Sin+Portada';
        
        // ManhwaWeb has its own cover URL format
        if (manga._mwebCover) return manga._mwebCover;
        if (manga.id?.startsWith('mweb:')) {
            const coverRel = manga.relationships?.find((rel: any) => rel.type === 'cover_art');
            if (coverRel?.attributes?.fileName) return coverRel.attributes.fileName;
        }
        
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
    
    async findBestExternalSources(manga: any): Promise<{ id: string, source: MangaSource }[]> {
        if (!manga || !manga.attributes) return [];
        
        const candidates: { id: string, source: MangaSource }[] = [];
        const seenCandidateIds = new Set<string>();

        // 1. Recopilar todos los títulos posibles (Principal + Alternativos)
        const targetTitles: string[] = [];
        if (manga.attributes.title) {
            if (typeof manga.attributes.title === 'string') {
                targetTitles.push(manga.attributes.title);
            } else {
                Object.values(manga.attributes.title).forEach((t: any) => targetTitles.push(t));
            }
        }
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
        if (normalizedTargets.length === 0) return [];

        const searchTitle = (typeof manga.attributes.title === 'string' ? manga.attributes.title : (manga.attributes.title?.['en'] || manga.attributes.title?.['ja-ro'] || targetTitles[0]));
        const isManhwa = manga.attributes?.originalLanguage === 'ko' || manga.attributes?.originalLanguage === 'zh';
        
        // Leetspeak mapping to handle 'Solo L3vel1ng' -> 'solo leveling'
        const deLeet = (s: string) => s.replace(/3/g, 'e').replace(/1/g, 'i').replace(/0/g, 'o').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');
        const deLeetedTargets = normalizedTargets.map(t => deLeet(t));

        try {
            const searchQueries = [...new Set([searchTitle, ...targetTitles])].filter(q => q && (q as string).length > 2);
            
            for (const query of searchQueries) {
                console.log(`[Intelligence] 🌐 Searching "${query}" on external sources...`);
                
                // --- 1. ManhwaWeb (ES) ---
                try {
                    const mwebResults = await manhwawebService.searchManga(query as string);
                    if (mwebResults && mwebResults.length > 0) {
                        for (const result of mwebResults) {
                            const resultTitle = result.attributes?.title?.['en'] || result.attributes?.title?.['es'] || '';
                            const resultNom = normalizeTitle(resultTitle);
                            const resultDeleeted = deLeet(resultNom);
                            
                            const isMatch = normalizedTargets.some((target, idx) => {
                                const targetDeleeted = deLeetedTargets[idx];
                                return isRobustMatch(target, targetDeleeted, resultNom, resultDeleeted);
                            });
                            
                            if (isMatch && !seenCandidateIds.has(result.id)) {
                                candidates.push({ id: result.id, source: 'manhwaweb' });
                                seenCandidateIds.add(result.id);
                            }
                        }
                    }
                } catch (e) { }

                // --- 2. WeebCentral (Manhwas/Manhuas) ---
                if (isManhwa) {
                    try {
                        const wcResults = await weebcentralService.searchManga(query as string);
                        if (wcResults && wcResults.length > 0) {
                            for (const result of wcResults) {
                                const resultTitle = result.attributes?.title?.['en'] || '';
                                const resultNom = normalizeTitle(resultTitle);
                                const resultDeleeted = deLeet(resultNom);

                                const isMatch = normalizedTargets.some((target, idx) => {
                                    const targetDeleeted = deLeetedTargets[idx];
                                    return isRobustMatch(target, targetDeleeted, resultNom, resultDeleeted);
                                });

                                if (isMatch && !seenCandidateIds.has(result.id)) {
                                    candidates.push({ id: result.id, source: 'weebcentral' });
                                    seenCandidateIds.add(result.id);
                                }
                            }
                        }
                    } catch (e) { }
                }

                // --- 3. MangaPill ---
                try {
                    const mpResults = await mangapillService.searchManga(query as string);
                    if (mpResults && mpResults.length > 0) {
                        for (const result of mpResults) {
                            const resultTitle = result.attributes?.title?.['en'] || '';
                            const resultNom = normalizeTitle(resultTitle);
                            const resultDeleeted = deLeet(resultNom);

                            const isMatch = normalizedTargets.some((target, idx) => {
                                const targetDeleeted = deLeetedTargets[idx];
                                return isRobustMatch(target, targetDeleeted, resultNom, resultDeleeted);
                            });

                            if (isMatch && !seenCandidateIds.has(result.id)) {
                                candidates.push({ id: result.id, source: 'mangapill' });
                                seenCandidateIds.add(result.id);
                            }
                        }
                    }
                } catch (e) { }
            }
        } catch (err) {
            console.error('[Intelligence] Fallback search failed:', err);
        }
        
        return candidates;
    }
};
