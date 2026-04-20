import { mangadexService } from './mangadexService';
import { mangapillService } from './mangapillService';
import { weebcentralService } from './weebcentralService';
import { manhwawebService } from './manhwawebService';

/**
 * Sanitiza las descripciones crudas de MangaDex y otras fuentes con lógica agresiva.
 * Elimina enlaces Markdown, créditos de autor/traductor redundantes y basura de formato.
 */
export function sanitizeDescription(text: string): string {
    if (!text) return '';
    
    // 1. Primero eliminamos enlaces Markdown: [Texto](URL) -> Texto
    let clean = text.replace(/\[([^\]]+)\]\([^)]+\)/gi, '$1');
    
    // 2. Dividimos por separadores comunes (--- o ___) y nos quedamos con la primera parte
    // Muchas descripciones de MangaDex ponen los créditos después de una línea divisoria.
    clean = clean.split(/(\r?\n)+\s*(---+|___+)\s*/)[0];
    
    // 3. Eliminamos líneas específicas que suelen contener créditos si no se cortaron antes
    clean = clean.replace(/(\r?\n)+\s*(Character design|Original work|Author|Author\(s\)|Artist|Diseñador|Diseño|Obra original|Credit|Source|Source:|\(Source:|Official Website|Enlace).*$/gis, '');
    
    // 4. Eliminamos formateo Markdown pesado
    clean = clean.replace(/\*\*\*|\*\*|__|`/g, '');
    
    // 5. Limpieza final de separadores y espacios
    clean = clean
        .replace(/---+|___+/g, '')
        .replace(/\r?\n\s*\r?\n\s*\r?\n/g, '\n\n')
        .trim();
        
    return clean;
}

export type MangaSource = 'mangadex' | 'mangapill' | 'weebcentral' | 'manhwaweb';

export interface MangaItem {
  id: string;
  type: string;
  attributes: {
    title: { [key: string]: string } | string;
    description?: { [key: string]: string } | string;
    status?: string;
    originalLanguage?: string;
    lastChapter?: string;
    coverUrl?: string;
    mangaType?: string;
    [key: string]: any;
  };
  relationships?: any[];
  // Haus v3 Omni-Data
  sources?: MangaSource[];
  alternativeIds?: Record<string, string>;
  bestCover?: string;
  [key: string]: any;
}

export interface ChapterItem {
  id: string;
  attributes: {
    chapter: string;
    title?: string;
    translatedLanguage?: string;
    pages?: number;
    externalUrl?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

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

    // 3. Bloqueo de secuelas/spin-offs/novelas (si el resultado tiene estas palabras pero el target no)
    const sequelKeywords = ['ragnarok', 'sequel', 'side story', 'gaiden', 'anthology', 'spin off', 'special', 'arise', 'hunter origin', 'hunter-origin', 'origin', 'reboot', 'remake', 'novel', 'light novel', 'web novel', 'after story', 'prequel'];
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

// Helper: Fusión inteligente de resultados (Haus Omni-Manga v3)
const mergeResults = (results: MangaItem[]): MangaItem[] => {
  const mergedMap = new Map<string, MangaItem>();
  const deLeet = (s: string) => s.replace(/3/g, 'e').replace(/1/g, 'i').replace(/0/g, 'o').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't');

  results.forEach(item => {
    if (!item) return;
    
    // 1. Obtener identificadores únicos (Título Normalizado + ID Externo si existe)
    let titleStr = '';
    const rawTitle = item.attributes?.title || (item as any).name || '';
    if (typeof rawTitle === 'string') titleStr = rawTitle;
    else if (typeof rawTitle === 'object') titleStr = (rawTitle as any)['en'] || (rawTitle as any)['es'] || Object.values(rawTitle)[0] || '';
    
    const titleKey = cleanJunkSuffixes(deLeet(normalizeTitle(titleStr)));
    if (!titleKey) return;

    // Buscamos si ya existe una entrada para este manga
    let existing = mergedMap.get(titleKey);
    
    // Si no existe, comprobamos por coincidencia robusta (fuzzy) con los existentes
    if (!existing) {
        for (const [key, val] of mergedMap.entries()) {
            if (isRobustMatch(titleKey, titleKey, key, key)) {
                existing = val;
                break;
            }
        }
    }

    const source: MangaSource = item.id.startsWith('mp:') ? 'mangapill' : 
                                item.id.startsWith('wc:') ? 'weebcentral' : 
                                item.id.startsWith('mweb:') ? 'manhwaweb' : 'mangadex';

    if (existing) {
        // FUSIONAR: Añadir fuente y IDs alternativos
        if (!existing.sources) existing.sources = [existing.id.startsWith('mp:') ? 'mangapill' : existing.id.startsWith('wc:') ? 'weebcentral' : existing.id.startsWith('mweb:') ? 'manhwaweb' : 'mangadex'];
        if (!existing.sources.includes(source)) {
            existing.sources.push(source);
            if (!existing.alternativeIds) existing.alternativeIds = {};
            existing.alternativeIds[source] = item.id;
        }
        
        // Mantener la mejor descripción si la actual es corta
        const existingDesc = typeof existing.attributes.description === 'string' ? existing.attributes.description : '';
        const newItemDesc = typeof item.attributes.description === 'string' ? item.attributes.description : '';
        if (newItemDesc.length > existingDesc.length) {
            existing.attributes.description = item.attributes.description;
        }

        // Si el item nuevo tiene una portada y no teníamos, o es de mangadex (mejor metadata), la usamos
        if (source === 'mangadex' && !existing.id.startsWith('md:')) {
            // Prioridad a MangaDex para metadatos base
            existing.attributes.status = item.attributes.status || existing.attributes.status;
            existing.attributes.tags = item.attributes.tags || existing.attributes.tags;
        }
    } else {
        // NUEVO: Inicializar con su fuente
        item.sources = [source];
        item.alternativeIds = { [source]: item.id };
        mergedMap.set(titleKey, item);
    }
  });

  return Array.from(mergedMap.values());
};

// Helper: Deduplicar resultados por ID y por título normalizado
const deduplicateResults = (results: MangaItem[]): MangaItem[] => {
  return mergeResults(results); // Redirigir a mergeResults para Haus v3
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
    async searchManga(query: string, filters: any = {}, limit = 20, offset = 0, order?: any, allowNSFW = false, isBackground = false) {
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

            // 🔄 HAUS INTELLIGENT SEARCH PROACTIVE (v3):
            // Lógica de detección proactiva: Solo disparar para títulos específicos (varias palabras)
            // para evitar saturar la red en búsquedas genéricas o de una sola palabra.
            // SI ES BACKGROUND (ej: recomendaciones), la desactivamos totalmente para no saturar.
            const isSpecificSearch = hasQuery && query.trim().split(/\s+/).length >= 3;
            const isDeepSearch = filters.deep || false;
            
            if (!isBackground && (isSpecificSearch || isDeepSearch) && !hasStrictFilters) {
                console.log(`[Search] Haus Intelligence v3: Proactive Parallel Search Activated for "${query}"`);
                
                const proactivePromises = [
                    mangadexService.searchManga(query, { ...filters, lang: 'es' }, limit, offset, order, allowNSFW),
                    mangadexService.searchManga(query, { ...filters, lang: 'en' }, limit, offset, order, allowNSFW),
                    manhwawebService.searchManga(query, filters),
                    weebcentralService.searchManga(query, { ...filters, order: order ? Object.keys(order)[0] : undefined }),
                    mangapillService.searchManga(query, allowNSFW)
                ];

                const results = await Promise.all(proactivePromises);
                
                allResults = results.flatMap((r: any) => r.data || r || []);
            } else {
                // Fallback a cascada clásica para búsquedas genéricas con filtros pesados
                allResults = mdSpanishResults.data || [];
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

    /**
     * Busca un manga por título y verifica su existencia real y disponibilidad de capítulos.
     */
    async fetchVerifiedRecommendation(title: string, allowNSFW = false): Promise<any | null> {
        try {
            const results = await this.searchManga(title, {}, 1, 0, undefined, allowNSFW, true);
            if (!results.data || results.data.length === 0) return null;

            const best = results.data[0];
            
            // Verificación extra: Si es de MangaDex, confirmamos que tenga capítulos
            if (!this.isExternalId(best.id)) {
                const chapters = await mangadexService.getMangaChapters(best.id, 'all', 1);
                if (chapters.data.length === 0) return null;
            }

            return {
                id: best.id,
                hasChapters: true,
                title: this.getLocalizedTitle(best)
            };
        } catch (err) {
            console.warn('[Provider] Verification failed for:', title, err);
            return null;
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


    getLatestUpdatedManga(limit = 12, offset = 0, lang = 'es', type = 'all', allowNSFW = false) {
        return mangadexService.getLatestUpdatedManga(limit, offset, lang, type, allowNSFW);
    },

    async getFullyTranslatedMasterpieces(origin: string | null = null, lang: string | null = 'es', limit = 12, offset = 0, genre: string | null = null, fullColor = false, allowNSFW = false) {
        try {
            // Get completed manga with verified translations
            const results = await mangadexService.searchManga('', {
                status: 'completed',
                lang: lang || 'es',
                origin: origin || undefined,
                tags: genre ? [genre] : undefined,
                fullColor: fullColor
            }, limit, offset, undefined, allowNSFW);
            
            return results;
        } catch (err) {
            console.warn('[Provider] getFullyTranslatedMasterpieces failed:', err);
            return { data: [], pagination: { limit, offset, total: 0 } };
        }
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
        if (service.getChapter) {
            return service.getChapter(this.getInternalId(chapterId));
        }
        // Fallback sintético: extraer lo que se pueda del ID para no romper la navegación
        return Promise.resolve({
            data: {
                id: chapterId,
                type: 'chapter',
                attributes: {
                    chapter: '1',
                    translatedLanguage: 'es'
                },
                relationships: []
            }
        });
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

    getLocalizedStatus(manga: any) {
        if (!manga?.attributes?.status) return 'En emisión';
        const s = manga.attributes.status;
        return s === 'completed' || s === 'finalizado' ? 'Finalizado' : 'En emisión';
    },

    getLocalizedDescription(manga: any) {
        if (!manga?.attributes?.description) return '';
        const desc = manga.attributes.description;
        let rawDesc = '';
        if (typeof desc === 'string') {
            rawDesc = desc;
        } else {
            rawDesc = desc['es-la'] || desc['es'] || desc['en'] || Object.values(desc)[0] || '';
        }
        return sanitizeDescription(rawDesc);
    },

    getOptimizedUrl(url: string) {
        return mangadexService.getOptimizedUrl(url);
    },

    getProxiedUrl(url: string) {
        return mangadexService.getProxiedUrl(url);
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

        // Helper: match results against target titles
        const matchResults = (results: any[]) => {
            const matched: { id: string, source: MangaSource }[] = [];
            for (const result of results) {
                const resultTitle = result.attributes?.title?.['en'] || result.attributes?.title?.['es'] || '';
                const resultNom = normalizeTitle(resultTitle);
                const resultDeleeted = deLeet(resultNom);
                
                const isMatch = normalizedTargets.some((target, idx) => {
                    const targetDeleeted = deLeetedTargets[idx];
                    return isRobustMatch(target, targetDeleeted, resultNom, resultDeleeted);
                });
                
                if (isMatch && !seenCandidateIds.has(result.id)) {
                    const source: MangaSource = result.id.startsWith('mweb:') ? 'manhwaweb' : 
                                                result.id.startsWith('wc:') ? 'weebcentral' : 
                                                result.id.startsWith('mp:') ? 'mangapill' : 'mangadex';
                    matched.push({ id: result.id, source });
                    seenCandidateIds.add(result.id);
                }
            }
            return matched;
        };

        try {
            // Prioritize English/romaji titles (most likely to match on external sources like WeebCentral/MangaPill)
            const titleObj = manga.attributes.title || {};
            const englishTitle = typeof titleObj === 'string' ? titleObj : (titleObj['en'] || '');
            const romajiTitle = typeof titleObj === 'string' ? '' : (titleObj['ja-ro'] || '');
            const altEnglish = (manga.attributes.altTitles || [])
                .map((alt: any) => typeof alt === 'string' ? alt : (alt['en'] || alt['es-la'] || alt['es'] || ''))
                .filter((t: string) => t.length > 2 && /^[a-zA-Z]/.test(t)); // Only latin-script titles
            
            // Build priority queue: English > Romaji > Alt English > Others
            const prioritizedQueries = [
                ...new Set([
                    englishTitle,
                    romajiTitle,
                    ...altEnglish,
                    searchTitle, // Original searchTitle as last resort
                    ...targetTitles
                ])
            ].filter(q => q && (q as string).length > 2).slice(0, 4);
            
            for (const query of prioritizedQueries) {
                console.log(`[Intelligence] 🌐 Searching "${query}" on ALL sources in parallel...`);
                
                // 🚀 PARALLEL SEARCH: All sources at once instead of sequential
                const searchPromises: Promise<any[]>[] = [
                    // 1. ManhwaWeb (ES) - highest priority for Spanish content
                    manhwawebService.searchManga(query as string).catch(() => []),
                    // 2. MangaPill (EN) 
                    mangapillService.searchManga(query as string).catch(() => [])
                ];
                
                // 3. WeebCentral only for Manhwa/Manhua
                if (isManhwa) {
                    searchPromises.push(
                        weebcentralService.searchManga(query as string).catch(() => [])
                    );
                }

                // Race with a 12s timeout to prevent infinite loading
                const timeoutPromise = new Promise<any[][]>(resolve => 
                    setTimeout(() => resolve(searchPromises.map(() => [])), 25000)
                );

                const results = await Promise.race([
                    Promise.all(searchPromises),
                    timeoutPromise
                ]);

                const [mwebResults, mpResults, wcResults] = results;

                // Match and collect candidates
                if (mwebResults?.length) candidates.push(...matchResults(mwebResults));
                if (wcResults?.length) candidates.push(...matchResults(wcResults));
                if (mpResults?.length) candidates.push(...matchResults(mpResults));
                
                // 🚀 SMART EARLY RETURN: Only stop if we have MULTIPLE candidates 
                // (single candidate might 404, so keep looking for backups)
                if (candidates.length >= 2) {
                    console.log(`[Intelligence] ✅ Found ${candidates.length} candidates for "${query}". Stopping search.`);
                    break;
                }
            }
        } catch (err) {
            console.error('[Intelligence] Fallback search failed:', err);
        }
        
        return candidates;
    }
};
