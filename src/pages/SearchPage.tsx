import React, { useState, useEffect } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar, 
  IonSearchbar, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonSpinner, 
  IonText,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonChip,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonButton,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { trendingUpOutline, sparklesOutline, searchOutline, heartOutline, filterOutline } from 'ionicons/icons';
import MangaCard from '../components/MangaCard';
import LoadingScreen from '../components/LoadingScreen';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import './SearchPage.css';

const SearchPage: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState('trending');
  const [results, setResults] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [isDone, setIsDone] = useState(false);
  
  // Modern Filters
  const [activeFormat, setActiveFormat] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [activeDemographic, setActiveDemographic] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true); // Control visibility on mobile

  const FORMATS = [
    { label: 'Todos', value: null },
    { label: 'Manga', value: 'ja' },
    { label: 'Manhwa', value: 'ko' },
    { label: 'Manhua', value: 'zh' }
  ];

  const STATUSES = [
    { label: 'Publicando', value: 'ongoing' },
    { label: 'Finalizado', value: 'completed' },
    { label: 'Pausa', value: 'hiatus' },
    { label: 'Cancelado', value: 'cancelled' }
  ];

  const DEMOGRAPHICS = [
    { label: 'Shounen', value: 'shounen' },
    { label: 'Shoujo', value: 'shoujo' },
    { label: 'Seinen', value: 'seinen' },
    { label: 'Josei', value: 'josei' }
  ];

  const GENRES = ['Acción', 'Romance', 'Fantasía', 'Comedia', 'Drama', 'Sci-Fi', 'Misterio', 'Terror', 'Aventura'];

  // Map Spanish names to English names for the API
  const genreMapping: Record<string, string> = {
    'Acción': 'action',
    'Romance': 'romance',
    'Fantasía': 'fantasy',
    'Comedia': 'comedy',
    'Drama': 'drama',
    'Sci-Fi': 'sci-fi',
    'Misterio': 'mystery',
    'Terror': 'horror',
    'Aventura': 'adventure'
  };
  
  const router = useIonRouter();
  const { favorites } = useLibraryStore();

  const loadDiscoveryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Trending - Increase limit for grid populating
      const trendingData = await mangadexService.getPopularManga(null, 'es', 24, 0);
      setTrending(trendingData.data || []);

      // 2. Fetch Suggestions if favorites exist
      if (favorites.length > 0) {
        // Just use first fav's title or random tags for now as MD doesn't have a direct "similar" endpoint
        // In a real pro app, we'd extract tags, but here we use popularity as backup
        const suggestedData = await mangadexService.getRecommendations([], 10);
        setSuggestions(suggestedData);
      }
    } catch (err) {
      console.error('Discovery load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    if (trending.length === 0) loadDiscoveryData();
  });

  const handleSearch = async (val: string, isMore = false, newFormat?: string | null, newGenre?: string | null, newStatus?: string | null, newDemographic?: string | null) => {
    // Determine the current values based on arguments or existing state
    const searchVal = val !== undefined ? val : query;
    const format = newFormat !== undefined ? newFormat : activeFormat;
    const genre = newGenre !== undefined ? newGenre : activeGenre;
    const status = newStatus !== undefined ? newStatus : activeStatus;
    const demographic = newDemographic !== undefined ? newDemographic : activeDemographic;
    
    setQuery(searchVal);
    
    // We can search if there's text OR if a filter is active
    if ((!searchVal || searchVal.length < 2) && !format && !genre && !status && !demographic) {
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
      
      const filters: any = {};
      if (format) filters.origin = format;
      if (genre && genreMapping[genre]) filters.tags = [genreMapping[genre]];
      if (status) filters.status = status;
      if (demographic) filters.demographic = demographic;

      const data = await mangadexService.searchManga(searchVal, filters, 20, currentOffset);
      
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
  };

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

  const clearFilters = () => {
    setActiveFormat(null);
    setActiveGenre(null);
    setActiveStatus(null);
    setActiveDemographic(null);
    setResults([]);
    // We don't clear the query unless really needed, or we clear it too
  };

  const loadMore = async (e: any) => {
    await handleSearch(query, true);
    e.target.complete();
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="glass-effect" style={{ padding: '10px 0' }}>
          <IonSegment value={activeSegment} onIonChange={e => setActiveSegment(e.detail.value as string)} mode="md" className="custom-segment">
            <IonSegmentButton value="trending">
              <IonIcon icon={trendingUpOutline} />
              <IonLabel>Tendencias</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="suggestions">
              <IonIcon icon={sparklesOutline} />
              <IonLabel>Sugerencias</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="search">
              <IonIcon icon={searchOutline} />
              <IonLabel>Buscar</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {activeSegment === 'search' && (
          <div className="search-section animate-fade-in">
            <div className="search-header-container">
              <div className="search-bar-row">
                <IonSearchbar 
                  placeholder="¿Qué quieres leer hoy?" 
                  onIonInput={(e) => handleSearch(e.detail.value!)}
                  debounce={500}
                  className="custom-searchbar floating-search"
                />
                <IonButton 
                  fill="clear" 
                  className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <IonIcon icon={filterOutline} slot="icon-only" />
                </IonButton>
              </div>
              
              <div className={`filters-container-pro ${showFilters ? 'expanded' : 'collapsed'}`}>
                <div className="filter-group">
                  <span className="filter-label">Formato</span>
                  <div className="filter-row">
                    {FORMATS.map(fmt => (
                      <IonChip 
                        key={fmt.label || 'all'} 
                        className={activeFormat === fmt.value ? 'chip-active' : 'chip-pro'}
                        onClick={() => setFormatFilter(fmt.value)}
                      >
                        <IonLabel>{fmt.label}</IonLabel>
                      </IonChip>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Demografía</span>
                  <div className="filter-row">
                    {DEMOGRAPHICS.map(d => (
                      <IonChip 
                        key={d.value} 
                        className={activeDemographic === d.value ? 'chip-active' : 'chip-pro'}
                        onClick={() => setDemographicFilter(d.value)}
                      >
                        <IonLabel>{d.label}</IonLabel>
                      </IonChip>
                    ))}
                  </div>
                </div>

                <div className="filter-group">
                  <span className="filter-label">Estado</span>
                  <div className="filter-row">
                    {STATUSES.map(s => (
                      <IonChip 
                        key={s.value} 
                        className={activeStatus === s.value ? 'chip-active-status' : 'chip-pro'}
                        onClick={() => setStatusFilter(s.value)}
                      >
                        <IonLabel>{s.label}</IonLabel>
                      </IonChip>
                    ))}
                  </div>
                </div>
                
                <div className="filter-group">
                  <div className="group-header">
                    <span className="filter-label">Géneros</span>
                    {(activeFormat || activeGenre || activeStatus || activeDemographic) && (
                      <IonButton fill="clear" size="small" className="clear-btn" onClick={clearFilters}>
                        Limpiar todo
                      </IonButton>
                    )}
                  </div>
                  <div className="filter-row genres-row">
                    {GENRES.map(g => (
                      <IonChip 
                        key={g} 
                        className={activeGenre === g ? 'chip-active-genre' : 'chip-pro'}
                        onClick={() => setGenreFilter(g)}
                      >
                        <IonLabel>{g}</IonLabel>
                      </IonChip>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {loading && offset === 0 ? (
              <LoadingScreen />
            ) : (
              <IonGrid className="search-results-grid">
                <IonRow>
                  {results.map((manga: any) => {
                    const format = manga.attributes.originalLanguage;
                    const tags = manga.attributes.tags
                      ?.filter((t: any) => t.attributes?.group === 'genre')
                      .slice(0, 2)
                      .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');
                      
                    return (
                      <IonCol size="6" sizeMd="3" key={manga.id}>
                        <MangaCard 
                          title={manga.attributes.title.en || Object.values(manga.attributes.title)[0]}
                          coverUrl={mangadexService.getCoverUrl(manga, 512)}
                          format={format}
                          tags={tags}
                          onClick={() => router.push(`/manga/${manga.id}`)}
                        />
                      </IonCol>
                    );
                  })}
                </IonRow>
              </IonGrid>
            )}
            <IonInfiniteScroll threshold="100px" disabled={isDone} onIonInfinite={loadMore}>
              <IonInfiniteScrollContent loadingSpinner="bubbles" />
            </IonInfiniteScroll>
          </div>
        )}

        {activeSegment === 'trending' && (
          <div className="discovery-section trending-discovery animate-fade-in">
            <div className="section-header">
              <div className="accent-bar"></div>
              <h2 className="discovery-title">Tendencias Globales 🔥</h2>
            </div>
            {loading ? (
              <div className="discovery-loader"><IonSpinner name="dots" color="primary" /></div>
            ) : (
              <IonGrid className="ion-no-padding">
                <IonRow>
                  {trending.map(m => {
                    const format = m.attributes.originalLanguage;
                    const tags = m.attributes.tags
                      ?.filter((t: any) => t.attributes?.group === 'genre')
                      .slice(0, 2)
                      .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');
                      
                    return (
                      <IonCol size="6" sizeSm="4" sizeMd="3" key={m.id}>
                        <MangaCard 
                          title={m.attributes.title.en || Object.values(m.attributes.title)[0]}
                          coverUrl={mangadexService.getCoverUrl(m, 512)}
                          format={format}
                          tags={tags}
                          onClick={() => router.push(`/manga/${m.id}`)}
                        />
                      </IonCol>
                    );
                  })}
                </IonRow>
              </IonGrid>
            )}
          </div>
        )}

        {activeSegment === 'suggestions' && (
          <div className="suggestions-section animate-fade-in">
            <div className="suggestions-hero">
              <h3>Especialmente para ti</h3>
              <p>Basado en tu biblioteca y gustos.</p>
            </div>
            {favorites.length === 0 ? (
              <div className="empty-discovery">
                <IonIcon icon={heartOutline} />
                <p>Tu biblioteca está vacía. Añade mangas para obtener sugerencias personalizadas.</p>
              </div>
            ) : (
              <IonGrid className="ion-no-padding">
                <IonRow>
                  {suggestions.map(m => {
                    const format = m.attributes?.originalLanguage;
                    const tags = m.attributes?.tags
                      ?.filter((t: any) => t.attributes?.group === 'genre')
                      .slice(0, 2)
                      .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');
                      
                    return (
                      <IonCol size="6" sizeSm="4" sizeMd="3" key={m.id}>
                        <MangaCard 
                          title={m.attributes.title.en || Object.values(m.attributes.title)[0]}
                          coverUrl={mangadexService.getCoverUrl(m, 512)}
                          format={format}
                          tags={tags}
                          onClick={() => router.push(`/manga/${m.id}`)}
                        />
                      </IonCol>
                    );
                  })}
                </IonRow>
              </IonGrid>
            )}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SearchPage;
