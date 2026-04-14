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
  IonModal,
  useIonToast,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  heart, 
  heartOutline, 
  alertCircleOutline, 
  informationCircleOutline,
  bookOutline, 
  star,
  shareSocialOutline,
  playSkipBackOutline,
  playSkipForwardOutline,
  chatbubblesOutline,
  logoWhatsapp,
  logoTwitter,
  paperPlane,
  copyOutline,
  shareOutline,
  sparklesOutline,
  book,
  arrowForward,
  swapVerticalOutline
} from 'ionicons/icons';
import { useParams, useLocation } from 'react-router-dom';
import { mangaProvider, sanitizeDescription } from '../../services/mangaProvider';
import { useLibraryStore } from '../../store/useLibraryStore';
import ChapterItem from '../../components/ChapterItem';
import LoadingScreen from '../../components/LoadingScreen';
import CommentSection from '../../components/CommentSection';
import UniversalEngagementBar from '../../components/UniversalEngagementBar';
import CrossMediaBanner from '../../components/CrossMediaBanner';
import { useMangaDetails } from '../../hooks/useMangaDetails';
import { useCrossMedia } from '../../hooks/useCrossMedia';
import { hapticsService } from '../../services/hapticsService';
import { offlineService } from '../../services/offlineService';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { userStatsService } from '../../services/userStatsService';
import SmartImage from '../../components/SmartImage';
import '../../theme/CinematicHero.css';
import './styles.css';

const MangaDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Instant Initial Data from Navigation State
  const initialData = (location.state as any)?.manga;
  
  useEffect(() => {
    const unsub = firebaseAuthService.subscribe(user => setCurrentUser(user));
    return () => unsub();
  }, []);

  const { toggleFavorite, isFavorite, isRead, getProgress, toggleRead, showNSFW } = useLibraryStore();
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
    isOptimized,
    isTranslated,
    isFetchingMore,
    setChapterOrder,
    handleLangChange,
    loadMoreChapters
  } = useMangaDetails(id, initialData);

  // Smart recommendations state
  const [verifiedRecs, setVerifiedRecs] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  // Offline downloads state
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set());
  const [downloadingChapters, setDownloadingChapters] = useState<Record<string, number>>({});
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [presentToast] = useIonToast();

  const parsedTitle = manga ? mangaProvider.getLocalizedTitle(manga) : null;
  const { crossMedia, loadingCrossMedia } = useCrossMedia(parsedTitle as string, 'MANGA');

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
      // Process more in parallel for speed, but keep a small batching to be safe
      const batchSize = 6; 

      for (let i = 0; i < edges.length; i += batchSize) {
        const batch = edges.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (edge: any) => {
            const rec = edge.node.mediaRecommendation;
            if (!rec) return null;
            const title = rec.title.english || rec.title.romaji || rec.title.native;
            try {
              const verified = await mangaProvider.fetchVerifiedRecommendation(title, showNSFW);
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

  // Pro-Level Prefetching Strategy
  useEffect(() => {
    if (chapters && chapters.length > 0) {
      const firstChapter = chapterOrder === 'desc' ? chapters[chapters.length - 1] : chapters[0];
      if (firstChapter?.id) {
        console.log(`[Pro-Prefetch] Pre-loading first chapter pages: ${firstChapter.id}`);
        // Prefetch pages to cache
        queryClient.prefetchQuery({
          queryKey: ['chapterPages', firstChapter.id, 'data'],
          queryFn: () => mangaProvider.getChapterPages(firstChapter.id, 'data'),
          staleTime: 1000 * 60 * 5 // 5 minutes
        });
      }
    }
  }, [chapters, chapterOrder, queryClient]);

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
  const title = mangaProvider.getLocalizedTitle(manga);
  const aniListCover = aniData?.coverImage?.extraLarge || aniData?.coverImage?.large;
  const coverUrl = mangaProvider.getCoverUrl(manga, '512', aniListCover);
  const bestDescription = manga?.attributes?.translatedDescription 
    ? sanitizeDescription(manga.attributes.translatedDescription) 
    : mangaProvider.getLocalizedDescription(manga);


  const mangaFormat = manga?.attributes?.originalLanguage;
  const mangaTags = (manga?.attributes?.tags || [])
    .filter((t: any) => t.attributes?.group === 'genre')
    .slice(0, 2)
    .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es || '');

  const handleToggleFavorite = () => {
    if (!currentUser) {
       presentToast({ message: '⚠️ Inicia sesión para guardar favoritos', color: 'warning', duration: 2500 });
       const banner = document.querySelector('.auth-wall-banner');
       if (banner) {
         banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
         banner.classList.add('pulse-animation');
         setTimeout(() => banner.classList.remove('pulse-animation'), 1000);
       }
       return;
    }
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
            <IonButton onClick={handleToggleFavorite} aria-label={isFavorite(id) ? "Quitar de favoritos" : "Añadir a favoritos"}>
              <IonIcon slot="icon-only" icon={isFavorite(id) ? heart : heartOutline} color="danger" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Dynamic Cinematic Header */}
        <div className="manga-header-bg">
          {/* Optimized Banner Image for LCP */}
          <img 
            src={mangaProvider.getOptimizedUrl(aniData?.bannerImage || coverUrl)} 
            alt="Banner"
            className="banner-img-layer"
            loading="eager"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div className="overlay-gradient"></div>
          <div className="details-header-content animate-fade-in">
            <SmartImage 
              src={coverUrl} 
              className="main-details-cover" 
              wrapperClassName="main-details-cover-wrapper"
              alt={title || 'Portada'} 
              width={180}
              height={260}
              loading="eager"
            />
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
          
          {/* AUTH WALL BANNER */}
          {!currentUser && (
            <button 
              className="auth-wall-banner animate-slide-up" 
              onClick={() => router.push('/profile')}
              aria-label="Ir al perfil para iniciar sesión"
            >
              <div className="auth-wall-icon">
                <IonIcon icon={sparklesOutline} />
              </div>
              <div className="auth-wall-text">
                <h3>Únete a la Aventura</h3>
                <p>Inicia sesión o usa el <b>Modo Fantasma 👻</b> para guardar esta leyenda en tus favoritos.</p>
              </div>
              <IonButton shape="round" color="primary" size="small" className="auth-wall-btn">
                Ir al Perfil
              </IonButton>
            </button>
          )}

          <div className="action-buttons-container">
            {progress ? (
              <IonButton 
                expand="block" 
                color="secondary"
                className="continue-reading-btn"
                onClick={() => {
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  hapticsService.mediumImpact();
                  setTimeout(() => {
                    router.push(`/reader/${progress.chapterId}`);
                  }, 150);
                }}
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
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    hapticsService.mediumImpact();
                    setTimeout(() => {
                      if (firstChapter.attributes?.externalUrl) {
                        window.open(firstChapter.attributes.externalUrl, '_blank');
                      } else {
                        router.push(`/reader/${firstChapter.id}`);
                      }
                    }, 150);
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
              aria-label="Compartir manga"
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

          <h2 className="section-subtitle">
            Sinopsis
            {isTranslated && (
              <IonBadge color="secondary" style={{ marginLeft: '10px', fontSize: '0.7rem', verticalAlign: 'middle', background: 'rgba(var(--ion-color-secondary-rgb), 0.15)', color: 'var(--ion-color-secondary)', border: '1px solid rgba(var(--ion-color-secondary-rgb), 0.3)' }}>
                ✨ TRADUCIDO POR IA
              </IonBadge>
            )}
          </h2>
          <p className={`description-text ${!showFullDescription ? 'truncated-description' : ''}`}>
            {bestDescription}
          </p>
          {bestDescription && bestDescription.length > 400 && (
            <div 
              className="read-more-btn" 
              onClick={() => {
                hapticsService.lightImpact();
                setShowFullDescription(!showFullDescription);
              }}
            >
              {showFullDescription ? 'Ver menos ↑' : 'Leer más ...'}
            </div>
          )}

          {!loadingCrossMedia && crossMedia && (
            <CrossMediaBanner crossMedia={crossMedia} />
          )}

          <div className="manga-details-tags">
             {Array.isArray(aniData?.genres || manga?.attributes?.tags) && (aniData?.genres || manga?.attributes?.tags || []).slice(0, 8).map((tag: any) => (
               <IonBadge key={tag.id || tag} color="light" mode="ios" style={{ marginBottom: '5px', marginRight: '5px' }}>
                 {tag.attributes?.name?.en || tag.attributes?.name?.es || tag}
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
                    <div className="character-img-wrapper">
                      <SmartImage 
                        src={mangaProvider.getOptimizedUrl(edge.node.image.medium)} 
                        alt={edge.node.name.full} 
                      />
                    </div>
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
              aria-label={chapterOrder === 'asc' ? "Cambiar a orden descendente" : "Cambiar a orden ascendente"}
            >
              <IonIcon icon={chapterOrder === 'asc' ? playSkipForwardOutline : playSkipBackOutline} style={{ transform: 'rotate(90deg)' }} />
              <span>{chapterOrder === 'asc' ? 'Primero' : 'Último'}</span>
            </IonButton>
          </div>

          {isOptimized ? (
            <div className="haus-optimizer-badge animate-pulse-gentle" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              padding: '12px 18px', 
              background: 'linear-gradient(135deg, rgba(var(--ion-color-secondary-rgb), 0.15), rgba(var(--ion-color-primary-rgb), 0.05))', 
              borderLeft: '4px solid var(--ion-color-secondary)',
              margin: '10px 0 20px',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              <div style={{ 
                background: 'var(--ion-color-secondary)', 
                borderRadius: '50%', 
                width: '32px', 
                height: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(var(--ion-color-secondary-rgb), 0.5)'
              }}>
                <IonIcon icon={sparklesOutline} style={{ color: '#fff', fontSize: '18px' }} />
              </div>
              <div>
                <IonText color="secondary" style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block' }}>Haus Intelligent Optimizer</IonText>
                <IonNote style={{ color: '#aaa', fontSize: '0.75rem' }}>
                  Contenido optimizado automáticamente desde fuente de respaldo.
                </IonNote>
              </div>
            </div>
          ) : (
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
          )}

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
                          const data = await mangaProvider.getChapterPages(chapter.id);
                          if (data?.pages) {
                            const title = mangaProvider.getLocalizedTitle(manga);
                            const cover = mangaProvider.getCoverUrl(manga);
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
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                        hapticsService.lightImpact();
                        setTimeout(() => {
                          if (chapter.attributes.externalUrl) {
                            window.open(chapter.attributes.externalUrl, '_blank');
                          } else {
                            router.push(`/reader/${chapter.id}`);
                          }
                        }, 150);
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
            
            {/* Advanced Pro Infinite Pagination */}
            {!loadingChapters && totalPages > 1 && (
              <>
                <div className="total-info-badge animate-fade-in" style={{ margin: '15px auto', display: 'flex', justifyContent: 'center' }}>
                  {totalChapters} Capítulos encontrados
                </div>
                <IonInfiniteScroll disabled={currentPage >= totalPages} onIonInfinite={loadMoreChapters} threshold="200px">
                  <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más capítulos..." />
                </IonInfiniteScroll>
              </>
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
                    <button 
                      key={rec.aniId} 
                      className="recommendation-card-v2"
                      onClick={() => router.push(`/manga/${rec.mdId}`)}
                      aria-label={`Ver manga recomendado: ${rec.title}`}
                    >
                      <div className="recommendation-cover-wrapper">
                         <SmartImage 
                           src={mangaProvider.getOptimizedUrl(rec.coverImage)} 
                           alt="" 
                           width={100}
                           height={150}
                         />
                        <div className="recommendation-score">
                          <IonIcon icon={star} />
                          {rec.score ? (rec.score / 10).toFixed(1) : '?.?'}
                        </div>
                      </div>
                      <p className="recommendation-title">{rec.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Universal Engagement & Comments */}
          {id && <UniversalEngagementBar contentId={id} title={title as string || 'Manga'} type="manga" coverUrl={coverUrl} />}
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
         aria-label="Opciones de compartir"
       >
        <div className="share-sheet-content">
          <div className="share-sheet-header">
            <h3>Compartir en...</h3>
            <p>Elige dónde quieres recomendar este manga</p>
          </div>
          
          <div className="share-grid">
            <button className="share-item chat-global" onClick={handleChatShare} aria-label="Compartir en Chat Global">
              <div className="share-icon-wrapper">
                <IonIcon icon={chatbubblesOutline} />
              </div>
              <span>Chat Global</span>
            </button>

            <button className="share-item whatsapp" onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(`Mira este manga en Lector Haus: ${title} ${window.location.href}`)}`, '_blank');
              setShowShareSheet(false);
            }} aria-label="Compartir en WhatsApp">
              <div className="share-icon-wrapper">
                <IonIcon icon={logoWhatsapp} />
              </div>
              <span>WhatsApp</span>
            </button>

            <button className="share-item telegram" onClick={() => {
              window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Mira este manga en Lector Haus: ${title}`)}`, '_blank');
              setShowShareSheet(false);
            }} aria-label="Compartir en Telegram">
              <div className="share-icon-wrapper">
                <IonIcon icon={paperPlane} />
              </div>
              <span>Telegram</span>
            </button>

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
