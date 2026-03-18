import React, { useState, useEffect } from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonTitle, 
  IonSpinner, 
  IonText, 
  IonBadge, 
  IonIcon, 
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSkeletonText,
  IonNote,
  useIonRouter,
  IonSelect,
  IonSelectOption,
  IonPopover,
  IonModal,
  useIonToast
} from '@ionic/react';
import { 
  heart, 
  heartOutline, 
  alertCircleOutline, 
  informationCircleOutline,
  bookOutline, 
  calendarOutline, 
  star, 
  shareSocialOutline,
  chevronBackOutline,
  chevronForwardOutline,
  playSkipBackOutline,
  playSkipForwardOutline,
  chatbubblesOutline,
  globeOutline,
  close,
  logoWhatsapp,
  logoTwitter,
  paperPlane,
  copyOutline,
  shareOutline
} from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { mangadexService } from '../services/mangadexService';
import { useLibraryStore } from '../store/useLibraryStore';
import ChapterItem from '../components/ChapterItem';

import LoadingScreen from '../components/LoadingScreen';
import CommentSection from '../components/CommentSection';
import { useMangaDetails } from '../hooks/useMangaDetails';
import { hapticsService } from '../services/hapticsService';
import { offlineService } from '../services/offlineService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { userStatsService } from '../services/userStatsService';
import './MangaDetailsPage.css';

const MangaDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  // Smart recommendations state
  const [verifiedRecs, setVerifiedRecs] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  // Offline downloads state
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set());
  const [downloadingChapters, setDownloadingChapters] = useState<Record<string, number>>({});
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [presentToast] = useIonToast();

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

  // Verify recommendations have chapters on MangaDex
  useEffect(() => {
    if (!aniData?.recommendations?.edges?.length) {
      setVerifiedRecs([]);
      return;
    }

    let cancelled = false;
    const verify = async () => {
      setLoadingRecs(true);
      const edges = aniData.recommendations.edges.slice(0, 10);
      const results: any[] = [];

      // Process in parallel (3 at a time to avoid rate limiting)
      // Process more in parallel for speed, but keep a small batching to be safe
      const results: any[] = [];
      const batchSize = 6; 

      for (let i = 0; i < edges.length; i += batchSize) {
        const batch = edges.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (edge: any) => {
            const rec = edge.node.mediaRecommendation;
            if (!rec) return null;
            const title = rec.title.english || rec.title.romaji || rec.title.native;
            try {
              const verified = await mangadexService.fetchVerifiedRecommendation(title);
              if (verified && verified.hasChapters && !cancelled) {
                return {
                  aniId: rec.id,
                  mdId: verified.id,
                  title: title,
                  coverImage: rec.coverImage.large,
                  score: rec.averageScore
                };
              }
            } catch { return null; }
            return null;
          })
        );
        
        if (cancelled) return;
        const filtered = batchResults.filter(Boolean);
        results.push(...filtered);
        
        if (results.length > 0) {
          setVerifiedRecs([...results]);
          setLoadingRecs(false);
        }
      }

      if (!cancelled) {
        setVerifiedRecs(results);
        setLoadingRecs(false);
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [aniData]);

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
    hapticsService.mediumImpact();
    toggleFavorite({ 
      id, 
      title: title as string, 
      cover: coverUrl,
      format: mangaFormat,
      tags: mangaTags
    });
  };

  const handleChatShare = async () => {
    const user = firebaseAuthService.getCurrentUser();
    if (!user) return;

    try {
      // Get flag and name for guest or user
      const locale = navigator.language || 'en-US';
      const countryCode = locale.split('-')[1] || locale.toUpperCase();
      const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
      const flag = String.fromCodePoint(...codePoints) || '🌍';
      const guestId = user.uid.substring(0, 4).toUpperCase();
      const finalDisplayName = user.displayName || `Lector ${guestId} ${flag}`;

      await addDoc(collection(db, 'global_chat'), {
        type: 'recommendation',
        text: `¡Os recomiendo este manga! 📖 ${title}`,
        mangaId: id,
        mangaTitle: title,
        mangaCover: coverUrl,
        userId: user.uid,
        userName: finalDisplayName,
        userAvatar: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
        timestamp: serverTimestamp()
      });

      // Award XP
      await userStatsService.awardRecommendationXP(user.uid);

      presentToast({
        message: '¡Recomendación enviada al Chat Global! +30 XP 🌟',
        duration: 2500,
        color: 'success',
        position: 'top'
      });
    } catch (error) {
      console.error("Error sharing to chat:", error);
    }
  };

  const handleSocialShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title as string,
          text: `Mira este manga en Lector Haus: ${title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      presentToast({
        message: 'Enlace copiado al portapapeles',
        duration: 2000,
        color: 'primary',
        position: 'top'
      });
    }
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

            <IonButton 
              fill="outline" 
              className="share-action-btn"
              onClick={() => {
                hapticsService.lightImpact();
                setShowShareSheet(true);
              }}
            >
              <IonIcon slot="icon-only" icon={shareSocialOutline} color="primary" />
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
          <div className="details-lang-header mobile-optimized-header">
            <div className="filter-select-group">
              <IonIcon icon={bookOutline} className="header-filter-icon" />
              <IonSelect 
                value={chapterLang} 
                interface="popover" 
                className="chapter-lang-select-v2"
                onIonChange={e => handleLangChange(e.detail.value)}
              >
                {[
                  { code: 'es', label: '🇪🇸 ES' },
                  { code: 'es-la', label: '🇲🇽 LAT' },
                  { code: 'en', label: '🇺🇸 EN' },
                  { code: 'pt-br', label: '🇧🇷 BR' },
                  { code: 'fr', label: '🇫🇷 FR' },
                  { code: 'it', label: '🇮🇹 IT' },
                  { code: 'de', label: '🇩🇪 DE' },
                  { code: 'ru', label: '🇷🇺 RU' },
                  { code: 'tr', label: '🇹🇷 TR' },
                  { code: 'vi', label: '🇻🇳 VI' },
                  { code: 'th', label: '🇹🇭 TH' },
                  { code: 'zh', label: '🇨🇳 ZH' },
                  { code: 'ja', label: '🇯🇵 JP' }
                ].map(lang => (
                  <IonSelectOption key={lang.code} value={lang.code}>{lang.label}</IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <IonButton 
              fill="clear" 
              className="order-toggle-btn-v2"
              onClick={() => {
                hapticsService.lightImpact();
                setChapterOrder(prev => prev === 'asc' ? 'desc' : 'asc');
              }}
            >
              <IonIcon icon={chapterOrder === 'asc' ? playSkipForwardOutline : playSkipBackOutline} style={{ transform: 'rotate(90deg)' }} />
              <span>{chapterOrder === 'asc' ? 'Primero' : 'Último'}</span>
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
              <div className="chapters-list-view">
                {chapters.map((chapter: any) => {
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
                      isDownloaded={downloadedChapters.has(chapter.id)}
                      downloadProgress={downloadingChapters[chapter.id]}
                      onDownload={async (e) => {
                        e.stopPropagation();
                        if (downloadedChapters.has(chapter.id)) return;
                        hapticsService.lightImpact();
                        setDownloadingChapters(prev => ({ ...prev, [chapter.id]: 0 }));
                        try {
                          const data = await mangadexService.getChapterPages(chapter.id);
                          if (data?.pages) {
                            const title = mangadexService.getLocalizedTitle(manga);
                            const cover = mangadexService.getCoverUrl(manga);
                            await offlineService.downloadChapter(
                              chapter.id, id || '', title, chapter.attributes?.chapter || '?', data.pages, cover,
                              (progress) => setDownloadingChapters(prev => ({ ...prev, [chapter.id]: progress.percent }))
                            );
                            setDownloadedChapters(prev => new Set([...prev, chapter.id]));
                          }
                        } catch (err) {
                          console.error('[Download] Failed:', err);
                        } finally {
                          setDownloadingChapters(prev => { const n = { ...prev }; delete n[chapter.id]; return n; });
                        }
                      }}
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
                })}
              </div>
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
              </div>
            )}
          </div>

          {/* Recommendations Section - Smart Verified */}
          {(loadingRecs || verifiedRecs.length > 0) && (
            <div className="recommendations-section">
              <h2 className="section-subtitle">También te gustará</h2>
              {loadingRecs ? (
                <div className="recommendations-scroll">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="recommendation-card-v2 skeleton-rec">
                      <div className="recommendation-cover-wrapper">
                        <IonSkeletonText animated style={{ width: '100%', height: '100%', borderRadius: '14px' }} />
                      </div>
                      <IonSkeletonText animated style={{ width: '80%', height: '14px', marginTop: '8px' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="recommendations-scroll">
                  {verifiedRecs.map((rec: any) => (
                    <div 
                      key={rec.aniId} 
                      className="recommendation-card-v2"
                      onClick={() => router.push(`/manga/${rec.mdId}`)}
                    >
                      <div className="recommendation-cover-wrapper">
                        <img 
                          src={mangadexService.getOptimizedUrl(rec.coverImage)} 
                          alt={rec.title} 
                          loading="lazy"
                        />
                        <div className="recommendation-score">
                          <IonIcon icon={star} />
                          {rec.score ? (rec.score / 10).toFixed(1) : '?.?'}
                        </div>
                      </div>
                      <p className="recommendation-title">{rec.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* El Muro Haus (Comments) */}
          <CommentSection mangaId={id} title="El Muro Haus - Opiniones" />
        </div>
      </IonContent>

      <IonModal
        isOpen={showShareSheet}
        onDidDismiss={() => setShowShareSheet(false)}
        initialBreakpoint={0.4}
        breakpoints={[0, 0.4, 0.6]}
        handle={true}
        className="premium-bottom-sheet"
      >
        <div className="share-sheet-content">
          <div className="share-sheet-header">
            <h3>Compartir en...</h3>
            <p>Elige dónde quieres recomendar este manga</p>
          </div>
          
          <div className="share-grid">
            <div className="share-item chat-global" onClick={handleChatShare}>
              <div className="share-icon-wrapper">
                <IonIcon icon={chatbubblesOutline} />
              </div>
              <span>Chat Global</span>
            </div>

            <div className="share-item whatsapp" onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(`Mira este manga en Lector Haus: ${title} ${window.location.href}`)}`, '_blank');
              setShowShareSheet(false);
            }}>
              <div className="share-icon-wrapper">
                <IonIcon icon={logoWhatsapp} />
              </div>
              <span>WhatsApp</span>
            </div>

            <div className="share-item telegram" onClick={() => {
              window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Mira este manga en Lector Haus: ${title}`)}`, '_blank');
              setShowShareSheet(false);
            }}>
              <div className="share-icon-wrapper">
                <IonIcon icon={paperPlane} />
              </div>
              <span>Telegram</span>
            </div>

            <div className="share-item twitter" onClick={() => {
              window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Mira este manga en Lector Haus: ${title} ${window.location.href}`)}`, '_blank');
              setShowShareSheet(false);
            }}>
              <div className="share-icon-wrapper">
                <IonIcon icon={logoTwitter} />
              </div>
              <span>Twitter</span>
            </div>

            <div className="share-item other" onClick={handleSocialShare}>
              <div className="share-icon-wrapper">
                <IonIcon icon={shareOutline} />
              </div>
              <span>Más</span>
            </div>

            <div className="share-item copy" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setShowShareSheet(false);
              presentToast({ message: 'Enlace copiado', duration: 2000, color: 'success' });
            }}>
              <div className="share-icon-wrapper">
                <IonIcon icon={copyOutline} />
              </div>
              <span>Copiar Link</span>
            </div>
          </div>
        </div>
      </IonModal>
    </IonPage>
  );
};

export default MangaDetailsPage;
