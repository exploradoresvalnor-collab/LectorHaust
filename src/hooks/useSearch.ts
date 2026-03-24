import { useState, useCallback, useMemo } from 'react';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { getDefaultLanguage } from '../utils/translations';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export const FORMATS = [
  { label: 'Todos', value: null },
  { label: 'Manga 🇯🇵', value: 'ja' },
  { label: 'Manhwa 🇰🇷', value: 'ko' },
  { label: 'Manhua 🇨🇳', value: 'zh' },
  { label: 'Western 🇺🇸', value: 'en' },
  { label: 'Francés 🇫🇷', value: 'fr' },
  { label: 'Vietnamita 🇻🇳', value: 'vi' },
  { label: 'Tailandés 🇹🇭', value: 'th' },
  { label: 'Ruso 🇷🇺', value: 'ru' },
  { label: 'Indonesio 🇮🇩', value: 'id' }
];

export const LANGUAGES = [
  { label: 'Español', value: 'es' },
  { label: 'Inglés', value: 'en' },
  { label: 'Portugués (BR)', value: 'pt-br' },
  { label: 'Francés', value: 'fr' },
  { label: 'Italiano', value: 'it' },
  { label: 'Alemán', value: 'de' },
  { label: 'Ruso', value: 'ru' },
  { label: 'Turco', value: 'tr' },
  { label: 'Vietnamita', value: 'vi' },
  { label: 'Tailandés', value: 'th' },
  { label: 'Indonesio', value: 'id' },
  { label: 'Polaco', value: 'pl' },
  { label: 'Árabe', value: 'ar' }
];

export const STATUSES = [
  { label: 'Publicando', value: 'ongoing' },
  { label: 'Finalizado', value: 'completed' },
  { label: 'Pausa', value: 'hiatus' },
  { label: 'Cancelado', value: 'cancelled' }
];

export const DEMOGRAPHICS = [
  { label: 'Todos', value: null },
  { label: 'Shounen', value: 'shounen' },
  { label: 'Shoujo', value: 'shoujo' },
  { label: 'Seinen', value: 'seinen' },
  { label: 'Josei', value: 'josei' }
];

export const ORDERS = [
  { label: 'Relevancia', value: 'relevance' },
  { label: 'Más Vistos', value: 'followedCount' },
  { label: 'Más Recientes', value: 'latestUploadedChapter' },
  { label: 'Mejor Calificados', value: 'rating' }
];

export const GENRES = [
  'Todos', 'Acción', 'Romance', 'Fantasía', 'Comedia', 'Drama', 'Sci-Fi', 'Misterio', 'Terror', 
  'Aventura', 'Deportes', 'Sobrenatural', 'Psicológico', 'Histórico', 'Cocina', 'Música', 
  'Mecha', 'Vida Escolar', 'Gore', 'Crimen', 'Magical Girls', 'Isekai', 'Recuentos de la vida', 
  'Thriller', 'Médico', 'Filosofía'
];

export const genreMapping: Record<string, string> = {
  'Acción': 'action',
  'Romance': 'romance',
  'Fantasía': 'fantasy',
  'Comedia': 'comedy',
  'Drama': 'drama',
  'Sci-Fi': 'sci-fi',
  'Misterio': 'mystery',
  'Terror': 'horror',
  'Aventura': 'adventure',
  'Deportes': 'sports',
  'Sobrenatural': 'supernatural',
  'Psicológico': 'psychological',
  'Histórico': 'historical',
  'Cocina': 'cooking',
  'Música': 'music',
  'Mecha': 'mecha',
  'Vida Escolar': 'school life',
  'Gore': 'gore',
  'Crimen': 'crime',
  'Magical Girls': 'magical girls',
  'Isekai': 'isekai',
  'Recuentos de la vida': 'slice of life',
  'Thriller': 'thriller',
  'Médico': 'medical',
  'Filosofía': 'philosophical'
};

