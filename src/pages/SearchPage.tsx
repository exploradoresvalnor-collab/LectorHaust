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
  IonButtons,
  IonSkeletonText,
  useIonRouter,
  useIonViewWillEnter
} from '@ionic/react';
import { searchOutline, filterOutline, checkmarkCircleOutline, closeOutline, trendingUpOutline, sparklesOutline, timeOutline, medalOutline, starOutline, personOutline, imagesOutline, heartOutline, chevronBackOutline, ribbonOutline, bulbOutline } from 'ionicons/icons';
import { mangaProvider } from '../services/mangaProvider';
import MangaCard from '../components/MangaCard';
import LoadingScreen from '../components/LoadingScreen';
import { 
  useSearch, 
  FORMATS, 
  LANGUAGES,
  STATUSES, 
  DEMOGRAPHICS, 
  ORDERS, 
  GENRES 
} from '../hooks/useSearch';
import { hapticsService } from '../services/hapticsService';
import { getTranslation, Language } from '../utils/translations';
import SmartImage from '../components/SmartImage';
import './SearchPage.css';

const TrendingStrip: React.FC<{ items: any[] }> = ({ items }) => {
  const router = useIonRouter();
  if (items.length === 0) return null;

  return (
    <div className="trending-strip-container">
      <div className="trending-strip-scroll">
        {items.map((item, i) => {
          const title = item.attributes.title.en || Object.values(item.attributes.title)[0];
          const cover = mangaProvider.getCoverUrl(item, '256');
          return (
            <div key={item.id} className="trending-strip-card" onClick={() => router.push(`/manga/${item.id}`)}>
              <SmartImage src={cover} alt={title} className="trending-strip-img" wrapperClassName="trending-strip-img-wrapper" />
              <div className="trending-strip-rank">#{i + 1}</div>
              <p className="trending-strip-title">{title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
    favorites, loadMoreCompleted,
    handleSearch, setFormatFilter, setGenreFilter, setStatusFilter,
    setDemographicFilter, loadMore, loadMoreTrending, trendingLoading, isTrendingDone,
    trendingHero, trendingOrigin, setTrendingOrigin,
    trendingLang, setTrendingLang
  } = useSearch();

  // Manual fetches are no longer needed as React Query handles synchronization

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="glass-effect" style={{ padding: '10px 0' }}>
          <IonButtons slot="start" style={{ position: 'absolute', left: 0, zIndex: 10 }}>
            <IonButton onClick={() => router.canGoBack() ? router.goBack() : router.push('/home', 'back')} style={{ color: 'white' }}>
              <IonIcon icon={chevronBackOutline} size="large" />
            </IonButton>
          </IonButtons>
          <IonSegment value={activeSegment} onIonChange={(e: any) => {
            hapticsService.lightImpact();
            setActiveSegment(e.detail.value as string);
          }} mode="md" className="custom-segment" style={{ marginLeft: '42px' }}>
            <IonSegmentButton value="trending">
              <IonIcon icon={trendingUpOutline} />
            </IonSegmentButton>
            <IonSegmentButton value="completed">
              <IonIcon icon={ribbonOutline} />
            </IonSegmentButton>
            <IonSegmentButton value="suggestions">
              <IonIcon icon={bulbOutline} />
            </IonSegmentButton>
            <IonSegmentButton value="search">
              <IonIcon icon={searchOutline} />
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
                  placeholder={getTranslation('search.placeholder', completedLang as Language)}
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
                <div className="filter-grid-pro glass-effect">
                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Tipo de Obra</span>
                    <IonSelect 
                      value={activeFormat} 
                      placeholder="Cualquiera"
                      interface="popover"
                      className="custom-select-pro haus-select"
                      onIonChange={(e: any) => setFormatFilter(e.detail.value)}
                    >
                      {FORMATS.map(f => <IonSelectOption key={f.label} value={f.value}>{f.label}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Estado</span>
                    <IonSelect 
                      value={activeStatus} 
                      placeholder="Cualquiera"
                      interface="popover"
                      className="custom-select-pro haus-select"
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
                      placeholder="Cualquiera"
                      interface="popover"
                      className="custom-select-pro haus-select"
                      onIonChange={(e: any) => setDemographicFilter(e.detail.value)}
                    >
                      {DEMOGRAPHICS.map(d => <IonSelectOption key={d.label} value={d.value}>{d.label}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Género</span>
                    <IonSelect 
                      value={activeGenre || 'Todos'} 
                      placeholder="Cualquiera"
                      interface="popover"
                      className="custom-select-pro haus-select"
                      onIonChange={(e: any) => setGenreFilter(e.detail.value === 'Todos' ? null : e.detail.value)}
                    >
                      {GENRES.map(g => <IonSelectOption key={g} value={g}>{g}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Ordenar por</span>
                    <IonSelect 
                      value={activeOrder} 
                      interface="popover"
                      className="custom-select-pro haus-select"
                      onIonChange={(e: any) => {
                        setActiveOrder(e.detail.value);
                      }}
                    >
                      {ORDERS.map(o => <IonSelectOption key={o.value} value={o.value}>{o.label}</IonSelectOption>)}
                    </IonSelect>
                  </div>

                  <div className="filter-item-pro">
                    <span className="filter-label-v2">Edición</span>
                    <div className="haus-toggle-row">
                      <IonChip 
                        className={`haus-chip ${activeColor ? 'active' : ''}`}
                        onClick={() => {
                          const newColor = !activeColor;
                          setActiveColor(newColor);
                        }}
                      >
                        <IonIcon icon={sparklesOutline} />
                        <IonLabel>A Color</IonLabel>
                      </IonChip>
                    </div>
                  </div>

                  <div className="filter-action-item">
                    <IonButton expand="block" className="elite-search-btn" onClick={() => handleSearch(query)}>
                      <IonIcon icon={searchOutline} slot="start" />
                      APLICAR FILTROS
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
                      <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={manga.id}>
                        <MangaCard 
                          title={manga.attributes.title.en || Object.values(manga.attributes.title)[0]}
                          coverUrl={mangaProvider.getCoverUrl(manga)}
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
            
            <div className="section-header-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <h2 className="discovery-title" style={{ margin: 0 }}>Tendencias Globales</h2>
                {trendingLoading && <IonSpinner name="dots" color="primary" />}
              </div>
              
              <div className="trending-filter-chips" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', width: '100%', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                <IonChip className={`haus-chip ${!trendingOrigin ? 'active' : ''}`} onClick={() => setTrendingOrigin(null)} style={{ flexShrink: 0 }}>Todos</IonChip>
                <IonChip className={`haus-chip ${trendingOrigin === 'ko' ? 'active' : ''}`} onClick={() => setTrendingOrigin('ko')} style={{ flexShrink: 0 }}>Manhwa (KR)</IonChip>
                <IonChip className={`haus-chip ${trendingOrigin === 'zh' ? 'active' : ''}`} onClick={() => setTrendingOrigin('zh')} style={{ flexShrink: 0 }}>Manhua (CN)</IonChip>
                <IonChip className={`haus-chip ${trendingOrigin === 'ja' ? 'active' : ''}`} onClick={() => setTrendingOrigin('ja')} style={{ flexShrink: 0 }}>Manga (JP)</IonChip>
                <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 4px', flexShrink: 0, alignSelf: 'center' }} />
                <IonChip className={`haus-chip ${trendingLang === 'es' ? 'active' : ''}`} onClick={() => setTrendingLang('es')} style={{ flexShrink: 0 }}>Español</IonChip>
                <IonChip className={`haus-chip ${trendingLang === 'en' ? 'active' : ''}`} onClick={() => setTrendingLang('en')} style={{ flexShrink: 0 }}>Inglés</IonChip>
                <IonChip className={`haus-chip ${!trendingLang ? 'active' : ''}`} onClick={() => setTrendingLang(null)} style={{ flexShrink: 0 }}>Global</IonChip>
              </div>
            </div>
            
            {trendingLoading && trending.length === 0 ? (
              <IonGrid className="search-results-grid">
                <IonRow>
                  {Array.from({ length: 12 }).map((_, i) => (
                     <IonCol size="6" sizeSm="4" sizeMd="3" key={i}>
                       <div style={{ padding: '0 8px' }}>
                          <IonSkeletonText animated style={{ height: '220px', borderRadius: '15px' }} />
                          <IonSkeletonText animated style={{ width: '80%', height: '14px', marginTop: '8px', borderRadius: '4px' }} />
                          <IonSkeletonText animated style={{ width: '50%', height: '14px', marginTop: '4px', borderRadius: '4px' }} />
                       </div>
                     </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            ) : (
              <>
                <IonGrid>
                  <IonRow>
                    {trending.map(m => (
                      <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={m.id}>
                        <MangaCard 
                          title={m.attributes.title.en || Object.values(m.attributes.title)[0]}
                          coverUrl={mangaProvider.getCoverUrl(m)}
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
                <IonInfiniteScroll disabled={isTrendingDone} onIonInfinite={loadMoreTrending} threshold="100px">
                  <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más tendencias..." />
                </IonInfiniteScroll>
              </>
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
              <div className="empty-discovery-pro animate-fade-in">
                <div className="empty-icon-container">
                  <IonIcon icon={heartOutline} className="floating-heart" />
                  <IonIcon icon={sparklesOutline} className="sparkle-decoration" />
                </div>
                <h3>Personaliza tu experiencia</h3>
                <p>Añade mangas a tu biblioteca para que nuestra IA pueda sugerirte obras maestras basadas en tus gustos reales.</p>
                <IonButton 
                  fill="outline" 
                  className="explore-cta-btn"
                  onClick={() => setActiveSegment('trending')}
                >
                  Explorar Tendencias
                </IonButton>
              </div>
            ) : (
              <IonGrid>
                <IonRow>
                  {suggestions.map((m: any) => (
                    <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={m.id}>
                      <MangaCard 
                        title={m.attributes.title.en || Object.values(m.attributes.title)[0]}
                        coverUrl={mangaProvider.getCoverUrl(m)}
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
            <div className="search-hero-banner completed-hero">
              <div className="hero-content">
                <IonIcon icon={sparklesOutline} className="hero-icon" />
                <h2 className="hero-title">Obras Maestras</h2>
                <p className="hero-subtitle">Manga finalizado con traducción verificada.</p>
              </div>
            </div>

            <div className="completed-filters-bar glass-effect animate-slide-up">
              <div className="filter-pill-row">
                <div className="genre-select-wrapper mini-pill">
                  <IonIcon icon={filterOutline} className="genre-icon-mini" />
                  <IonSelect 
                    value={completedLang} 
                    interface="popover" 
                    className="genre-select-mini"
                    onIonChange={(e: any) => {
                      setCompletedLang(e.detail.value);
                    }}
                  >
                    {LANGUAGES.map(l => (
                      <IonSelectOption key={l.value} value={l.value}>{l.label}</IonSelectOption>
                    ))}
                  </IonSelect>
                </div>

                <div className="genre-select-wrapper mini-pill">
                  <IonIcon icon={sparklesOutline} className="genre-icon-mini" />
                  <IonSelect 
                    value={completedDemographic} 
                    placeholder="Demografía"
                    interface="popover"
                    className="genre-select-mini"
                    onIonChange={(e: any) => {
                      setCompletedDemographic(e.detail.value);
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
                    }}
                    className="full-color-chip-mini"
                  >
                    <IonIcon icon={sparklesOutline} />
                    <IonLabel>Color</IonLabel>
                  </IonChip>
                </div>
              </div>
            </div>

            {completedLoading && completedManga.length === 0 ? (
              <IonGrid className="search-results-grid" style={{ marginTop: '15px' }}>
                <IonRow>
                  {Array.from({ length: 12 }).map((_, i) => (
                     <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={i}>
                       <div className="skeleton-card">
                          <IonSkeletonText animated className="skeleton-img" />
                          <IonSkeletonText animated className="skeleton-text-main" />
                          <IonSkeletonText animated className="skeleton-text-sub" />
                       </div>
                     </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            ) : (
              <div className="results-container animate-fade-in-up">
                <IonGrid>
                  <IonRow>
                    {completedManga.map((manga: any) => (
                      <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={manga.id}>
                        <div className="card-hover-wrapper">
                          <MangaCard 
                            title={mangaProvider.getLocalizedTitle(manga)}
                            coverUrl={mangaProvider.getCoverUrl(manga)}
                            format={manga.attributes.mangaType || manga.attributes.originalLanguage}
                            onClick={() => router.push(`/manga/${manga.id}`)}
                          />
                        </div>
                      </IonCol>
                    ))}
                  </IonRow>
                </IonGrid>
                <IonInfiniteScroll disabled={isCompletedDone} onIonInfinite={loadMoreCompleted} threshold="100px">
                  <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Buscando más joyas..." />
                </IonInfiniteScroll>
              </div>
            )}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SearchPage;
