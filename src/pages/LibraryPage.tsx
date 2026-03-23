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
  IonBadge,
  useIonViewWillEnter,
  useIonRouter
} from '@ionic/react';
import { playOutline, gridOutline, listOutline, bookOutline, refreshCircleOutline, cloudDownloadOutline, trashOutline } from 'ionicons/icons';
import MangaCard from '../components/MangaCard';
import { mangaProvider } from '../services/mangaProvider';
import { useLibraryStore } from '../store/useLibraryStore';
import { hapticsService } from '../services/hapticsService';
import EmptyState from '../components/EmptyState';
import { offlineService, DownloadedChapter } from '../services/offlineService';
import './LibraryPage.css';

const LibraryPage: React.FC = () => {
  const [followedManga, setFollowedManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'descargas'>('favorites');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadedMangas, setDownloadedMangas] = useState<Record<string, { title: string; cover?: string; chapters: DownloadedChapter[] }>>({});
  const [storageInfo, setStorageInfo] = useState({ totalMB: '0', chapterCount: 0 });
  
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
    // Load downloads info
    offlineService.getDownloadedMangas().then(setDownloadedMangas);
    offlineService.getTotalStorageUsed().then(info => setStorageInfo({ totalMB: info.totalMB, chapterCount: info.chapterCount }));
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
            <IonSegment value={activeTab} onIonChange={e => {
              hapticsService.lightImpact();
              setActiveTab(e.detail.value as any);
            }} mode="ios" style={{ width: '60%' }}>
              <IonSegmentButton value="favorites"><IonLabel>Favoritos</IonLabel></IonSegmentButton>
              <IonSegmentButton value="history"><IonLabel>Historial</IonLabel></IonSegmentButton>
              <IonSegmentButton value="descargas"><IonLabel>Descargas</IonLabel></IonSegmentButton>
            </IonSegment>
            <div className="view-toggles" style={{ display: 'flex', gap: '8px' }}>
              <IonIcon 
                icon={gridOutline} 
                className="clickable-icon"
                style={{ fontSize: '1.4rem', color: viewMode === 'grid' ? 'var(--ion-color-primary)' : 'gray' }} 
                onClick={() => setViewMode('grid')}
                aria-label="Ver en cuadrícula"
              />
              <IonIcon 
                icon={listOutline} 
                className="clickable-icon"
                style={{ fontSize: '1.4rem', color: viewMode === 'list' ? 'var(--ion-color-primary)' : 'gray' }} 
                onClick={() => setViewMode('list')}
                aria-label="Ver en lista"
              />
              <IonIcon 
                icon={refreshCircleOutline} 
                className="clickable-icon"
                style={{ fontSize: '1.4rem', color: 'var(--ion-color-warning, #ffc409)' }} 
                onClick={clearCache}
                aria-label="Limpiar cache"
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
                const title = entry.mangaTitle || fav?.title || 'Sin título';
                const cover = entry.mangaCover || fav?.cover;
                return (
                  <div 
                    key={entry.mangaId} 
                    className="history-hero-card"
                    onClick={() => router.push(`/reader/${entry.chapterId}`)}
                  >
                    <div className="history-hero-cover-wrapper">
                      {cover ? (
                        <img src={cover} alt={title} className="history-hero-cover" width={110} height={160} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📖</div>
                      )}
                      <div className="history-hero-overlay">
                        <IonIcon icon={playOutline} />
                      </div>
                    </div>
                    <div className="history-hero-info">
                      <p className="hero-manga-title">{title}</p>
                      <p className="hero-chapter-info">Cap. {entry.chapterNumber || '?'}</p>
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
                      <IonGrid>
                        <IonRow>
                          {filteredFavorites.map((manga: any) => (
                            <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={manga.id}>
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
                             <img src={manga.cover} alt="cover" className="list-item-cover" width={40} height={60} />
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
                      <IonGrid>
                        <IonRow>
                          {filteredFollowed.map((manga: any) => (
                            <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={manga.id}>
                              <MangaCard 
                                title={manga.attributes.title.en || Object.values(manga.attributes.title)[0]}
                                coverUrl={mangaProvider.getCoverUrl(manga)}
                                progressLabel={history[manga.id] ? `Cap. ${history[manga.id].chapterNumber}` : undefined}
                                onClick={() => router.push(`/manga/${manga.id}`)}
                              />
                            </IonCol>
                          ))}
                        </IonRow>
                      </IonGrid>
                    ) : (
                      <div className="library-list-container">
                        {filteredFollowed.map((manga: any) => {
                           const prog = history[manga.id];
                           return (
                           <div key={manga.id} className="library-list-item" onClick={() => router.push(`/manga/${manga.id}`)}>
                             <img src={mangaProvider.getCoverUrl(manga)} alt="cover" className="list-item-cover" width={40} height={60} />
                             <div className="list-item-info">
                               <h3 className="list-item-title">{mangaProvider.getLocalizedTitle(manga) as React.ReactNode}</h3>
                               {prog && (
                                 <IonBadge color="success" mode="ios" style={{ fontSize: '10px' }}>
                                   LEYENDO CAP. {prog.chapterNumber}
                                 </IonBadge>
                               )}
                             </div>
                           </div>
                        )})}
                      </div>
                    )}
                  </div>
                )}

                {filteredFavorites.length === 0 && filteredFollowed.length === 0 && searchTerm && (
                  <EmptyState 
                    emoji="🔍"
                    title={`Sin resultados para "${searchTerm}"`}
                    subtitle="Prueba con otro nombre o revisa la ortografía"
                  />
                )}
              </>
            )}

            {activeTab === 'history' && (
              <div className="history-full-list animate-fade-in">
                {historyEntries.length > 0 ? (
                  <div className="history-list-detailed">
                    {historyEntries.map((entry) => {
                      const fav = favorites.find(f => f.id === entry.mangaId);
                      const title = entry.mangaTitle || fav?.title || 'Sin título';
                      const cover = entry.mangaCover || fav?.cover;
                      const dateStr = entry.lastRead ? new Date(entry.lastRead).toLocaleDateString() : 'Fecha desconocida';
                      return (
                        <div key={entry.mangaId} className="history-detailed-item" onClick={() => router.push(`/manga/${entry.mangaId}`)}>
                          {cover ? (
                            <img src={cover} alt={title} className="history-detailed-cover" width={50} height={70} />
                          ) : (
                            <div className="history-detailed-cover" style={{ background: 'linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', borderRadius: '8px', width: '50px', height: '70px' }}>📖</div>
                          )}
                          <div className="history-detailed-info">
                            <h4 className="history-detailed-title">{title}</h4>
                            <p className="history-detailed-progress">Capítulo {entry.chapterNumber || '?'}</p>
                            <p className="history-detailed-date">Leído el {dateStr}</p>
                          </div>
                          <IonButton fill="clear" color="primary" onClick={(e) => { e.stopPropagation(); router.push(`/reader/${entry.chapterId}`) }}>
                            <IonIcon icon={playOutline} slot="icon-only" aria-label="Continuar leyendo capítulo" />
                          </IonButton>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState 
                    emoji="📖"
                    title="Sin historial de lectura"
                    subtitle="Empieza a leer un manga y tu progreso aparecerá aquí"
                    actionLabel="Explorar manga"
                    onAction={() => router.push('/search')}
                  />
                )}
              </div>
            )}

            {activeTab === 'descargas' && (
              <div className="downloads-full-list animate-fade-in">
                {Object.keys(downloadedMangas).length > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '0 5px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <IonIcon icon={cloudDownloadOutline} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                        {storageInfo.chapterCount} capítulos · {storageInfo.totalMB} MB
                      </span>
                      <IonButton fill="clear" color="danger" size="small" onClick={async () => {
                        if (window.confirm('¿Borrar todas las descargas?')) {
                          await offlineService.clearAllDownloads();
                          setDownloadedMangas({});
                          setStorageInfo({ totalMB: '0', chapterCount: 0 });
                        }
                      }}>
                        <IonIcon icon={trashOutline} slot="start" aria-label="Borrar todas las descargas" /> Borrar todo
                      </IonButton>
                    </div>
                    {Object.entries(downloadedMangas).map(([mangaId, manga]) => (
                      <div key={mangaId} className="download-manga-group" style={{ marginBottom: '20px', background: 'var(--bg-surface, #1a1a2e)', borderRadius: '14px', padding: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px', cursor: 'pointer' }} onClick={() => router.push(`/manga/${mangaId}`)}>
                          {manga.cover && <img src={manga.cover} alt="" width={45} height={65} style={{ width: '45px', height: '65px', borderRadius: '8px', objectFit: 'cover' }} />}
                          <div>
                            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{manga.title}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{manga.chapters.length} capítulos descargados</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {manga.chapters.map(ch => (
                            <IonChip key={ch.chapterId} outline color="primary" style={{ fontSize: '0.8rem' }}
                              onClick={() => router.push(`/reader/${ch.chapterId}`)}
                            >
                              Cap. {ch.chapterNumber}
                              <IonIcon icon={trashOutline} color="danger" style={{ marginLeft: '6px', fontSize: '0.9rem' }} onClick={async (e) => {
                                e.stopPropagation();
                                await offlineService.deleteChapter(ch.chapterId);
                                const updated = await offlineService.getDownloadedMangas();
                                setDownloadedMangas(updated);
                                const info = await offlineService.getTotalStorageUsed();
                                setStorageInfo({ totalMB: info.totalMB, chapterCount: info.chapterCount });
                              }} />
                            </IonChip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <EmptyState 
                    emoji="📥"
                    title="Sin descargas"
                    subtitle="Descarga capítulos desde la página del manga para leerlos sin conexión"
                    actionLabel="Explorar manga"
                    onAction={() => router.push('/search')}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          <EmptyState 
            emoji="📚"
            title="Tu biblioteca está vacía"
            subtitle={!isLoggedIn ? 'Inicia sesión con MangaDex para sincronizar tus suscripciones' : 'Añade mangas a favoritos para verlos aquí'}
            actionLabel="Explorar manga"
            onAction={() => router.push('/search')}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

export default LibraryPage;
