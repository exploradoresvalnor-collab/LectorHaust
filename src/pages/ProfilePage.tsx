import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonAvatar,
  IonItem,
  IonLabel,
  IonList,
  IonText,
  IonCard,
  IonCardContent,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonListHeader,
  IonToggle,
  IonSkeletonText,
  useIonToast,
  IonAlert,
  IonActionSheet,
  IonModal,
  IonRippleEffect
} from '@ionic/react';
import { 
  personCircleOutline,
  logOutOutline, 
  starOutline, 
  timeOutline, 
  trophyOutline, 
  colorPaletteOutline,
  shieldCheckmarkOutline,
  diamondOutline,
  eyeOutline,
  alertCircleOutline,
  playOutline,
  peopleOutline,
  copyOutline,
  pencilOutline,
  chatbubbles,
  chevronBackOutline,
  languageOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useIonRouter } from '@ionic/react';
import { Language, getTranslation, getDefaultLanguage } from '../utils/translations';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { User, updateProfile } from 'firebase/auth';
import { useLibraryStore } from '../store/useLibraryStore';
import { userStatsService, UserStats } from '../services/userStatsService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { artService } from '../services/artService';
import { getDoc } from 'firebase/firestore';
import ArtPickerModal from '../components/ArtPickerModal';
import { useLanguageStore } from '../store/useLanguageStore';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  // --- ESTADOS PARA DONACIONES ---
  const [showDonations, setShowDonations] = useState(false);

  const copyWallet = (wallet: string, network: string) => {
    navigator.clipboard.writeText(wallet);
    presentToast({ message: `Dirección ${network} copiada 📋`, duration: 2000, color: 'success' });
  };

  const { lang, setLang } = useLanguageStore();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'ajustes'>('resumen');
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [showLogoutGhostAlert, setShowLogoutGhostAlert] = useState(false);
  const [presentToast] = useIonToast();
  const router = useIonRouter();
  const { history: readingHistory, favorites } = useLibraryStore();
  const [stats, setStats] = useState<UserStats>({
    xp: 0,
    level: 1,
    chaptersRead: 0,
    commentsPosted: 0,
    achievements: [],
    lastUpdated: Date.now()
  });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [profileBackground, setProfileBackground] = useState<string>('');
  const [showArtPicker, setShowArtPicker] = useState(false);
  const [pendingArtUrl, setPendingArtUrl] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const history = useHistory();

  useEffect(() => {
     const timer = setTimeout(() => setIsStatsLoading(false), 500);
     return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let unsubscribeStats: (() => void) | undefined;

    const unsubscribeAuth = firebaseAuthService.subscribe((user) => {
      // Cleanup previous stats listener if exists
      if (unsubscribeStats) unsubscribeStats();

      if (!user) {
        setUser(null);
      } else {
        setUser(user);
        // Subscribe to stats
        unsubscribeStats = userStatsService.subscribe(user.uid, (newStats) => {
          setStats(newStats);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeStats) unsubscribeStats();
    };
  }, [history]);

  // Load profile background from Firestore
  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then(snap => {
        if (snap.exists() && snap.data().profileBackground) {
          setProfileBackground(snap.data().profileBackground);
        }
      });
    }
  }, [user]);

  const { readChapters, showNSFW, setShowNSFW } = useLibraryStore();
  
  const handleLogout = async (force: boolean = false) => {
    if (user?.isAnonymous && !force) {
      setShowLogoutGhostAlert(true);
      return;
    }
    await firebaseAuthService.logout();
    history.replace('/home');
  };

  const { level, nextLevelXP, progress } = userStatsService.calculateLevel(stats.xp);
  const rank = userStatsService.getRankName(level);
  const xpInCurrentLevel = stats.xp - (userStatsService.getXPForLevel(level - 1) === 100 ? 0 : 0); // Need to adjust this math if logic is complex
  // Simplified for UI:
  const displayXP = stats.xp; 
  const displayNextXP = nextLevelXP; // This is actually XP needed FOR the level, not total accumulated
  
  // Re-calculating correctly for the bar
  let accumulatedXPToReachLevel = 0;
  for (let i = 1; i < level; i++) {
    accumulatedXPToReachLevel += userStatsService.getXPForLevel(i);
  }
  const currentXPProgress = stats.xp - accumulatedXPToReachLevel;
  const xpNeededForThisLevel = userStatsService.getXPForLevel(level);

  const handleUpdateProfile = async (data: { name: string; avatar: string }) => {
    if (!user) return;
    
    try {
      // 1. Update Firebase Auth
      await updateProfile(user, {
        displayName: data.name,
        photoURL: data.avatar
      });

      // 2. Update Firestore for social consistency
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: data.name,
        displayName: data.name,
        avatar: data.avatar,
        avatarUrl: data.avatar
      });

      presentToast({ message: 'Perfil actualizado con éxito ✨', duration: 2000, color: 'success' });
      // Minor hack to force UI refresh
      setUser({ ...user, displayName: data.name, photoURL: data.avatar } as User);
    } catch (error) {
      console.error("Error updating profile:", error);
      presentToast({ message: 'Error al actualizar perfil', duration: 2000, color: 'danger' });
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await firebaseAuthService.loginWithGoogle();
      presentToast({ message: '¡Sesión iniciada con éxito! 🚀', duration: 2000, color: 'success' });
    } catch (error) {
      console.error("Login failed:", error);
      presentToast({ message: 'Error al iniciar sesión', duration: 2000, color: 'danger' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleApplyArtChoice = async (url: string, choice: 'banner' | 'avatar' | 'both') => {
    if (!user || !url) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const updates: any = {};
      
      if (choice === 'banner' || choice === 'both') {
        setProfileBackground(url);
        updates.profileBackground = url;
      }
      
      if (choice === 'avatar' || choice === 'both') {
        // 1. Update Firebase Auth
        await updateProfile(user, { photoURL: url });
        // 2. Prepare Firestore Update
        updates.avatar = url;
        updates.avatarUrl = url;
        // 3. Update local state
        setUser({ ...user, photoURL: url } as User);
      }
      
      await updateDoc(userRef, updates);
      presentToast({ 
        message: choice === 'both' ? '¡Perfil actualizado con éxito! ✨' : (choice === 'banner' ? '¡Banner actualizado! 🎨' : '¡Avatar actualizado! 👤'), 
        duration: 2000, 
        color: 'success' 
      });
    } catch (error) {
      console.error("Error applying art choice:", error);
      presentToast({ message: 'Error al aplicar cambios', duration: 2000, color: 'danger' });
    }
  };

  const handleArtSelected = (url: string, choice: 'banner' | 'avatar' | 'both') => {
    setPendingArtUrl(url); // Still useful for other UI if needed
    handleApplyArtChoice(url, choice);
  };

  const handleGhostLogin = async () => {
    setIsLoggingIn(true);
    try {
      await firebaseAuthService.loginAnonymously();
      presentToast({ message: '¡Entraste como Nakama Fantasma! 👻', duration: 2000, color: 'secondary' });
    } catch (error) {
      console.error("Ghost login failed:", error);
      presentToast({ message: 'Error al entrar en modo fantasma', duration: 2000, color: 'danger' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const renderWelcomeScreen = () => {
    return (
      <IonPage className="profile-page">
        <IonHeader className="ion-no-border">
          <IonToolbar className="profile-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/home" />
            </IonButtons>
            <IonTitle>¡Bienvenido!</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="profile-content">
          <div className="welcome-container animate-fade-in">
            <div className="welcome-mascot-container">
              <img 
                src="/Buho.webp" 
                alt="Mascot" 
                className="welcome-mascot"
                onError={(e) => (e.currentTarget.src = '/logolh.webp')} 
              />
            </div>
            
            <h1 className="welcome-title">¡El Portal está Abierto!</h1>
            <p className="welcome-subtitle">
              Sincroniza tus lecturas, sube de nivel tu Rango Hunter y forja tu propio camino como Nakama.
            </p>

            <div className="auth-actions">
              <div className="ghost-btn-container">
                <div className="nakama-tip">✨ RECOMENDADO</div>
                <div className="pulse-ring"></div>
                <IonButton 
                  expand="block" 
                  className="ghost-login-btn" 
                  onClick={handleGhostLogin}
                  disabled={isLoggingIn}
                >
                  <IonIcon icon={playOutline} slot="start" />
                  ENTRAR COMO FANTASMA
                </IonButton>
              </div>

              <IonButton 
                expand="block" 
                fill="clear" 
                className="google-login-btn" 
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  style={{ width: '18px', marginRight: '10px' }} 
                />
                Continuar con Google
              </IonButton>
            </div>

            <div className="perks-grid">
              <div className="perk-item">
                <IonIcon icon={chatbubbles} className="perk-icon" />
                <span>Chat Global</span>
              </div>
              <div className="perk-item">
                <IonIcon icon={trophyOutline} className="perk-icon" />
                <span>Niveles & XP</span>
              </div>
              <div className="perk-item">
                <IonIcon icon={peopleOutline} className="perk-icon" />
                <span>Social</span>
              </div>
            </div>

            <IonButton 
              fill="clear" 
              size="small" 
              className="welcome-back-btn" 
              onClick={() => history.push('/home')}
              style={{ marginTop: '20px', '--color': 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}
            >
              <IonIcon icon={chevronBackOutline} slot="start" />
              VOLVER AL INICIO
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  };

  if (!user) return renderWelcomeScreen();

  return (
    <IonPage className="profile-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="profile-toolbar">
          <IonButtons slot="start">
            <IonButton onClick={() => history.replace('/home')} className="reader-back-btn" style={{ '--color': 'white' }}>
              <IonIcon icon={chevronBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle style={{ fontWeight: 900, letterSpacing: '-0.5px' }}>Perfil Pro</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => handleLogout()} className="logout-btn-header">
              <IonIcon icon={logOutOutline} slot="start" />
              SALIR
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="profile-content">
        {/* Elite Decorations */}
        <div className="haus-decoration blob-1"></div>
        <div className="haus-decoration blob-2"></div>

        {/* Header Cover Banner */}
        <div 
          className="profile-cover-banner" 
          style={profileBackground ? { backgroundImage: `url(${profileBackground})` } : {}}
        >
          <div className="cover-gradient"></div>
          <IonButton 
            fill="clear" 
            size="small" 
            className="random-bg-btn animate-fade-in" 
            onClick={() => setShowArtPicker(true)}
          >
            <IonIcon icon={colorPaletteOutline} slot="start" />
            Personalizar Perfil
          </IonButton>
        </div>

        <div className="profile-responsive-layout">
          {/* LEFT SIDEBAR (Sticky on PC) */}
          <div className="profile-sidebar">
            <div className="avatar-container animate-fade-in">
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="main-avatar" />
              ) : (
                <IonIcon icon={personCircleOutline} className="user-icon-golden main-avatar-icon" />
              )}
              <div className="avatar-edit-overlay" onClick={() => setShowArtPicker(true)}>
                <IonIcon icon={pencilOutline} />
              </div>
              <div className="status-indicator"></div>
            </div>
            
            <div className="identity-block animate-slide-up">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <h2 className="user-name">{user!.displayName || (user!.isAnonymous ? 'Lector Fantasma' : 'Lector Haus')}</h2>
                <IonButton fill="clear" size="small" onClick={() => setShowEditAlert(true)} className="edit-profile-btn">
                  <IonIcon icon={pencilOutline} slot="icon-only" />
                </IonButton>
              </div>
              <p className="user-email">{user!.isAnonymous ? 'Modo Anónimo Activo' : user!.email}</p>
            </div>
            
            <div 
              className="user-uid-tag animate-fade-in" 
              onClick={() => {
                navigator.clipboard.writeText(user!.uid);
                presentToast({ message: 'ID copiado al portapapeles 📋', duration: 2000, color: 'primary' });
              }}
            >
              <span>ID: {user!.uid.substring(0, 8)}...{user!.uid.substring(user!.uid.length - 4)}</span>
              <IonIcon icon={copyOutline} />
            </div>
            
            <div className="badge-belt">
               <IonBadge color="primary" className="profile-badge">{rank}</IonBadge>
               {!user!.isAnonymous && <IonBadge color="secondary" className="profile-badge">Pro Hunter</IonBadge>}
               {user!.isAnonymous && <IonBadge color="medium" className="profile-badge">Fantasma</IonBadge>}
            </div>

            <div className="xp-container animate-slide-up">
              <div className="xp-info">
                <span>Nivel {level}</span>
                <span>{Math.floor(currentXPProgress)} / {xpNeededForThisLevel} XP</span>
              </div>
              <div className="xp-progress-bg">
                <div className="xp-progress-bar" style={{ width: `${Math.min(100, (currentXPProgress / xpNeededForThisLevel) * 100)}%` }}></div>
              </div>
            </div>

            <IonButton 
              expand="block" 
              className="social-nav-btn animate-fade-in" 
              onClick={() => router.push('/social')}
            >
              <IonIcon icon={peopleOutline} slot="start" />
              Círculo Social
            </IonButton>
          </div>

          {/* RIGHT MAIN CONTENT (Tabs & Scrollable on PC) */}
          <div className="profile-main-content">
            <IonSegment 
              value={activeTab} 
              onIonChange={e => setActiveTab(e.detail.value as any)}
              className="profile-segment"
              scrollable={true}
            >
              <IonSegmentButton value="resumen">
                <IonLabel>Resumen</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="historial">
                <IonLabel>Historial</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="ajustes">
                <IonLabel>Ajustes</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            <div className="tab-render-area">
              {/* TAB 1: RESUMEN */}
              {activeTab === 'resumen' && (
                <div className="animate-fade-in">
                  <div className="resumen-grid-pc">
                    <div className="resumen-left-col">
                      <IonCard className="stats-card glass-card">
                        <IonCardContent>
                          <div className="stats-grid">
                            <div className="stat-item">
                              {isStatsLoading ? <IonSkeletonText animated style={{ width: '60px', height: '28px', marginBottom: '8px' }} /> : <span className="stat-value">Lv. {level}</span>}
                              <span className="stat-label">Nivel Actual</span>
                            </div>
                            <div className="stat-item">
                              {isStatsLoading ? <IonSkeletonText animated style={{ width: '40px', height: '28px', marginBottom: '8px' }} /> : <span className="stat-value">{stats.chaptersRead}</span>}
                              <span className="stat-label">Capítulos Leídos</span>
                            </div>
                            <div className="stat-item">
                              {isStatsLoading ? <IonSkeletonText animated style={{ width: '40px', height: '28px', marginBottom: '8px' }} /> : <span className="stat-value">{stats.commentsPosted}</span>}
                              <span className="stat-label">Aportes Sociales</span>
                            </div>
                          </div>
                        </IonCardContent>
                      </IonCard>

                      <div className="promo-banner animate-fade-in" style={{ animationDelay: '0.3s', marginTop: '20px' }}>
                        <div className="promo-icon-wrapper">
                          <IonIcon icon={trophyOutline} className="promo-icon" />
                        </div>
                        <div className="promo-text">
                          <h4 className="haus-text-gradient">¡Rango {userStatsService.getRankName(level + 1)}!</h4>
                          <p>Te faltan <span style={{ color: '#fff', fontWeight: 800 }}>{Math.ceil(xpNeededForThisLevel - currentXPProgress)} XP</span> para el siguiente nivel.</p>
                        </div>
                      </div>
                    </div>

                    <div className="resumen-right-col">
                      <h3 className="section-title" style={{ marginTop: '0' }}>Actividad Reciente</h3>
                      <div className="activity-heatmap glass-card">
                        <p className="heatmap-placeholder-text">Gráfico térmico disponible para Elite Hunters.</p>
                        <div className="heatmap-grid faux-heatmap">
                          {Array.from({ length: 42 }).map((_, i) => (
                            <div key={i} className="heatmap-cell" style={{ opacity: Math.random() * 0.8 + 0.1 }}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'historial' && (
                <div className="animate-fade-in">
                  {Object.keys(readingHistory).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {Object.entries(readingHistory)
                        .sort(([, a], [, b]) => b.lastRead - a.lastRead)
                        .slice(0, 15)
                        .map(([mangaId, progress]) => {
                          const fav = favorites.find(f => f.id === mangaId);
                          const title = progress.mangaTitle || fav?.title || 'Manga';
                          const cover = progress.mangaCover || fav?.cover;
                          return (
                            <div key={mangaId} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', cursor: 'pointer', margin: 0 }} onClick={() => router.push(`/manga/${mangaId}`)}>
                              {cover ? (
                                <img src={cover} alt={title} style={{ width: '48px', height: '68px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: '48px', height: '68px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📖</div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h4>
                                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Capítulo {progress.chapterNumber || '?'} · Pág. {progress.pageIndex}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{new Date(progress.lastRead).toLocaleDateString()}</p>
                              </div>
                              <IonButton fill="clear" size="small" color="primary" onClick={(e) => { e.stopPropagation(); router.push(`/reader/${progress.chapterId}`); }}>
                                <IonIcon icon={playOutline} slot="icon-only" />
                              </IonButton>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <IonIcon icon={timeOutline} color="medium" style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }} />
                      <h3>Sin historial de lectura</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Empieza a leer un manga y tu progreso aparecerá aquí.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AJUSTES */}
              {activeTab === 'ajustes' && (
                <div className="animate-fade-in">
                  <h3 className="section-title" style={{ marginTop: '0' }}>Ajustes LectorHaus Pro</h3>
                  <IonList className="options-list glass-list">
                    <IonItem button detail={true} className="option-item" onClick={() => setShowDonations(true)}>
                      <IonIcon icon={diamondOutline} slot="start" color="warning" />
                      <IonLabel>
                        <h2>Mecenas / Donaciones</h2>
                        <p>Desbloquea temas y medallas exclusivas</p>
                      </IonLabel>
                    </IonItem>
                    
                    <IonItem button detail={true} className="option-item" onClick={() => presentToast({ message: getTranslation('profile.themesSoon', lang), duration: 2000, color: 'primary' })}>
                      <IonIcon icon={colorPaletteOutline} slot="start" color="primary" />
                      <IonLabel>
                        <h2>{getTranslation('profile.themesTitle', lang)}</h2>
                        <p>{getTranslation('profile.themesDesc', lang)}</p>
                      </IonLabel>
                    </IonItem>

                    <IonItem className="option-item">
                      <IonIcon icon={languageOutline} slot="start" color="secondary" />
                      <IonLabel>
                        <h2>{getTranslation('profile.languageBtn', lang)}</h2>
                        <p>{getTranslation('profile.languageDesc', lang)}</p>
                      </IonLabel>
                      <select 
                        value={lang} 
                        onChange={(e) => {
                          const val = e.target.value as Language;
                          setLang(val);
                        }}
                        style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '0.9rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="es" style={{ background: '#121212' }}>Español</option>
                        <option value="en" style={{ background: '#121212' }}>English</option>
                        <option value="pt-br" style={{ background: '#121212' }}>Português</option>
                      </select>
                    </IonItem>

                    <IonItem button detail={true} className="option-item" onClick={() => presentToast({ message: getTranslation('profile.securityPrompt', lang), duration: 2000, color: 'success' })}>
                      <IonIcon icon={shieldCheckmarkOutline} slot="start" color="success" />
                      <IonLabel>
                        <h2>{getTranslation('profile.securityTitle', lang)}</h2>
                        <p>{getTranslation('profile.securityDesc', lang)}</p>
                      </IonLabel>
                    </IonItem>

                    <IonListHeader style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.7rem', fontWeight: 900 }}>Contenido & Privacidad</IonListHeader>
                    
                    <IonItem className="option-item">
                      <IonIcon icon={eyeOutline} slot="start" color="danger" />
                      <IonLabel>
                        <h2>Mostrar contenido +18</h2>
                        <p>Permitir obras con rating adulto</p>
                      </IonLabel>
                      <IonToggle 
                        slot="end" 
                        checked={showNSFW} 
                        onIonChange={e => {
                          const val = e.detail.checked;
                          setShowNSFW(val);
                          presentToast({ 
                            message: val ? 'Contenido adulto habilitado 🔞' : 'Contenido adulto oculto 🛡️', 
                            duration: 1500,
                            color: val ? 'danger' : 'success'
                          });
                        }} 
                      />
                    </IonItem>
                    <IonItem 
                      className="option-item logout-premium-item" 
                      button 
                      onClick={() => handleLogout()} 
                      style={{ marginTop: '40px', '--background': 'rgba(235, 68, 90, 0.05)', borderColor: 'rgba(235, 68, 90, 0.3)' }}
                    >
                      <IonIcon icon={logOutOutline} slot="start" color="danger" />
                      <IonLabel color="danger">
                        <h2 style={{ color: 'var(--ion-color-danger)', fontWeight: '900' }}>Cerrar Sesión</h2>
                        <p style={{ color: 'rgba(235, 68, 90, 0.7)' }}>Finalizar tu sesión de cazador</p>
                      </IonLabel>
                    </IonItem>
                  </IonList>
                </div>
              )}
            </div>
          </div>
        </div>

        <IonAlert
          isOpen={showEditAlert}
          onDidDismiss={() => setShowEditAlert(false)}
          header="Editar Perfil"
          message="Personaliza tu nombre y avatar para que tus Nakamas te reconozcan."
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Nombre / Alias',
              value: user!.displayName || ''
            },
            {
              name: 'avatar',
              type: 'url',
              placeholder: 'URL de Avatar (JPG/PNG)',
              value: user!.photoURL || ''
            }
          ]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { 
              text: 'Guardar', 
              handler: (data) => {
                handleUpdateProfile(data);
              } 
            }
          ]}
        />
        <ArtPickerModal 
          isOpen={showArtPicker} 
          onClose={() => setShowArtPicker(false)}
          onSelect={handleArtSelected}
        />
        <IonAlert
          isOpen={showLogoutGhostAlert}
          onDidDismiss={() => setShowLogoutGhostAlert(false)}
          header="¿Cerrar Sesión?"
          subHeader="Estás en modo Nakama Fantasma"
          message="Si cierras sesión, perderás este ID de usuario y tu progreso actual. ¿Qué prefieres hacer?"
          buttons={[
            {
              text: 'Ir a Inicio (Mantener ID)',
              cssClass: 'alert-button-confirm',
              handler: () => {
                history.push('/home');
              }
            },
            {
              text: 'Cerrar y borrar ID',
              role: 'destructive',
              cssClass: 'alert-button-destructive',
              handler: () => {
                handleLogout(true);
              }
            },
            {
              text: 'Cancelar',
              role: 'cancel'
            }
          ]}
        />
        {/* --- MODAL DE DONACIONES (Premium Bottom Sheet) --- */}
        <IonModal 
          isOpen={showDonations} 
          onDidDismiss={() => setShowDonations(false)}
          initialBreakpoint={0.70}
          breakpoints={[0, 0.70, 0.9]}
          className="login-bottom-sheet"
          handleBehavior="cycle"
        >
          <div className="glass-modal-content" style={{ padding: '25px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ display: 'inline-block', position: 'relative' }}>
                <IonIcon icon={diamondOutline} style={{ fontSize: '4rem', color: '#FFD700', filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.6))' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)', zIndex: -1, borderRadius: '50%' }}></div>
              </div>
              <h2 style={{ fontWeight: 900, fontSize: '1.5rem', margin: '15px 0 8px', color: '#fff', letterSpacing: '-0.5px' }}>Apoya a LectorHaus</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
                ¡Gracias por mantener el servidor vivo! ☕<br/>Toca cualquier red para copiar la dirección.
              </p>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
              
              {/* BINANCE SMART CHAIN (NUEVA) */}
              <IonCard className="glass-card ion-activatable ripple-parent" onClick={() => copyWallet('0x2740F48565b8371FDcbEB69c59ee6C184aE48467', 'Binance Smart Chain')} style={{ margin: 0, cursor: 'pointer', background: 'rgba(243, 186, 47, 0.08)', border: '1px solid rgba(243, 186, 47, 0.3)', position: 'relative', overflow: 'hidden' }}>
                <IonItem color="transparent" lines="none" style={{ '--padding-start': '15px', '--inner-padding-end': '15px', marginTop: '5px', marginBottom: '5px' }}>
                  <div slot="start" style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(243, 186, 47, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F3BA2F', fontWeight: 900, fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>BNB</div>
                  <IonLabel>
                    <h3 style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>Red Binance <IonBadge color="warning" style={{ fontSize: '0.6rem', padding: '3px 6px' }}>RECOMENDADA</IonBadge></h3>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Comisiones casi nulas (USDT/BNB)</p>
                    <p style={{ fontSize: '0.7rem', color: '#F3BA2F', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '0.5px', opacity: 0.9 }}>0x2740...48467</p>
                  </IonLabel>
                  <IonIcon icon={copyOutline} slot="end" style={{ color: '#F3BA2F', fontSize: '1.2rem' }} />
                </IonItem>
                <IonRippleEffect></IonRippleEffect>
              </IonCard>

              {/* SOLANA */}
              <IonCard className="glass-card ion-activatable ripple-parent" onClick={() => copyWallet('62NNwaoXdKhAn2wJwJn8iD7s4HX5tFmHTYLavUZUEBHR', 'Solana')} style={{ margin: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                <IonItem color="transparent" lines="none" style={{ '--padding-start': '15px', '--inner-padding-end': '15px', marginTop: '5px', marginBottom: '5px' }}>
                  <div slot="start" style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(20, 241, 149, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14F195', fontWeight: 900, fontSize: '0.85rem' }}>SOL</div>
                  <IonLabel>
                    <h3 style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', letterSpacing: '-0.3px' }}>Red Solana</h3>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Rápida para USDT, USDC o SOL</p>
                    <p style={{ fontSize: '0.7rem', color: '#14F195', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '0.5px', opacity: 0.8 }}>62NN...ZUEBHR</p>
                  </IonLabel>
                  <IonIcon icon={copyOutline} slot="end" style={{ color: 'var(--ion-color-medium)' }} />
                </IonItem>
                <IonRippleEffect></IonRippleEffect>
              </IonCard>

              {/* TRON */}
              <IonCard className="glass-card ion-activatable ripple-parent" onClick={() => copyWallet('TTwFVRAEBA4V77BjbHnxgFT9YLS6jis6AU', 'Tron TRC20')} style={{ margin: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
                <IonItem color="transparent" lines="none" style={{ '--padding-start': '15px', '--inner-padding-end': '15px', marginTop: '5px', marginBottom: '5px' }}>
                  <div slot="start" style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(255, 0, 19, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF0013', fontWeight: 900, fontSize: '0.85rem' }}>TRX</div>
                  <IonLabel>
                    <h3 style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', letterSpacing: '-0.3px' }}>Red Tron (TRC20)</h3>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>La más usada para USDT</p>
                    <p style={{ fontSize: '0.7rem', color: '#FF0013', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '0.5px', opacity: 0.8 }}>TTwF...is6AU</p>
                  </IonLabel>
                  <IonIcon icon={copyOutline} slot="end" style={{ color: 'var(--ion-color-medium)' }} />
                </IonItem>
                <IonRippleEffect></IonRippleEffect>
              </IonCard>

            </div>
            
            <IonButton expand="block" shape="round" className="glass-btn-outline" onClick={() => setShowDonations(false)} style={{ marginTop: 'auto', '--color': '#fff', '--background': 'rgba(255,255,255,0.1)', height: '50px', fontWeight: 800 }}>
              Cerrar
            </IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
