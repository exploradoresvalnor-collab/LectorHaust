import { useState, useCallback } from 'react';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';

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
  const [results, setResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [isDone, setIsDone] = useState(false);
  
  // Completed Mangas State
  const [completedManga, setCompletedManga] = useState<any[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedOffset, setCompletedOffset] = useState(0);
  const [completedGenre, setCompletedGenre] = useState<string>('');
  const [completedLang, setCompletedLang] = useState<string>('es');
  const [completedDemographic, setCompletedDemographic] = useState<string | null>(null);
  const [completedStatus, setCompletedStatus] = useState<string>('completed');
  const [isCompletedDone, setIsCompletedDone] = useState(false);
  
  // Modern Filters
  const [activeFormat, setActiveFormat] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeDemographic, setActiveDemographic] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<string>('relevance');
  const [activeColor, setActiveColor] = useState(false);
  const [completedColor, setCompletedColor] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const { favorites, showNSFW } = useLibraryStore();

  const loadDiscoveryData = useCallback(async () => {
    setLoading(true);
    try {
      const trendingData = await mangadexService.getPopularManga(null, 'es', 24, 0, null, false, showNSFW);
      setTrending(trendingData.data || []);

      if (favorites.length > 0) {
        const suggestedData = await mangadexService.getRecommendations([], 10);
        setSuggestions(suggestedData);
      }
    } catch (err) {
      console.error('Discovery load error:', err);
    } finally {
      setLoading(false);
    }
  }, [favorites, showNSFW]);

  const fetchCompleted = useCallback(async (
    isLoadMore = false, 
    genre = completedGenre, 
    lang = completedLang, 
    demographic = completedDemographic, 
    color = completedColor
  ) => {
    if (!isLoadMore) {
        setCompletedLoading(true);
        setCompletedOffset(0);
        setIsCompletedDone(false);
    }
    
    try {
        const offsetToUse = isLoadMore ? completedOffset : 0;
        const resp = await mangadexService.getFullyTranslatedMasterpieces(null, lang, 15, offsetToUse, genre || null, color, showNSFW);
        
        let newData = resp.data || [];
        
        if (demographic) {
          newData = newData.filter((m: any) => m.attributes.publicationDemographic === demographic);
        }
        
        if (!newData.length) {
            setIsCompletedDone(true);
        } else {
            setCompletedOffset(resp.rawOffsetNext !== undefined ? resp.rawOffsetNext : offsetToUse + 45); 
        }

        if (isLoadMore) {
            setCompletedManga(prev => {
                const existing = new Set(prev.map(m => m.id));
                const unique = newData.filter((m: any) => !existing.has(m.id));
                return [...prev, ...unique];
            });
        } else {
            setCompletedManga(newData);
        }
    } catch (err) {
        console.error("Error fetching completed", err);
    } finally {
        if (!isLoadMore) setCompletedLoading(false);
    }
  }, [completedGenre, completedLang, completedDemographic, completedColor, completedOffset, showNSFW]);

  const loadMoreCompleted = async (e: any) => {
      await fetchCompleted(true);
      e.target.complete();
  };

  const handleSearch = useCallback(async (
    val: string, 
    isMore = false, 
    newFormat?: string | null, 
    newGenre?: string | null, 
    newStatus?: string | null, 
    newDemographic?: string | null, 
    order?: string, 
    color = activeColor
  ) => {
    const searchVal = val !== undefined ? val : query;
    const format = newFormat !== undefined ? newFormat : activeFormat;
    const genre = newGenre !== undefined ? newGenre : activeGenre;
    const status = newStatus !== undefined ? newStatus : activeStatus;
    const demographic = newDemographic !== undefined ? newDemographic : activeDemographic;
    
    setQuery(searchVal);
    
    if ((!searchVal || searchVal.length < 2) && !format && !genre && !status && !demographic && !color) {
      setResults([]);
      return;
    }
    
    if (!isMore) {
      setLoading(true);
      setOffset(0);
      setIsDone(false);
    }

    try {
      const currentOffset = isMore ? offset + 20 : 0;
      const filters: any = { fullColor: color };
      
      if (format) filters.origin = format;
      if (genre && genre !== 'Todos' && genreMapping[genre]) filters.tags = [genreMapping[genre]];
      if (status) filters.status = status;
      if (demographic) filters.demographic = demographic;
      
      const orderParam: any = {};
      orderParam[order || activeOrder] = 'desc';

      const data = await mangadexService.searchManga(searchVal, filters, 20, currentOffset, orderParam, showNSFW);
      
      if (isMore) {
        setResults(prev => [...prev, ...(data.data || [])]);
      } else {
        setResults(data.data || []);
      }

      setOffset(currentOffset);
      if (data.data.length < 20) setIsDone(true);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      if (!isMore) setLoading(false);
    }
  }, [query, activeFormat, activeGenre, activeStatus, activeDemographic, activeOrder, activeColor, offset, showNSFW]);

  const setFormatFilter = (format: string | null) => {
    setActiveFormat(format);
    handleSearch(query, false, format, activeGenre, activeStatus, activeDemographic);
  };

  const setGenreFilter = (genre: string | null) => {
    const newGenre = genre === activeGenre ? null : genre;
    setActiveGenre(newGenre);
    handleSearch(query, false, activeFormat, newGenre, activeStatus, activeDemographic);
  };

  const setStatusFilter = (status: string | null) => {
    const newStatus = status === activeStatus ? null : status;
    setActiveStatus(newStatus);
    handleSearch(query, false, activeFormat, activeGenre, newStatus, activeDemographic);
  };

  const setDemographicFilter = (demographic: string | null) => {
    const newDemographic = demographic === activeDemographic ? null : demographic;
    setActiveDemographic(newDemographic);
    handleSearch(query, false, activeFormat, activeGenre, activeStatus, newDemographic);
  };

  const loadMore = async (e: any) => {
    await handleSearch(query, true);
    e.target.complete();
  };

  return {
    activeSegment,
    setActiveSegment,
    results,
    trending,
    suggestions,
    loading,
    query,
    offset,
    isDone,
    completedManga,
    completedLoading,
    completedGenre,
    setCompletedGenre,
    completedLang,
    setCompletedLang,
    completedDemographic,
    setCompletedDemographic,
    isCompletedDone,
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
    loadDiscoveryData,
    fetchCompleted,
    loadMoreCompleted,
    handleSearch,
    setFormatFilter,
    setGenreFilter,
    setStatusFilter,
    setDemographicFilter,
    loadMore
  };
}
