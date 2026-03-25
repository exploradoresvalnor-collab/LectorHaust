import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, 
  IonSearchbar, IonButtons, IonButton, IonIcon, IonSkeletonText, useIonRouter,
  IonSelect, IonSelectOption, IonInfiniteScroll, IonInfiniteScrollContent, IonBadge, IonBackButton,
  IonChip
} from '@ionic/react';
import { filterOutline, optionsOutline, searchOutline, arrowUpOutline } from 'ionicons/icons';
import { aniwatchService, AnimeSearchResult } from '../services/aniwatchService';
import AnimeCardItem from '../components/AnimeCardItem';
import './AnimeDirectoryPage.css';

const AnimeDirectoryPage: React.FC = () => {
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const fetchingRef = React.useRef(false);
  
  // Filters
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('default');

  const [genres, setGenres] = useState<string[]>([]);
  const router = useIonRouter();

  useEffect(() => {
    const loadGenres = async () => {
      const data = await aniwatchService.getHomeData();
      if (data && data.genres) setGenres(data.genres);
    };
    loadGenres();
  }, []);

  const fetchAnimes = async (reset: boolean = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const nextPage = reset ? 1 : page;
    if (reset) {
        setLoading(true);
        // No limpiamos results inmediatamente para evitar el parpadeo blanco
        setPage(1);
        setHasMore(true);
    }
    
    try {
      // Cargamos 2 páginas seguidas para cumplir con el "bloque de 40-50"
      const p1Promise = genre !== 'all' 
        ? aniwatchService.getAnimesByGenre(genre, nextPage)
        : (type !== 'all' && type !== 'TV' 
            ? aniwatchService.getAnimesByCategory(type.toLowerCase(), nextPage)
            : aniwatchService.searchAnime(query || 'a', nextPage));

      const p2Promise = genre !== 'all' 
        ? aniwatchService.getAnimesByGenre(genre, nextPage + 1)
        : (type !== 'all' && type !== 'TV' 
            ? aniwatchService.getAnimesByCategory(type.toLowerCase(), nextPage + 1)
            : aniwatchService.searchAnime(query || 'a', nextPage + 1));

      const [data1, data2] = await Promise.all([p1Promise, p2Promise]);
      const combined = [...data1, ...data2];

      if (combined.length === 0) {
        setHasMore(false);
        if (reset) setResults([]);
      } else {
        setResults(prev => {
          const all = reset ? combined : [...prev, ...combined];
          // Deduplicación por ID garantizada
          const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
          return unique;
        });
        setPage(nextPage + 2);
      }
    } catch (err) {
      console.error("Directory fetch error", err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Un solo efecto para manejar cambios en filtros de forma atómica
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnimes(true);
    }, 100); // Pequeño debounce para evitar disparos múltiples
    return () => clearTimeout(timer);
  }, [genre, type, query]);

  const loadMore = async (e: any) => {
    await fetchAnimes();
    e.target.complete();
  };

  const resetFilters = () => {
    setGenre('all');
    setType('all');
    setQuery('');
    setSort('default');
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border glass-effect-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/anime" />
          </IonButtons>
          <IonTitle style={{ textAlign: 'left', paddingLeft: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logolh.webp" width="24" height="24" style={{ filter: 'drop-shadow(0 0 8px rgba(var(--ion-color-primary-rgb), 0.6))' }} />
              <div style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#fff', letterSpacing: '0.5px' }}>Haus<span style={{ color: 'var(--ion-color-primary)' }}>Anime</span></span>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>CATÁLOGO PREMIUM</span>
              </div>
            </div>
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={resetFilters} style={{ '--color': 'var(--ion-color-primary)' }}>
               <IonIcon icon={filterOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        
        {/* Filter Bar */}
        <div className="directory-filters-container">
           <div className="filter-row">
             <IonSearchbar 
                value={query}
                onIonInput={e => setQuery(e.detail.value!)}
                placeholder="Busca tu próximo anime..."
                className="directory-search"
                debounce={500}
             />
           </div>
           
           <div className="filter-chips-row premium-scroll">
              <IonChip 
                className={`haus-chip ${genre === 'all' ? 'active' : ''}`} 
                onClick={() => setGenre('all')}
              >Todos</IonChip>
              {genres.map(g => (
                <IonChip 
                  key={g} 
                  className={`haus-chip ${genre === g ? 'active' : ''}`} 
                  onClick={() => setGenre(g)}
                >{g}</IonChip>
              ))}
           </div>

           <div className="filter-chips-row type-row">
              <div className="filter-select-wrapper">
                <IonIcon icon={optionsOutline} style={{ marginRight: '5px', fontSize: '14px' }} />
                <IonSelect value={type} placeholder="Tipo" interface="popover" onIonChange={e => setType(e.detail.value)}>
                   <IonSelectOption value="all">Formato</IonSelectOption>
                   <IonSelectOption value="TV">Series TV</IonSelectOption>
                   <IonSelectOption value="Movie">Películas</IonSelectOption>
                   <IonSelectOption value="OVA">OVA</IonSelectOption>
                   <IonSelectOption value="ONA">ONA</IonSelectOption>
                   <IonSelectOption value="Special">Especiales</IonSelectOption>
                </IonSelect>
              </div>
           </div>
        </div>
      </IonHeader>

      <IonContent fullscreen className="directory-content">
        <div className="main-content-wrapper" style={{ paddingTop: '10px' }}>
          {loading && results.length === 0 ? (
            <IonGrid style={{ padding: '0 8px' }}>
              <IonRow>
                 {[1,2,3,4,5,6,7,8,9,10].map(i => (
                   <IonCol size="6" sizeSm="4" sizeMd="2.4" key={i} style={{ padding: '6px' }}>
                      <IonSkeletonText animated style={{ aspectRatio: '2/3', borderRadius: '12px', marginBottom: '8px' }} />
                      <IonSkeletonText animated style={{ width: '80%', height: '12px', borderRadius: '4px' }} />
                   </IonCol>
                 ))}
              </IonRow>
            </IonGrid>
          ) : results.length > 0 ? (
            <IonGrid style={{ padding: '0 4px' }}>
               <IonRow>
                  {results.map((anime, idx) => (
                    <IonCol size="6" sizeSm="4" sizeMd="2.4" key={`${anime.id}-${idx}`} style={{ padding: '4px' }}>
                       <AnimeCardItem 
                          anime={anime} 
                          onClick={() => router.push(`/anime/${anime.id}`)}
                          index={idx}
                       />
                    </IonCol>
                  ))}
               </IonRow>
            </IonGrid>
          ) : (
            <div className="empty-state">
               <div className="empty-icon-pulse">
                  <IonIcon icon={searchOutline} style={{ fontSize: '4rem', color: 'rgba(var(--ion-color-primary-rgb), 0.2)' }} />
               </div>
               <h4 style={{ fontWeight: 800 }}>Misión de Búsqueda Fallida</h4>
               <p>No encontramos nada bajo esos criterios en nuestra base de datos elite.</p>
               <IonButton fill="solid" color="primary" onClick={resetFilters} style={{ '--border-radius': '12px', fontWeight: 700 }}>VER TODO EL CATÁLOGO</IonButton>
            </div>
          )}

          <IonInfiniteScroll disabled={!hasMore} onIonInfinite={loadMore} threshold="150px">
             <IonInfiniteScrollContent loadingSpinner="dots" loadingText="Sincronizando con servidores de Haus..." />
          </IonInfiniteScroll>
          
          <div style={{ height: '100px' }} />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AnimeDirectoryPage;