export function useSearch() {
  const [activeSegment, setActiveSegment] = useState('trending');
  const [query, setQuery] = useState('');
  
  // Completed Filters
  const [completedGenre, setCompletedGenre] = useState<string>('');
  const [completedLang, setCompletedLang] = useState<string>(getDefaultLanguage());
  const [completedDemographic, setCompletedDemographic] = useState<string | null>(null);
  const [completedColor, setCompletedColor] = useState(false);
  
  // Search Filters
  const [activeFormat, setActiveFormat] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeDemographic, setActiveDemographic] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<string>('relevance');
  const [activeColor, setActiveColor] = useState(false);
  
  const [showFilters, setShowFilters] = useState(true);

  // Trending Filters
  const [trendingOrigin, setTrendingOrigin] = useState<string | null>(null);
  const [trendingLang, setTrendingLang] = useState<string | null>('es');

  const { favorites, showNSFW } = useLibraryStore();

  // --- 1. TRENDING (Infinite Query) ---
  const {
    data: trendingData,
    fetchNextPage: fetchNextTrending,
    hasNextPage: hasNextTrending,
    isFetchingNextPage: isFetchingMoreTrending,
    isLoading: loadingTrending
  } = useInfiniteQuery({
    queryKey: ['trendingManga', trendingOrigin, trendingLang, showNSFW],
    queryFn: ({ pageParam = 0 }) => 
      mangaProvider.getPopularManga(trendingOrigin, trendingLang || 'all', 16, pageParam as number, null, false, showNSFW),
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      return lastPage.data?.length === 16 ? allPages.length * 16 : undefined;
    },
    enabled: activeSegment === 'trending', // STAGGERED
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  const trending = useMemo(() => {
    const raw = trendingData?.pages.flatMap(p => p.data || []) || [];
    const seen = new Set();
    return raw.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [trendingData]);
  const trendingHero = useMemo(() => trending.slice(0, 6), [trending]);

  // --- 2. COMPLETED (Infinite Query) ---
  const {
    data: completedData,
    fetchNextPage: fetchNextCompleted,
    hasNextPage: hasNextCompleted,
    isFetchingNextPage: isFetchingMoreCompleted,
    isLoading: loadingCompleted
  } = useInfiniteQuery({
    queryKey: ['completedManga', completedLang, completedGenre, completedColor, completedDemographic, showNSFW],
    queryFn: async ({ pageParam = 0 }) => {
      const resp = await mangaProvider.getFullyTranslatedMasterpieces(null, completedLang, 12, pageParam as number, completedGenre || null, completedColor, showNSFW);
      let data = resp.data || [];
      if (completedDemographic) {
        data = data.filter((m: any) => m.attributes.publicationDemographic === completedDemographic);
      }
      return { ...resp, data };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages: any[]) => {
       return lastPage.data?.length >= 10 ? allPages.length * 12 : undefined;
    },
    enabled: activeSegment === 'completed', // STAGGERED
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  const completedManga = useMemo(() => {
    const raw = completedData?.pages.flatMap(p => p.data || []) || [];
    const seen = new Set();
    return raw.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [completedData]);

  // --- 3. SEARCH RESULTS (Infinite Query) ---
  const {
    data: searchData,
    fetchNextPage: fetchNextSearch,
    hasNextPage: hasNextSearch,
    isFetchingNextPage: isFetchingMoreSearch,
    isLoading: loadingSearch
  } = useInfiniteQuery({
    queryKey: ['searchManga', query, activeFormat, activeGenre, activeStatus, activeDemographic, activeOrder, activeColor, showNSFW],
    queryFn: async ({ pageParam = 0 }) => {
      if (!query && !activeFormat && !activeGenre && !activeStatus && !activeDemographic && !activeColor) {
        return { data: [] };
      }
      const filters: any = { fullColor: activeColor };
      if (activeFormat) filters.origin = activeFormat;
      if (activeGenre && activeGenre !== 'Todos' && genreMapping[activeGenre]) filters.tags = [genreMapping[activeGenre]];
      if (activeStatus) filters.status = activeStatus;
      if (activeDemographic) filters.demographic = activeDemographic;
      
      const orderParam: any = { [activeOrder]: 'desc' };
      return mangaProvider.searchManga(query, filters, 16, pageParam as number, orderParam, showNSFW);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      return lastPage.data?.length === 16 ? allPages.length * 16 : undefined;
    },
    enabled: activeSegment === 'search' && !!(query || activeFormat || activeGenre || activeStatus || activeDemographic || activeColor), // STAGGERED
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  const results = useMemo(() => {
    const raw = searchData?.pages.flatMap(p => p.data || []) || [];
    const seen = new Set();
    return raw.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [searchData]);

  // --- 4. SUGGESTIONS ---
  const { data: suggestionsData } = useQuery({
    queryKey: ['suggestions', showNSFW],
    queryFn: () => mangaProvider.getLatestUpdatedManga(16, 0, 'es', 'all', showNSFW),
    enabled: activeSegment === 'search' && !query, // Only fetch suggestions if in search mode and no query
    staleTime: 1000 * 60 * 10, // 10 mins
  });

  const suggestions = useMemo(() => suggestionsData?.data || [], [suggestionsData]);

  // Handlers
  const handleSearch = useCallback((val: string) => {
    setQuery(val);
  }, []);

  const setFormatFilter = useCallback((format: string | null) => setActiveFormat(format), []);
  const setGenreFilter = useCallback((genre: string | null) => setActiveGenre(prev => prev === genre ? null : genre), []);
  const setStatusFilter = useCallback((status: string | null) => setActiveStatus(prev => prev === status ? null : status), []);
  const setDemographicFilter = useCallback((demographic: string | null) => setActiveDemographic(prev => prev === demographic ? null : demographic), []);

  const loadMore = useCallback(async (e: any) => {
    if (hasNextSearch) await fetchNextSearch();
    e.target.complete();
  }, [fetchNextSearch, hasNextSearch]);

  const loadMoreTrending = useCallback(async (e: any) => {
    if (hasNextTrending) await fetchNextTrending();
    e.target.complete();
  }, [fetchNextTrending, hasNextTrending]);

  const loadMoreCompleted = useCallback(async (e: any) => {
    if (hasNextCompleted) await fetchNextCompleted();
    e.target.complete();
  }, [fetchNextCompleted, hasNextCompleted]);

  return {
    activeSegment,
    setActiveSegment,
    results,
    trending,
    trendingHero,
    suggestions,
    loading: loadingSearch,
    trendingLoading: loadingTrending,
    isTrendingDone: !hasNextTrending,
    query,
    offset: 0, // Not needed with InfiniteQuery
    isDone: !hasNextSearch,
    completedManga,
    completedLoading: loadingCompleted,
    completedGenre,
    setCompletedGenre,
    completedLang,
    setCompletedLang,
    completedDemographic,
    setCompletedDemographic,
    isCompletedDone: !hasNextCompleted,
    activeFormat,
    activeGenre,
    activeStatus,
    activeDemographic,
    activeOrder,
    setActiveOrder,
    activeColor,
    setActiveColor,
    completedColor,
    setCompletedColor,
    showFilters,
    setShowFilters,
    favorites,
    loadDiscoveryData: () => {}, // Handled by useInfiniteQuery
    fetchCompleted: () => {}, // Handled by useInfiniteQuery
    loadMoreCompleted,
    handleSearch,
    setFormatFilter,
    setGenreFilter,
    setStatusFilter,
    setDemographicFilter,
    loadMore,
    loadMoreTrending,
    trendingOrigin,
    setTrendingOrigin,
    trendingLang,
    setTrendingLang
  };
}
