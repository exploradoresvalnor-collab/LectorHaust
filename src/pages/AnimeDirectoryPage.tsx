import React, { useState, useEffect } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, 
  IonSearchbar, IonButtons, IonButton, IonIcon, IonSkeletonText, useIonRouter, IonSpinner,
  IonSelect, IonSelectOption, IonBadge, IonBackButton,
  IonChip, IonLabel
} from '@ionic/react';
import { filterOutline, searchOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { animeflvService } from '../services/animeflvService';
import { tioanimeService } from '../services/tioanimeService';
import AnimeCardItem from '../components/AnimeCardItem';
import './AnimeCommon.css';
import './AnimeDirectoryPage.css';

const ITEMS_PER_PAGE_FLV = 24;

const AnimeDirectoryPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const fetchingRef = React.useRef(false);
  
  // Filters
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [type, setType] = useState('all');
  const [year, setYear] = useState('all');
  const [sort, setSort] = useState('default');
  const [language, setLanguage] = useState<'sub-es' | 'latino'>('sub-es');
  const [provider, setProvider] = useState<'default' | 'tioanime' | 'animeflv'>('default');
  
  const years = Array.from({ length: 56 }, (_, i) => (2025 - i).toString());

  const [genres] = useState<string[]>([
    "Acción", "Artes Marciales", "Aventuras", "Carreras", "Ciencia Ficción", 
    "Comedia", "Demencia", "Demonios", "Deportes", "Drama", "Ecchi", 
    "Escolares", "Espacio", "Fantasía", "Harem", "Histórico", "Infantil", "Isekai", 
    "Josei", "Juegos", "Militar", "Misterio", "Magia", "Mecha", "Música", "Parodia", 
    "Policial", "Psicológico", "Romance", "Samurai", "Seinen", "Shoujo", 
    "Shoujo Ai", "Shounen", "Shounen Ai", "Slice of Life", "Sobrenatural", "Superpoderes", "Suspenso", 
    "Terror", "Vampiros", "Yaoi", "Yuri"
  ]);
  const router = useIonRouter();

  const fetchAnimes = async (targetPage: number = 1) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    setResults([]);
    setLoading(true);
    setPage(targetPage);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
      let newItems: any[] = [];
      
      if (provider === 'tioanime') {
          newItems = await tioanimeService.search(query);
      } else {
          newItems = await animeflvService.search(query, [genre], targetPage, type, year, sort);
      }

      if (!newItems || newItems.length === 0) {
        setResults([]);
        if (targetPage === 1) {
            setTotalCount(0);
            setTotalPages(1);
        }
      } else {
        setResults(newItems);
        if (targetPage === 1) {
            const serverTotal = (newItems as any).totalCount;
            if (serverTotal && serverTotal > 0) {
                setTotalCount(serverTotal);
                setTotalPages(Math.ceil(serverTotal / ITEMS_PER_PAGE_FLV));
            } else {
                setTotalCount(newItems.length);
                setTotalPages(1);
            }
        }
      }
    } catch (err) {
      console.error("Directory fetch error", err);
      setResults([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchAnimes(1);
  }, [genre, type, query, year, sort, language]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || fetchingRef.current) return;
    fetchAnimes(newPage);
  };

  const resetFilters = () => {
    setGenre('all');
    setType('all');
    setQuery('');
    setSort('default');
    setLanguage('sub-es');
    setYear('all');
  };

  const getActiveFilterLabel = () => {
    const parts: string[] = [];
    if (language === 'latino') parts.push('🇲🇽 Latino');
    else parts.push('Sub Español');
    if (genre !== 'all') parts.push(genre);
    if (type !== 'all') parts.push(type);
    if (year !== 'all') parts.push(year);
    if (query) parts.push(`"${query}"`);
    return parts.join(' · ');
  };

  const hasActiveFilter = genre !== 'all' || type !== 'all' || year !== 'all' || query !== '' || language !== 'sub-es';

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

          <div className="horizontal-filters-scroll">
            <div className="filter-select-inline">
              <span className="filter-label">Idioma:</span>
              <IonSelect value={language} interface="popover" onIonChange={e => { setLanguage(e.detail.value); setProvider('default'); }} className="custom-select-inline">
                 <IonSelectOption value="sub-es">Sub Español</IonSelectOption>
                 <IonSelectOption value="latino">Latino</IonSelectOption>
              </IonSelect>
            </div>

            <div className="filter-select-inline">
              <span className="filter-label">Servidor:</span>
              <IonSelect value={provider} interface="popover" onIonChange={e => setProvider(e.detail.value)} className="custom-select-inline">
                 <IonSelectOption value="default">S-Principal</IonSelectOption>
                 {language === 'sub-es' && (
                     <IonSelectOption value="tioanime">S-Rápido</IonSelectOption>
                 )}
              </IonSelect>
            </div>

            <div className="filter-select-inline">
              <span className="filter-label">Formato:</span>
              <IonSelect value={type} interface="popover" onIonChange={e => setType(e.detail.value)} className="custom-select-inline">
                 <IonSelectOption value="all">Todos</IonSelectOption>
                 <IonSelectOption value="TV">TV</IonSelectOption>
                 <IonSelectOption value="Movie">Película</IonSelectOption>
                 <IonSelectOption value="OVA">OVA</IonSelectOption>
                 <IonSelectOption value="ONA">ONA</IonSelectOption>
                 <IonSelectOption value="Special">Especial</IonSelectOption>
              </IonSelect>
            </div>

            <div className="filter-select-inline">
              <span className="filter-label">Género:</span>
              <IonSelect value={genre} interface="popover" onIonChange={e => setGenre(e.detail.value)} className="custom-select-inline">
                 <IonSelectOption value="all">Todos</IonSelectOption>
                 {genres.map(g => (
                   <IonSelectOption key={g} value={g}>{g}</IonSelectOption>
                 ))}
              </IonSelect>
            </div>

            <div className="filter-select-inline">
              <span className="filter-label">Orden:</span>
              <IonSelect value={sort} interface="popover" onIonChange={e => setSort(e.detail.value)} className="custom-select-inline">
                 <IonSelectOption value="default">Recientes</IonSelectOption>
                 <IonSelectOption value="rating">Calificación</IonSelectOption>
                 <IonSelectOption value="updated">Subidos</IonSelectOption>
              </IonSelect>
            </div>

             <div className="filter-select-inline">
              <span className="filter-label">Año:</span>
              <IonSelect value={year} interface="popover" onIonChange={e => setYear(e.detail.value)} className="custom-select-inline">
                 <IonSelectOption value="all">Todos</IonSelectOption>
                 {years.map(y => <IonSelectOption key={y} value={y}>{y}</IonSelectOption>)}
              </IonSelect>
            </div>
          </div>

          <div className="catalog-tracker">
            <div className="tracker-left">
              <span className={`tracker-dot ${loading ? 'pulse' : ''}`} />
              <span className="tracker-label">
                {hasActiveFilter ? getActiveFilterLabel() : 'Catálogo General'}
              </span>
            </div>
            <div className="tracker-right">
              {loading ? (
                <IonSpinner name="dots" style={{ width: '20px', height: '20px' }} color="primary" />
              ) : (
                <span className="tracker-count">
                  {totalCount > 0 ? (
                    <>Se encontraron <strong>{totalCount.toLocaleString()}</strong> títulos</>
                  ) : (
                    <span>Sin resultados</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </IonHeader>

      <IonContent fullscreen className="directory-content">
        <div className="main-content-wrapper">
          {loading ? (
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
            <IonGrid className="anime-grid-v">
               <IonRow className="anime-row-v">
                  {results.map((anime, idx) => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" className="anime-col-5 anime-col-v" key={`${anime.id}-p${page}`}>
                       <AnimeCardItem 
                          anime={anime} 
                          onClick={() => {
                             router.push(`/anime/${anime.id}`, 'forward', 'push', { anime } as any);
                          }}
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
               <h4 style={{ fontWeight: 800 }}>Búsqueda Fallida</h4>
               <p>No encontramos nada bajo esos criterios.</p>
               <IonButton fill="solid" color="primary" onClick={resetFilters} style={{ '--border-radius': '12px', fontWeight: 700 }}>VER TODO EL CATÁLOGO</IonButton>
            </div>
          )}

          {!loading && results.length > 0 && totalPages > 1 && (
            <div className="premium-pagination-wrapper">
               <div className="pagination-main-controls">
                  <IonButton 
                    fill="clear" 
                    disabled={page === 1} 
                    onClick={() => handlePageChange(page - 1)}
                    className="pagination-nav-btn"
                  >
                    <IonIcon icon={chevronBackOutline} slot="start" />
                    Anterior
                  </IonButton>

                  <div className="pagination-central-indicator">
                    <span className="page-text">Página</span>
                    <span className="page-numbers"><strong>{page}</strong> <span className="dim">/</span> {totalPages}</span>
                  </div>

                  <IonButton 
                    fill="clear" 
                    disabled={page >= totalPages} 
                    onClick={() => handlePageChange(page + 1)}
                    className="pagination-nav-btn"
                  >
                    Siguiente
                    <IonIcon icon={chevronForwardOutline} slot="end" />
                  </IonButton>
               </div>
               
               <div className="pagination-extra-actions">
                  <button className="jump-btn" disabled={page === 1} onClick={() => handlePageChange(1)}>
                    Primera
                  </button>
                  <span className="jump-divider"></span>
                  <button className="jump-btn" disabled={page >= totalPages} onClick={() => handlePageChange(totalPages)}>
                    Última ({totalPages})
                  </button>
               </div>
            </div>
          )}
          
          <div style={{ height: '80px' }} />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AnimeDirectoryPage;
