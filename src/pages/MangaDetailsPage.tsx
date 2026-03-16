import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonTitle, 
  IonImg, 
  IonText, 
  IonBadge, 
  IonSpinner,
  useIonRouter,
  IonButton,
  IonIcon,
  IonSkeletonText,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonPopover,
  IonNote
} from '@ionic/react';
import { heart, heartOutline, chevronBackOutline, chevronForwardOutline, playSkipBackOutline, playSkipForwardOutline, alertCircleOutline, informationCircleOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import ChapterItem from '../components/ChapterItem';
import LoadingScreen from '../components/LoadingScreen';
import CommentSection from '../components/CommentSection';
import { useMangaDetails } from '../hooks/useMangaDetails';
import './MangaDetailsPage.css';

const MangaDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const { toggleFavorite, isFavorite, isRead, getProgress, toggleRead } = useLibraryStore();
  const progress = id ? getProgress(id) : null;

  const {
    manga,
    aniData,
    chapters,
    loading,
    loadingChapters,
    currentPage,
    totalChapters,
    totalPages,
    chapterLang,
    availableLangs,
    mdStats,
    chapterOrder,
    setChapterOrder,
    handleLangChange,
    loadPage
  } = useMangaDetails(id);

  if (loading) {
    return (
      <IonPage>
        <LoadingScreen />
      </IonPage>
    );
  }

  if (!manga && !loading) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar className="glass-effect">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>Error</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ marginTop: '30vh' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😕</div>
            <h2>Manga no encontrado</h2>
            <p>Lo sentimos, no pudimos cargar la información de este manga.</p>
            <IonButton expand="block" fill="outline" onClick={() => router.push('/home')}>
              Volver al Inicio
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }
  const title = mangadexService.getLocalizedTitle(manga);
  const coverUrl = mangadexService.getCoverUrl(manga);
  const bestDescription = mangadexService.getLocalizedDescription(manga);


  const mangaFormat = manga?.attributes?.originalLanguage;
  const mangaTags = (manga?.attributes?.tags || [])
    .filter((t: any) => t.attributes?.group === 'genre')
    .slice(0, 2)
    .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');

  const handleToggleFavorite = () => {
    toggleFavorite({ 
      id, 
      title: title as string, 
      cover: coverUrl,
      format: mangaFormat,
      tags: mangaTags
    });
  };

  const lastReadChapterNum = progress?.chapterNumber;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="glass-effect">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleToggleFavorite}>
              <IonIcon slot="icon-only" icon={isFavorite(id) ? heart : heartOutline} color="danger" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Dynamic Cinematic Header */}
        <div className="manga-header-bg" style={{ backgroundImage: `url(${mangadexService.getOptimizedUrl(aniData?.bannerImage || coverUrl)})` }}>
          <div className="overlay-gradient"></div>
          <div className="details-header-content animate-fade-in">
            <img src={coverUrl} className="main-details-cover" alt={title} />
            <div className="title-section">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                <span className="badge-type">{manga?.attributes?.status}</span>
                {lastReadChapterNum && (
                  <IonBadge color="success" style={{ fontSize: '10px', fontWeight: 800 }}>LEYENDO CAP. {lastReadChapterNum}</IonBadge>
                )}
              </div>
              <h1>{title}</h1>
              {aniData && (
                <div className="ani-stats">
                  <IonBadge color="secondary">⭐ {aniData.averageScore}%</IonBadge>
                  <IonBadge color="tertiary">🔥 {aniData.popularity.toLocaleString()}</IonBadge>
                </div>
              )}
              {!aniData && mdStats.rating && (
                <div className="ani-stats">
                  <IonBadge color="secondary">⭐ {mdStats.rating.toFixed(1)}/10</IonBadge>
                  <IonBadge color="tertiary">👥 {mdStats.follows.toLocaleString()}</IonBadge>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="details-body animate-fade-in">
          <div className="action-buttons-container">
            {progress ? (
              <IonButton 
                expand="block" 
                color="secondary"
                className="continue-reading-btn"
                onClick={() => router.push(`/reader/${progress.chapterId}`)}
              >
                CONTINUAR CAP. {progress.chapterNumber} (Pág. {progress.pageIndex})
              </IonButton>
            ) : (
              <IonButton 
                expand="block" 
                className="read-now-btn" 
                onClick={() => {
                  // If order is descending (newest first), the first chapter is at the end.
                  // If order is ascending (oldest first), the first chapter is at the beginning.
                  const firstChapter = chapterOrder === 'desc' ? chapters[chapters.length - 1] : chapters[0];
                  if (firstChapter) {
                    if (firstChapter.attributes?.externalUrl) {
                      window.open(firstChapter.attributes.externalUrl, '_blank');
                    } else {
                      router.push(`/reader/${firstChapter.id}`);
                    }
                  }
                }}
              >
                EMPEZAR A LEER
              </IonButton>
            )}
            
            <IonButton 
              fill="outline" 
              className="fav-action-btn"
              onClick={handleToggleFavorite}
            >
              <IonIcon slot="icon-only" icon={isFavorite(id) ? heart : heartOutline} color="danger" />
            </IonButton>
          </div>


          <div className="language-status-badge">
             {(availableLangs.includes('es') || availableLangs.includes('es-la')) ? (
               <IonBadge color="success" mode="ios">Disponible en Español</IonBadge>
             ) : availableLangs.length > 0 ? (
               <IonBadge color="warning" mode="ios">Solo en: {availableLangs.join(', ').toUpperCase()}</IonBadge>
             ) : null}
          </div>

          <h2 className="section-subtitle">Sinopsis</h2>
          <p className="description-text">{bestDescription}</p>

          <div className="manga-details-tags">
             {(aniData?.genres || manga?.attributes?.tags || []).slice(0, 8).map((tag: any) => (
               <IonBadge key={tag.id || tag} color="light" mode="ios" style={{ marginBottom: '5px', marginRight: '5px' }}>
                 {tag.attributes?.name?.en || tag}
               </IonBadge>
             ))}
          </div>

          {/* Characters Section (AniList) */}
          {aniData?.characters?.edges?.length > 0 && (
            <div className="characters-section">
              <h2 className="section-subtitle">Personajes</h2>
              <div className="characters-scroll">
                {aniData.characters.edges.map((edge: any) => (
                  <div key={edge.node.id} className="character-card">
                    <img src={mangadexService.getOptimizedUrl(edge.node.image.medium)} alt={edge.node.name.full} />
                    <p>{edge.node.name.full}</p>
                    <span>{edge.role.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="section-subtitle">Capítulos</h2>
          <div className="details-lang-header" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <IonSelect 
              value={chapterLang} 
              interface="popover" 
              className="chapter-lang-select"
              onIonChange={e => handleLangChange(e.detail.value)}
              style={{ flex: 1 }}
            >
              <IonSelectOption value="es">🇪🇸 ES</IonSelectOption>
              <IonSelectOption value="es-la">🇲🇽 LAT</IonSelectOption>
              <IonSelectOption value="en">🇺🇸 EN</IonSelectOption>
              <IonSelectOption value="ja">🇯🇵 JP</IonSelectOption>
            </IonSelect>

            <IonButton 
              fill="clear" 
              size="small" 
              onClick={() => setChapterOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              style={{ marginLeft: '10px' }}
            >
              <IonIcon icon={chapterOrder === 'asc' ? chevronForwardOutline : chevronBackOutline} slot="start" style={{ transform: 'rotate(90deg)' }} />
            {chapterOrder === 'asc' ? 'Ascendente' : 'Descendente'}
            </IonButton>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '10px 15px', 
            background: 'rgba(255, 196, 9, 0.1)', 
            borderLeft: '4px solid #ffc409',
            margin: '10px 0 20px',
            borderRadius: '4px'
          }}>
            <IonIcon icon={informationCircleOutline} style={{ color: '#ffc409', fontSize: '24px' }} />
            <IonNote style={{ color: '#ddd', fontSize: '0.8rem', lineHeight: '1.2' }}>
              Algunos capítulos pueden faltar o estar incompletos debido a licencias oficiales o eliminación por derechos de autor.
            </IonNote>
          </div>

          <div className="chapters-container">
            {loadingChapters ? (
              <IonList className="skeleton-list">
                {[1, 2, 3, 4, 5].map(i => (
                  <IonItem key={i} lines="none" className="skeleton-item">
                    <IonLabel>
                      <IonSkeletonText animated style={{ width: '80%', height: '20px' }} />
                      <IonSkeletonText animated style={{ width: '40%', height: '14px' }} />
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            ) : chapters.length > 0 ? (
              chapters.map((chapter: any) => {
                const scanlationGroupRel = chapter.relationships?.find((r: any) => r.type === 'scanlation_group');
                const scanlationGroupName = scanlationGroupRel?.attributes?.name;
                
                return (
                  <ChapterItem 
                    key={chapter.id}
                    number={chapter.attributes?.chapter}
                    title={chapter.attributes?.title}
                    publishedAt={chapter.attributes?.readableAt}
                    externalUrl={chapter.attributes?.externalUrl}
                    scanlationGroup={scanlationGroupName}
                    isRead={isRead(chapter.id)}
                    onToggleRead={(e) => {
                      e.stopPropagation();
                      toggleRead(chapter.id);
                    }}
                    onClick={() => {
                      if (chapter.attributes.externalUrl) {
                        window.open(chapter.attributes.externalUrl, '_blank');
                      } else {
                        router.push(`/reader/${chapter.id}`);
                      }
                    }}
                  />
                );
              })
            ) : (
              <div className="empty-adventure animate-fade-in ion-text-center">
                <IonIcon icon={alertCircleOutline} color="medium" style={{ fontSize: '64px', marginBottom: '10px' }} />
                <h2>Historia no disponible</h2>
                <p>Esta aventura aún no ha sido traducida a tu idioma. ¡Busca otra leyenda!</p>
                <IonButton fill="clear" onClick={() => router.back()}>
                  Volver atrás
                </IonButton>
              </div>
            )}
            
            {/* Advanced Pro Pagination Controls */}
            {!loadingChapters && totalPages > 1 && (
              <div className="pro-pagination-container animate-fade-in">
                <div className="pro-pagination-bar">
                  <IonButton 
                    fill="clear" 
                    className="pro-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => loadPage(1)}
                    title="Primera página"
                  >
                    <IonIcon icon={playSkipBackOutline} />
                  </IonButton>

                  <IonButton 
                    fill="clear" 
                    className="pro-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => loadPage(currentPage - 1)}
                  >
                    <IonIcon icon={chevronBackOutline} />
                  </IonButton>
                  
                  <div className="pro-page-indicator" id="jump-page-trigger" style={{ cursor: 'pointer' }}>
                    <span className="pro-page-info">PÁGINA</span>
                    <span className="pro-page-current">{currentPage}</span>
                    <span className="pro-page-separator">/</span>
                    <span className="pro-page-total">{totalPages}</span>
                  </div>

                  <IonButton 
                    fill="clear" 
                    className="pro-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => loadPage(currentPage + 1)}
                  >
                    <IonIcon icon={chevronForwardOutline} />
                  </IonButton>

                  <IonButton 
                    fill="clear" 
                    className="pro-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => loadPage(totalPages)}
                    title="Última página"
                  >
                    <IonIcon icon={playSkipForwardOutline} />
                  </IonButton>
                </div>
                
                <div className="total-info-badge">
                  {totalChapters} Capítulos encontrados
                </div>

                <IonPopover trigger="jump-page-trigger" triggerAction="click" className="jump-page-popover">
                  <div className="popover-content">
                    <p>Saltar a página</p>
                    <div className="jump-input-container">
                      <input 
                        type="number" 
                        min="1" 
                        max={totalPages} 
                        defaultValue={currentPage}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt((e.target as HTMLInputElement).value);
                            if (val >= 1 && val <= totalPages) {
                              loadPage(val);
                              // Dismiss the popover after selection
                              const popover = document.querySelector('ion-popover.jump-page-popover') as any;
                              if (popover) popover.dismiss();
                            }
                          }
                        }}
                        className="jump-page-input"
                      />
                      <IonButton fill="clear" onClick={(e) => {
                        const input = (e.target as any).previousSibling as HTMLInputElement;
                        const val = parseInt(input.value);
                        if (val >= 1 && val <= totalPages) {
                          loadPage(val);
                          const popover = document.querySelector('ion-popover.jump-page-popover') as any;
                          if (popover) popover.dismiss();
                        }
                      }}>IR</IonButton>
                    </div>
                  </div>
                </IonPopover>
              </div>
            )}
          </div>

          {/* Recommendations Section */}
          {aniData?.recommendations?.edges?.length > 0 && (
            <div className="recommendations-section" style={{ marginTop: '30px' }}>
              <h2 className="section-subtitle">Recomendados</h2>
              <div className="recommendations-grid">
                {aniData.recommendations.edges.slice(0, 4).map((edge: any) => (
                  <div 
                    key={edge.node.mediaRecommendation.id} 
                    className="recommendation-thumb"
                    onClick={async () => {
                      const mdId = await mangadexService.fetchMangaDexIdByTitle(edge.node.mediaRecommendation.title.english || edge.node.mediaRecommendation.title.romaji);
                      if (mdId) router.push(`/manga/${mdId}`);
                    }}
                  >
                    <img src={mangadexService.getOptimizedUrl(edge.node.mediaRecommendation.coverImage.large)} alt="Recommend" />
                    <p>{edge.node.mediaRecommendation.title.romaji || edge.node.mediaRecommendation.title.english}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* El Muro Haus (Comments) */}
          <CommentSection mangaId={id} title="El Muro Haus - Opiniones" />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MangaDetailsPage;
