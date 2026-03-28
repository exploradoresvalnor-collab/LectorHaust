import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, 
  IonSearchbar, IonButtons, IonButton, IonIcon, IonSkeletonText, useIonRouter, IonSpinner,
  IonSelect, IonSelectOption, IonInfiniteScroll, IonInfiniteScrollContent, IonBadge, IonBackButton,
  IonChip
} from '@ionic/react';
import { filterOutline, optionsOutline, searchOutline, arrowUpOutline, sparklesOutline, timeOutline, trendingUpOutline, languageOutline } from 'ionicons/icons';
import { animeflvService } from '../services/animeflvService';
import { hianimeService } from '../services/hianimeService';
import AnimeCardItem from '../components/AnimeCardItem';
import './AnimeCommon.css';
import './AnimeDirectoryPage.css';

const AnimeDirectoryPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const fetchingRef = React.useRef(false);
  
  // Filters
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [type, setType] = useState('all');
  const [year, setYear] = useState('all');
  const [sort, setSort] = useState('default');
  const [language, setLanguage] = useState<'sub-es' | 'sub-en' | 'latino' | 'castellano'>('sub-es');
  
  const years = Array.from({ length: 56 }, (_, i) => (2025 - i).toString()); // 1970-2025

  const [genres, setGenres] = useState<string[]>([
    "Acción", "Artes Marciales", "Aventuras", "Carreras", "Ciencia Ficción", 
    "Comedia", "Demencia", "Demonios", "Deportes", "Drama", "Ecchi", 
    "Escolares", "Fantasía", "Harem", "Histórico", "Infantil", "Isekai", 
    "Josei", "Misterio", "Magia", "Mecha", "Música", "Parodia", "Psicológico", 
    "Romance", "Seinen", "Shoujo", "Shounen", "Slice of Life", "Sobrenatural", 
    "Superpoderes", "Suspenso", "Terror", "Vampiros"
  ]);
  const router = useIonRouter();

  const fetchAnimes = async (targetPage: number = 1) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setPage(targetPage);
    
    try {
      let newItems: any[] = [];
      
      if (language === 'sub-en') {
          // English source (HiAnime)
          const hiSort = sort === 'rating' ? 'top_rated' : (sort === 'updated' ? 'recently_updated' : 'recently_added');
          newItems = await hianimeService.search(query, targetPage, year, genre, hiSort);
      } else {
          // All Spanish variants use AnimeFLV
          newItems = await animeflvService.search(query, [genre], targetPage, type, year, sort);
      }

      if (!newItems || newItems.length === 0) {
        if (targetPage === 1) setResults([]);
        setHasMore(false);
      } else {
        setResults(newItems.slice(0, 20));
        setHasMore(newItems.length >= 20);
      }
    } catch (err) {
      console.error("Directory fetch error", err);
      if (targetPage === 1) setResults([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchAnimes(1);
    const content = document.querySelector('.directory-content');
    if (content) (content as any).scrollToTop(300);
  }, [genre, type, query, year, sort, language]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || fetchingRef.current) return;
    fetchAnimes(newPage); 
    const content = document.querySelector('.directory-content');
    if (content) (content as any).scrollToTop(400);
  };

  const resetFilters = () => {
    setGenre('all');
    setType('all');
    setQuery('');
    setSort('default');
    setLanguage('sub-es');
    setYear('all');
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
                <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#fff', letterSpacing: '0.5px' }}>Lector<span style={{ color: 'var(--ion-color-primary)' }}>Haus</span></span>
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
               
               <div className="filter-chips-row dual-selectors">
                  <div className="filter-select-wrapper flex-1">
                    <IonIcon icon={languageOutline} className="select-icon" />
                    <IonSelect value={language} placeholder="Idioma" interface="popover" onIonChange={e => setLanguage(e.detail.value)} className="custom-select">
                       <IonSelectOption value="sub-es">Sub Español</IonSelectOption>
                       <IonSelectOption value="sub-en">Sub Inglés</IonSelectOption>
                       <IonSelectOption value="latino">Latino</IonSelectOption>
                       <IonSelectOption value="castellano">Castellano</IonSelectOption>
                    </IonSelect>
                  </div>

                  <div className="filter-select-wrapper flex-1">
                    <IonIcon icon={optionsOutline} className="select-icon" />
                    <IonSelect value={type} placeholder="Tipo" interface="popover" onIonChange={e => setType(e.detail.value)} className="custom-select">
                       <IonSelectOption value="all">Formato</IonSelectOption>
                       <IonSelectOption value="TV">TV</IonSelectOption>
                       <IonSelectOption value="Movie">Pelis</IonSelectOption>
                       <IonSelectOption value="OVA">OVA</IonSelectOption>
                       <IonSelectOption value="ONA">ONA</IonSelectOption>
                       <IonSelectOption value="Special">Espec.</IonSelectOption>
                    </IonSelect>
                  </div>
               </div>

               <div className="filter-chips-row dual-selectors" style={{ marginTop: '-4px' }}>
                  <div className="filter-select-wrapper flex-1">
                    <IonIcon icon={sparklesOutline} className="select-icon" />
                    <IonSelect value={genre} placeholder="Género" interface="popover" onIonChange={e => setGenre(e.detail.value)} className="custom-select">
                       <IonSelectOption value="all">Género</IonSelectOption>
                       {genres.map(g => (
                         <IonSelectOption key={g} value={g}>{g}</IonSelectOption>
                       ))}
                    </IonSelect>
                  </div>

                  <div className="filter-select-wrapper flex-1">
                    <IonIcon icon={trendingUpOutline} className="select-icon" />
                    <IonSelect value={sort} placeholder="Orden" interface="popover" onIonChange={e => setSort(e.detail.value)} className="custom-select">
                       <IonSelectOption value="default">Recientes</IonSelectOption>
                       <IonSelectOption value="rating">Calificación</IonSelectOption>
                       <IonSelectOption value="updated">Subidos</IonSelectOption>
                    </IonSelect>
                  </div>
               </div>

               <div className="filter-row" style={{ marginTop: '-4px' }}>
                 <div className="filter-select-wrapper flex-1">
                    <IonIcon icon={timeOutline} className="select-icon" />
                    <IonSelect value={year} placeholder="Año" interface="popover" onIonChange={e => setYear(e.detail.value)} className="custom-select">
                       <IonSelectOption value="all">Año (Todos)</IonSelectOption>
                       {years.map(y => <IonSelectOption key={y} value={y}>{y}</IonSelectOption>)}
                    </IonSelect>
                  </div>
               </div>
            </div>
      </IonHeader>

      <IonContent fullscreen className="directory-content">
        <div className="main-content-wrapper">
          {loading && results.length === 0 ? (
            <IonGrid className="anime-grid-v">
              <IonRow className="anime-row-v">
                 {[1,2,3,4,5,6,7,8,9,10].map(i => (
                   <IonCol size="6" sizeSm="4" sizeMd="3" className="anime-col-5 anime-col-v" key={i}>
                      <div className="card-media" style={{ marginBottom: '8px' }}>
                        <IonSkeletonText animated style={{ position: 'absolute', inset: 0, margin: 0 }} />
                      </div>
                      <IonSkeletonText animated style={{ width: '80%', height: '12px', borderRadius: '4px' }} />
                   </IonCol>
                 ))}
              </IonRow>
            </IonGrid>
          ) : results.length > 0 ? (
            <IonGrid className="anime-grid-v" style={{ position: 'relative' }}>
               {loading && (
                 <div style={{
                   position: 'absolute', inset: 0, zIndex: 20,
                   background: 'rgba(15, 16, 20, 0.7)', backdropFilter: 'blur(4px)',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   borderRadius: '12px'
                 }}>
                   <IonSpinner name="crescent" color="primary" style={{ transform: 'scale(1.5)' }} />
                 </div>
               )}
               <IonRow className="anime-row-v">
                  {results.map((anime, idx) => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" className="anime-col-5 anime-col-v" key={`${anime.id}-${idx}`}>
                       <AnimeCardItem 
                          anime={anime} 
                          onClick={() => router.push(`/anime/${anime.id}`, 'forward', 'push', { anime } as any)}
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

           {results.length > 0 && (
            <div className="pagination-bar">
               <IonButton 
                  fill="clear" 
                  disabled={page === 1 || loading} 
                  onClick={() => handlePageChange(page - 1)}
                  className="page-nav-btn"
               >
                  Anterior
               </IonButton>
               <div className="page-indicator">
                  <span className="current-page">{loading ? '...' : page}</span>
               </div>
               <IonButton 
                  fill="clear" 
                  disabled={!hasMore || loading} 
                  onClick={() => handlePageChange(page + 1)}
                  className="page-nav-btn"
               >
                  Siguiente
               </IonButton>
            </div>
          )}

          {!hasMore && results.length > 0 && (
            <div className="end-of-catalog">
               <p>✨ Has llegado al final de esta sección del catálogo ✨</p>
            </div>
          )}
          
          <div style={{ height: '80px' }} />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AnimeDirectoryPage;
