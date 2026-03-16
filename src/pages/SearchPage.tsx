import React, { useEffect } from 'react';
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
  IonSelect,
  IonSelectOption,
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
import { 
  useSearch, 
  FORMATS, 
  STATUSES, 
  DEMOGRAPHICS, 
  ORDERS, 
  GENRES 
} from '../hooks/useSearch';
import './SearchPage.css';

const SearchPage: React.FC = () => {
  const router = useIonRouter();
  
  const {
    activeSegment, setActiveSegment,
    results, trending, suggestions, loading, query, offset, isDone,
    completedManga, completedLoading, completedGenre, setCompletedGenre,
    completedLang, setCompletedLang, completedDemographic, setCompletedDemographic,
    isCompletedDone, activeFormat, activeGenre, activeStatus,
    activeDemographic, activeOrder, setActiveOrder, activeColor, setActiveColor,
    completedColor, setCompletedColor, showFilters, setShowFilters,
    favorites, loadDiscoveryData, fetchCompleted, loadMoreCompleted,
    handleSearch, setFormatFilter, setGenreFilter, setStatusFilter,
    setDemographicFilter, loadMore
  } = useSearch();

  useIonViewWillEnter(() => {
    if (trending.length === 0) loadDiscoveryData();
  });

  useEffect(() => {
    if (activeSegment === 'completed' && completedManga.length === 0) {
        fetchCompleted();
    }
  }, [activeSegment, completedManga.length, fetchCompleted]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="glass-effect" style={{ padding: '10px 0' }}>
          <IonSegment value={activeSegment} onIonChange={(e: any) => setActiveSegment(e.detail.value as string)} mode="md" className="custom-segment">
            <IonSegmentButton value="trending">
              <IonIcon icon={trendingUpOutline} />
              <IonLabel>Tendencias</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="completed">
              <IonIcon icon={sparklesOutline} />
              <IonLabel>Terminados 🏆</IonLabel>
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
                  placeholder={'¿Qué quieres leer hoy?'}
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
                <div className="filter-grid-pro">
                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Tipo</span>
                    <IonSelect 
                      value={activeFormat} 
                      placeholder="Todos"
                      interface="popover"
                      className="custom-select-pro"
                      onIonChange={(e: any) => setFormatFilter(e.detail.value)}
                    >
                      {FORMATS.map(f => <IonSelectOption key={f.label} value={f.value}>{f.label}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Estado</span>
                    <IonSelect 
                      value={activeStatus} 
                      placeholder="Todos"
                      interface="popover"
                      className="custom-select-pro"
                      onIonChange={(e: any) => setStatusFilter(e.detail.value)}
                    >
                      <IonSelectOption value={null}>Todos</IonSelectOption>
                      {STATUSES.map(s => <IonSelectOption key={s.value} value={s.value}>{s.label}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Demografía</span>
                    <IonSelect 
                      value={activeDemographic} 
                      placeholder="Todos"
                      interface="popover"
                      className="custom-select-pro"
                      onIonChange={(e: any) => setDemographicFilter(e.detail.value)}
                    >
                      {DEMOGRAPHICS.map(d => <IonSelectOption key={d.label} value={d.value}>{d.label}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Género</span>
                    <IonSelect 
                      value={activeGenre || 'Todos'} 
                      placeholder="Todos"
                      interface="popover"
                      className="custom-select-pro"
                      onIonChange={(e: any) => setGenreFilter(e.detail.value === 'Todos' ? null : e.detail.value)}
                    >
                      {GENRES.map(g => <IonSelectOption key={g} value={g}>{g}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Orden</span>
                    <IonSelect 
                      value={activeOrder} 
                      interface="popover"
                      className="custom-select-pro"
                      onIonChange={(e: any) => {
                        setActiveOrder(e.detail.value);
                        handleSearch(query, false, activeFormat, activeGenre, activeStatus, activeDemographic, e.detail.value);
                      }}
                    >
                      {ORDERS.map(o => <IonSelectOption key={o.value} value={o.value}>{o.label}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro color-toggle-item">
                    <span className="filter-label-v2">Color</span>
                    <IonChip 
                      color={activeColor ? 'secondary' : 'medium'} 
                      outline={!activeColor}
                      onClick={() => {
                        const newColor = !activeColor;
                        setActiveColor(newColor);
                        handleSearch(query, false, activeFormat, activeGenre, activeStatus, activeDemographic, activeOrder, newColor);
                      }}
                      className="color-filter-chip"
                    >
                      <IonIcon icon={sparklesOutline} />
                      <IonLabel>A Color</IonLabel>
                    </IonChip>
                  </div>

                  <div className="filter-action-item">
                    <IonButton expand="block" className="brand-filter-btn" onClick={() => handleSearch(query)}>
                      <IonIcon icon={searchOutline} slot="start" />
                      FILTRAR
                    </IonButton>
                  </div>
                </div>
              </div>
            </div>

            {loading && offset === 0 ? (
              <LoadingScreen />
            ) : (
              <>
                <IonGrid className="search-results-grid">
                  <IonRow>
                    {results.map((manga: any) => (
                      <IonCol size="6" sizeSm="4" sizeMd="3" key={manga.id}>
                        <MangaCard 
                          title={manga.attributes.title.en || Object.values(manga.attributes.title)[0]}
                          coverUrl={mangadexService.getCoverUrl(manga)}
                          format={manga.attributes.originalLanguage}
                          tags={manga.attributes.tags
                            ?.filter((t: any) => t.attributes?.group === 'genre')
                            .slice(0, 2)
                            .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '')}
                          onClick={() => router.push(`/manga/${manga.id}`)}
                        />
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>
                <IonInfiniteScroll threshold="100px" disabled={isDone} onIonInfinite={loadMore}>
                  <IonInfiniteScrollContent loadingSpinner="bubbles" />
                </IonInfiniteScroll>
              </>
            )}
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
              <IonGrid>
                <IonRow>
                  {trending.map(m => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" key={m.id}>
                      <MangaCard 
                        title={m.attributes.title.en || Object.values(m.attributes.title)[0]}
                        coverUrl={mangadexService.getCoverUrl(m)}
                        format={m.attributes.originalLanguage}
                        tags={m.attributes.tags
                          ?.filter((t: any) => t.attributes?.group === 'genre')
                          .slice(0, 2)
                          .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '')}
                        onClick={() => router.push(`/manga/${m.id}`)}
                      />
                    </IonCol>
                  ))}
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
              <IonGrid>
                <IonRow>
                  {suggestions.map(m => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" key={m.id}>
                      <MangaCard 
                        title={m.attributes.title.en || Object.values(m.attributes.title)[0]}
                        coverUrl={mangadexService.getCoverUrl(m)}
                        format={m.attributes.originalLanguage}
                        tags={m.attributes.tags
                          ?.filter((t: any) => t.attributes?.group === 'genre')
                          .slice(0, 2)
                          .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '')}
                        onClick={() => router.push(`/manga/${m.id}`)}
                      />
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            )}
          </div>
        )}

        {activeSegment === 'completed' && (
          <div className="completed-section animate-fade-in">
            <div className="discovery-header" style={{ marginBottom: '20px' }}>
              <div className="section-header">
                <div className="accent-bar" style={{ background: '#4caf50' }}></div>
                <h2 className="discovery-title">Obras Maestras Finalizadas</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
                Series terminadas con traducción completa verificada.
              </p>
            </div>

            <div className="completed-filters-bar glass-effect animate-slide-up">
              <div className="filter-pill-row">
                <IonSegment 
                  value={completedLang} 
                  onIonChange={(e: any) => {
                    setCompletedLang(e.detail.value);
                    fetchCompleted(false, completedGenre, e.detail.value);
                  }}
                  mode="ios"
                  className="lang-segment-mini"
                >
                  <IonSegmentButton value="es">ES</IonSegmentButton>
                  <IonSegmentButton value="en">EN</IonSegmentButton>
                </IonSegment>

                <div className="genre-select-wrapper mini-pill">
                  <IonIcon icon={sparklesOutline} className="genre-icon-mini" />
                  <IonSelect 
                    value={completedDemographic} 
                    placeholder="Demografía"
                    interface="popover"
                    className="genre-select-mini"
                    onIonChange={(e: any) => {
                      setCompletedDemographic(e.detail.value);
                      fetchCompleted(false, completedGenre, completedLang, e.detail.value);
                    }}
                  >
                    <IonSelectOption value={null}>Todas</IonSelectOption>
                    {DEMOGRAPHICS.slice(1).map(d => (
                      <IonSelectOption key={d.value} value={d.value}>{d.label}</IonSelectOption>
                    ))}
                  </IonSelect>
                </div>

                <div className="genre-select-wrapper mini-pill">
                  <IonIcon icon={filterOutline} className="genre-icon-mini" />
                  <IonSelect 
                    value={completedGenre} 
                    placeholder="Género"
                    interface="popover"
                    className="genre-select-mini"
                    onIonChange={(e: any) => {
                      setCompletedGenre(e.detail.value);
                      fetchCompleted(false, e.detail.value);
                    }}
                  >
                    <IonSelectOption value="">Cualquiera</IonSelectOption>
                    {GENRES.slice(1).map(g => (
                      <IonSelectOption key={g} value={g}>{g}</IonSelectOption>
                    ))}
                  </IonSelect>
                </div>

                <div className="genre-select-wrapper mini-pill color-pill-mini">
                  <IonChip 
                    color={completedColor ? 'secondary' : 'medium'} 
                    outline={!completedColor}
                    onClick={() => {
                      const newColor = !completedColor;
                      setCompletedColor(newColor);
                      fetchCompleted(false, completedGenre, completedLang, completedDemographic, newColor);
                    }}
                    className="full-color-chip-mini"
                  >
                    <IonIcon icon={sparklesOutline} />
                    <IonLabel>Color</IonLabel>
                  </IonChip>
                </div>
              </div>
            </div>

            {completedLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <IonSpinner name="dots" color="primary" />
                <p style={{ marginTop: '10px', opacity: 0.8 }}>Validando traducción completa...</p>
              </div>
            ) : (
              <>
                <IonGrid>
                  <IonRow>
                    {completedManga.map((manga: any) => (
                      <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={manga.id}>
                        <MangaCard 
                          title={mangadexService.getLocalizedTitle(manga)}
                          coverUrl={mangadexService.getCoverUrl(manga)}
                          format={manga.attributes.mangaType || manga.attributes.originalLanguage}
                          onClick={() => router.push(`/manga/${manga.id}`)}
                        />
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>
                <IonInfiniteScroll disabled={isCompletedDone} onIonInfinite={loadMoreCompleted} threshold="100px">
                  <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Buscando más joyas..." />
                </IonInfiniteScroll>
              </>
            )}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SearchPage;
