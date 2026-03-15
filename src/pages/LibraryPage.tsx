import React, { useEffect, useState } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonText, 
  IonSpinner, 
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonChip,
  useIonViewWillEnter,
  useIonRouter
} from '@ionic/react';
import { playOutline, gridOutline, listOutline, bookOutline, refreshCircleOutline } from 'ionicons/icons';
import MangaCard from '../components/MangaCard';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import './LibraryPage.css';

const LibraryPage: React.FC = () => {
  const [followedManga, setFollowedManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'favorites' | 'history'>('favorites');
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useIonRouter();
  const { favorites, history } = useLibraryStore();

  // Get history entries sorted by most recent
  const historyEntries = Object.entries(history)
    .map(([mangaId, progress]) => ({ mangaId, ...progress }))
    .sort((a, b) => b.lastRead - a.lastRead)
    .slice(0, 10);

  const fetchLibrary = async () => {
    const sessionToken = localStorage.getItem('md_session');
    if (!sessionToken) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    
    setIsLoggedIn(true);
    setLoading(true);
    try {
      const response = await fetch('https://api.mangadex.org/user/follows/manga?includes[]=cover_art&limit=50', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      const data = await response.json();
      if(data.result === 'ok') {
        setFollowedManga(data.data);
      }
    } catch (error) {
      console.error('Error fetching library:', error);
    } finally {
      setLoading(false);
    }
  };

  useIonViewWillEnter(() => {
    fetchLibrary();
  });

  const clearCache = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar el cache? Esto limpiará tus favoritos locales y el historial.')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
    }
  };

  const filteredFavorites = favorites.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFollowed = followedManga.filter(m => 
    (m.attributes.title.en || Object.values(m.attributes.title)[0] as string).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="glass-effect" style={{ paddingBottom: '10px' }}>
          <IonTitle>Mi Biblioteca</IonTitle>
          <div className="library-controls" style={{ padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
            <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as any)} mode="ios" style={{ width: '60%' }}>
              <IonSegmentButton value="favorites"><IonLabel>Favoritos</IonLabel></IonSegmentButton>
              <IonSegmentButton value="history"><IonLabel>Historial</IonLabel></IonSegmentButton>
            </IonSegment>
            <div className="view-toggles" style={{ display: 'flex', gap: '8px' }}>
              <IonIcon 
                icon={gridOutline} 
                style={{ fontSize: '1.4rem', color: viewMode === 'grid' ? 'var(--ion-color-primary)' : 'gray' }} 
                onClick={() => setViewMode('grid')}
              />
              <IonIcon 
                icon={listOutline} 
                style={{ fontSize: '1.4rem', color: viewMode === 'list' ? 'var(--ion-color-primary)' : 'gray' }} 
                onClick={() => setViewMode('list')}
              />
              <IonIcon 
                icon={refreshCircleOutline} 
                style={{ fontSize: '1.4rem', color: 'var(--ion-color-warning, #ffc409)' }} 
                onClick={clearCache}
              />
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        
        {/* Statistics Header */}
        <div className="library-stats-header animate-fade-in" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--ion-color-step-100, #1e1e1e)', padding: '15px', borderRadius: '15px' }}>
            <IonIcon icon={bookOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-primary)' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Tu Colección</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'gray' }}>{favorites.length} guardados · {followedManga.length} suscritos</p>
            </div>
        </div>
        {/* --- HERO: Continuar Leyendo (Pro Look) --- */}
        {historyEntries.length > 0 && (
          <div className="library-hero-history animate-fade-in">
            <div className="section-header">
              <div className="accent-bar" style={{ background: 'var(--ion-color-primary)' }}></div>
              <h2>Continuar Leyendo</h2>
            </div>
            <div className="history-carousel-container">
              {historyEntries.map((entry) => {
                const fav = favorites.find(f => f.id === entry.mangaId);
                const title = fav?.title || 'Manga';
                return (
                  <div 
                    key={entry.mangaId} 
                    className="history-hero-card"
                    onClick={() => router.push(`/reader/${entry.chapterId}`)}
                  >
                    <div className="history-hero-cover-wrapper">
                      {fav?.cover && <img src={fav.cover} alt={title} className="history-hero-cover" />}
                      <div className="history-hero-overlay">
                        <IonIcon icon={playOutline} />
                      </div>
                    </div>
                    <div className="history-hero-info">
                      <p className="hero-manga-title">{title}</p>
                      <p className="hero-chapter-info">Cap. {entry.chapterNumber}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- Favorites Search Bar --- */}
        {activeTab === 'favorites' && (favorites.length > 0 || followedManga.length > 0) && (
          <div className="library-search-container animate-fade-in">
            <input 
              type="text" 
              placeholder="Buscar en mis favoritos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="library-search-input"
            />
          </div>
        )}

        {loading ? (
          <div className="library-loader">
            <IonSpinner name="crescent" color="primary" />
            <p>Sincronizando biblioteca...</p>
          </div>
        ) : (favorites.length > 0 || followedManga.length > 0 || activeTab === 'history') ? (
          <div className={`library-content-view`}>
            {activeTab === 'favorites' && (
              <>
                {/* Local Favorites */}
                {filteredFavorites.length > 0 && (
                  <div className="library-section animate-fade-in">
                    <div className="library-section-title">
                      <h3>Tus Favoritos Locales</h3>
                    </div>
                    {viewMode === 'grid' ? (
                      <IonGrid className="ion-no-padding">
                        <IonRow>
                          {filteredFavorites.map((manga: any) => (
                            <IonCol size="4" sizeMd="3" sizeLg="2" key={manga.id} className="ion-no-padding">
                              <MangaCard 
                                title={manga.title}
                                coverUrl={manga.cover}
                                format={manga.format}
                                tags={manga.tags}
                                progressLabel={history[manga.id] ? `Cap. ${history[manga.id].chapterNumber}` : undefined}
                                onClick={() => router.push(`/manga/${manga.id}`)}
                              />
                            </IonCol>
                          ))}
                        </IonRow>
                      </IonGrid>
                    ) : (
                      <div className="library-list-container">
                        {filteredFavorites.map((manga: any) => (
                           <div key={manga.id} className="library-list-item" onClick={() => router.push(`/manga/${manga.id}`)}>
                             <img src={manga.cover} alt="cover" className="list-item-cover" />
                             <div className="list-item-info">
                               <h3 className="list-item-title">{manga.title}</h3>
                               <p className="list-item-format">Formato Local</p>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* MangaDex Subscriptions */}
                {filteredFollowed.length > 0 && (
                  <div className="library-section animate-fade-in" style={{ marginTop: '2rem' }}>
                    <div className="library-section-title">
                      <h3>Suscripciones MangaDex</h3>
                    </div>
                    {viewMode === 'grid' ? (
                      <IonGrid className="ion-no-padding">
                        <IonRow>
                          {filteredFollowed.map((manga: any) => (
                            <IonCol size="4" sizeMd="3" sizeLg="2" key={manga.id} className="ion-no-padding">
                              <MangaCard 
                                title={manga.attributes.title.en || Object.values(manga.attributes.title)[0]}
                                coverUrl={mangadexService.getCoverUrl(manga)}
                                progressLabel={history[manga.id] ? `Cap. ${history[manga.id].chapterNumber}` : undefined}
                                onClick={() => router.push(`/manga/${manga.id}`)}
                              />
                            </IonCol>
                          ))}
                        </IonRow>
                      </IonGrid>
                    ) : (
                      <div className="library-list-container">
                        {filteredFollowed.map((manga: any) => (
                           <div key={manga.id} className="library-list-item" onClick={() => router.push(`/manga/${manga.id}`)}>
                             <img src={mangadexService.getCoverUrl(manga)} alt="cover" className="list-item-cover" />
                             <div className="list-item-info">
                               <h3 className="list-item-title">{mangadexService.getLocalizedTitle(manga)}</h3>
                               <p className="list-item-format">MangaDex Sync</p>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filteredFavorites.length === 0 && filteredFollowed.length === 0 && searchTerm && (
                  <div className="library-empty-state">
                    <p>No se encontraron resultados para "{searchTerm}"</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'history' && (
              <div className="history-full-list animate-fade-in">
                {historyEntries.length > 0 ? (
                  <div className="history-list-detailed">
                    {historyEntries.map((entry) => {
                      const fav = favorites.find(f => f.id === entry.mangaId);
                      const title = fav?.title || 'Manga';
                      return (
                        <div key={entry.mangaId} className="history-detailed-item" onClick={() => router.push(`/manga/${entry.mangaId}`)}>
                          <img src={fav?.cover} alt={title} className="history-detailed-cover" />
                          <div className="history-detailed-info">
                            <h4 className="history-detailed-title">{title}</h4>
                            <p className="history-detailed-progress">Capítulo {entry.chapterNumber}</p>
                            <p className="history-detailed-date">Leído el {new Date(entry.lastRead).toLocaleDateString()}</p>
                          </div>
                          <IonButton fill="clear" color="primary" onClick={(e) => { e.stopPropagation(); router.push(`/reader/${entry.chapterId}`) }}>
                            <IonIcon icon={playOutline} slot="icon-only" />
                          </IonButton>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="library-empty-state">
                    <p>Aún no has leído ningún manga.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="library-empty-state">
            <IonText color="medium">
              <p>No tienes mangas en tu biblioteca todavía.</p>
              {!isLoggedIn && (
                <p className="login-hint">Inicia sesión con MangaDex para sincronizar tus suscripciones.</p>
              )}
            </IonText>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LibraryPage;
