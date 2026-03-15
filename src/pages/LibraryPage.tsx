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
  useIonViewWillEnter,
  useIonRouter
} from '@ionic/react';
import { playOutline, gridOutline, listOutline, bookOutline } from 'ionicons/icons';
import MangaCard from '../components/MangaCard';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import './LibraryPage.css';

const LibraryPage: React.FC = () => {
  const [followedManga, setFollowedManga] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'local' | 'md'>('all');
  
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

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="glass-effect" style={{ paddingBottom: '10px' }}>
          <IonTitle>Mi Biblioteca</IonTitle>
          <div className="library-controls" style={{ padding: '0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
            <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as any)} mode="ios" style={{ width: '70%' }}>
              <IonSegmentButton value="all"><IonLabel>Todos</IonLabel></IonSegmentButton>
              <IonSegmentButton value="local"><IonLabel>Locales</IonLabel></IonSegmentButton>
              <IonSegmentButton value="md"><IonLabel>Suscritos</IonLabel></IonSegmentButton>
            </IonSegment>
            <div className="view-toggles" style={{ display: 'flex', gap: '10px' }}>
              <IonIcon 
                icon={gridOutline} 
                style={{ fontSize: '1.5rem', color: viewMode === 'grid' ? 'var(--ion-color-primary)' : 'gray' }} 
                onClick={() => setViewMode('grid')}
              />
              <IonIcon 
                icon={listOutline} 
                style={{ fontSize: '1.5rem', color: viewMode === 'list' ? 'var(--ion-color-primary)' : 'gray' }} 
                onClick={() => setViewMode('list')}
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
        {/* Reading History Section */}
        {historyEntries.length > 0 && (
          <div className="library-section">
            <div className="library-section-title">
              <h2>📖 Continuar Leyendo</h2>
            </div>
            <div className="history-list">
              {historyEntries.map((entry) => {
                // Find matching favorite for the title/cover
                const fav = favorites.find(f => f.id === entry.mangaId);
                const title = fav?.title || 'Manga';
                return (
                  <div 
                    key={entry.mangaId} 
                    className="history-card"
                    onClick={() => router.push(`/reader/${entry.chapterId}`)}
                  >
                    {fav?.cover && (
                      <img src={fav.cover} alt={title} className="history-cover" />
                    )}
                    <div className="history-info">
                      <p className="history-title">{title}</p>
                      <p className="history-progress">Cap. {entry.chapterNumber} · Pág. {entry.pageIndex}</p>
                      <p className="history-time">{new Date(entry.lastRead).toLocaleDateString('es')}</p>
                    </div>
                    <IonButton fill="clear" color="primary" className="history-play-btn">
                      <IonIcon icon={playOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="library-loader">
            <IonSpinner name="crescent" color="primary" />
            <p>Sincronizando biblioteca...</p>
          </div>
        ) : (favorites.length > 0 || followedManga.length > 0) ? (
          <div className={`library-${viewMode}-view`}>
            {(activeTab === 'all' || activeTab === 'local') && favorites.length > 0 && (
              <>
                <div className="library-section-title">
                  <h2>Tus Favoritos Locales</h2>
                </div>
                {viewMode === 'grid' ? (
                  <IonGrid>
                    <IonRow>
                      {favorites.map((manga: any) => (
                        <IonCol size="6" sizeMd="3" sizeLg="2" key={manga.id}>
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
                    {favorites.map((manga: any) => (
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
              </>
            )}

            
            {(activeTab === 'all' || activeTab === 'md') && followedManga.length > 0 && (
              <>
                <div className="library-section-title" style={{ marginTop: '2rem' }}>
                  <h2>Suscripciones MangaDex</h2>
                </div>
                {viewMode === 'grid' ? (
                  <IonGrid>
                    <IonRow>
                      {followedManga.map((manga: any) => (
                        <IonCol size="6" sizeMd="3" sizeLg="2" key={manga.id}>
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
                    {followedManga.map((manga: any) => (
                       <div key={manga.id} className="library-list-item" onClick={() => router.push(`/manga/${manga.id}`)}>
                         <img src={mangadexService.getCoverUrl(manga)} alt="cover" className="list-item-cover" />
                         <div className="list-item-info">
                           <h3 className="list-item-title">{manga.attributes.title.en || Object.values(manga.attributes.title)[0]}</h3>
                           <p className="list-item-format">MangaDex Sync</p>
                         </div>
                       </div>
                    ))}
                  </div>
                )}
              </>
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
