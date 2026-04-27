import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
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
  useIonRouter
} from '@ionic/react';
import { logOutOutline, timeOutline, trophyOutline, colorPaletteOutline, shieldCheckmarkOutline, diamondOutline, eyeOutline, playOutline, peopleOutline, copyOutline, pencilOutline, chatbubbles, chevronBackOutline, languageOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Language, getTranslation } from '../../utils/translations';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { User, updateProfile } from 'firebase/auth';
import { useLibraryStore } from '../../store/useLibraryStore';
import { userStatsService, UserStats } from '../../services/userStatsService';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import ArtPickerModal from '../../components/ArtPickerModal';
import UserAvatar from '../../components/UserAvatar';
import DonationsModal from './subcomponents/DonationsModal';
import { useLanguageStore } from '../../store/useLanguageStore';
import './styles.css';
import './styles-mobile.css';
import './styles-desktop.css';

const ProfilePage: React.FC = () => {
  const [showDonations, setShowDonations] = useState(false);
  const { lang, setLang } = useLanguageStore();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'ajustes'>('resumen');
  const [showEditAlert, setShowEditAlert] = useState(false);
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const history = useHistory();
  const [showPINAlert, setShowPINAlert] = useState(false);
  const [pinAction, setPinAction] = useState<'set' | 'verify'>('verify');
  const [pendingNSFWValue, setPendingNSFWValue] = useState<boolean>(false);

  // Suscripción a Auth y Stats (Combinada para limpieza)
  useEffect(() => {
    let unsubscribeStats: (() => void) | undefined;
    
    const unsubscribeAuth = firebaseAuthService.subscribe((u) => {
      if (unsubscribeStats) unsubscribeStats();
      
      if (!u) {
        setUser(null);
        setIsStatsLoading(false);
      } else {
        setUser(u);
        unsubscribeStats = userStatsService.subscribe(u.uid, (newStats) => {
          setStats(newStats);
          setIsStatsLoading(false);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeStats) unsubscribeStats();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const fetchBackground = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists() && snap.data().profileBackground) {
          setProfileBackground(snap.data().profileBackground);
        }
      } catch (err) {
        console.error("[Profile] Error fetching background:", err);
      }
    };
    
    fetchBackground();
  }, [user?.uid]);

  const { showNSFW, setShowNSFW, nsfwPIN, setNsfwPIN } = useLibraryStore();
  
  const handleLogout = async () => {
    await firebaseAuthService.logout();
    history.replace('/home');
  };

  const { level, nextLevelXP } = userStatsService.calculateLevel(stats.xp);
  const rank = userStatsService.getRankName(level);
  
  let accumulatedXPToReachLevel = 0;
  for (let i = 1; i < level; i++) {
    accumulatedXPToReachLevel += userStatsService.getXPForLevel(i);
  }
  const currentXPProgress = stats.xp - accumulatedXPToReachLevel;
  const xpNeededForThisLevel = userStatsService.getXPForLevel(level);

  const handleUpdateProfile = async (data: { name: string; avatar: string }) => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: data.name, photoURL: data.avatar });
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { name: data.name, displayName: data.name, avatar: data.avatar, avatarUrl: data.avatar });
      presentToast({ message: 'Perfil actualizado con éxito ✨', duration: 2000, color: 'success' });
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
        await updateProfile(user, { photoURL: url });
        updates.avatar = url;
        updates.avatarUrl = url;
        setUser({ ...user, photoURL: url } as User);
      }
      await updateDoc(userRef, updates);
      presentToast({ message: '¡Cambios aplicados! ✨', duration: 2000, color: 'success' });
    } catch (error) {
      console.error("Error applying art choice:", error);
    }
  };

  const handleGhostLogin = async () => {
    setIsLoggingIn(true);
    try {
      await firebaseAuthService.loginAnonymously();
      presentToast({ message: '¡Entraste como Nakama Fantasma! 👻', duration: 2000, color: 'secondary' });
    } catch (error) {
      console.error("Ghost login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <IonPage className="profile-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="profile-toolbar">
          <IonButtons slot="start">
            <IonButton onClick={() => history.replace('/home')} className="reader-back-btn" style={{ '--color': 'white' }}>
              <IonIcon icon={chevronBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle style={{ fontWeight: 900, letterSpacing: '-0.5px' }}>
            {!user ? 'Haus Reader' : 'Perfil Pro'}
          </IonTitle>
          {user && (
            <IonButtons slot="end">
              <IonButton onClick={() => handleLogout()} className="logout-btn-header">
                <IonIcon icon={logOutOutline} slot="start" />
                SALIR
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="profile-content">
        {!user ? (
          <div className="welcome-container animate-fade-in">
            <div className="welcome-mascot-container">
              <img src="/Buho.webp" alt="Mascot" className="welcome-mascot" onError={(e) => (e.currentTarget.src = '/logolh.webp')} />
            </div>
            <h1 className="welcome-title">¡El Portal está Abierto!</h1>
            <p className="welcome-subtitle">Sincroniza tus lecturas, sube de nivel tu Rango Hunter y forja tu propio camino como Nakama.</p>
            <div className="auth-actions">
              <div className="ghost-btn-container">
                <div className="nakama-tip">✨ RECOMENDADO</div>
                <div className="pulse-ring"></div>
                <IonButton expand="block" className="ghost-login-btn" onClick={handleGhostLogin} disabled={isLoggingIn}>
                  <IonIcon icon={playOutline} slot="start" />
                  ENTRAR COMO FANTASMA
                </IonButton>
              </div>
              <IonButton expand="block" fill="clear" className="google-login-btn" onClick={handleGoogleLogin} disabled={isLoggingIn}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', marginRight: '10px' }} />
                Continuar con Google
              </IonButton>
            </div>
          </div>
        ) : (
          <>
            <div className="haus-decoration blob-1"></div>
            <div className="haus-decoration blob-2"></div>
            <div className="profile-cover-banner" style={profileBackground ? { backgroundImage: `url(${profileBackground})` } : {}}>
              <div className="cover-gradient"></div>
              <IonButton fill="clear" size="small" className="random-bg-btn" onClick={() => setShowArtPicker(true)}>
                <IonIcon icon={colorPaletteOutline} slot="start" />
                Personalizar
              </IonButton>
            </div>

            <div className="profile-responsive-layout">
              <div className="profile-sidebar">
                <div className="avatar-container animate-fade-in">
                  <UserAvatar user={user} size={110} className="main-avatar" />
                  <button className="avatar-edit-overlay" onClick={() => setShowArtPicker(true)}><IonIcon icon={pencilOutline} /></button>
                  <div className="status-indicator"></div>
                </div>
                <div className="identity-block animate-slide-up">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <h2 className="user-name">{user?.displayName || (user?.isAnonymous ? 'Lector Fantasma' : 'Lector Haus')}</h2>
                    <IonButton fill="clear" size="small" onClick={() => setShowEditAlert(true)} className="edit-profile-btn">
                      <IonIcon icon={pencilOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                  <p className="user-email">{user?.isAnonymous ? 'Modo Anónimo Activo' : user?.email}</p>
                </div>
                <button className="user-uid-tag animate-fade-in" onClick={() => { if (user?.uid) { navigator.clipboard.writeText(user.uid); presentToast({ message: 'ID copiado 📋', duration: 2000, color: 'primary' }); } }}>
                  <span>ID: {user?.uid ? `${user.uid.substring(0, 8)}...${user.uid.substring(user.uid.length - 4)}` : 'Desconocido'}</span>
                  <IonIcon icon={copyOutline} />
                </button>
                <div className="badge-belt">
                   <IonBadge color="primary" className="profile-badge">{rank}</IonBadge>
                   {user && !user.isAnonymous && <IonBadge color="secondary" className="profile-badge">Pro Hunter</IonBadge>}
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
              </div>

              <div className="profile-main-content">
                <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as any)} className="profile-segment" scrollable={true}>
                  <IonSegmentButton value="resumen"><IonLabel>Resumen</IonLabel></IonSegmentButton>
                  <IonSegmentButton value="historial"><IonLabel>Historial</IonLabel></IonSegmentButton>
                  <IonSegmentButton value="ajustes"><IonLabel>Ajustes</IonLabel></IonSegmentButton>
                </IonSegment>

                <div className="tab-render-area">
                  {activeTab === 'resumen' && (
                    <div className="animate-fade-in">
                      <div className="resumen-grid-pc">
                        <IonCard className="stats-card glass-card">
                          <IonCardContent>
                            <div className="stats-grid">
                              <div className="stat-item"><span className="stat-value">Lv. {level}</span><span className="stat-label">Nivel</span></div>
                              <div className="stat-item"><span className="stat-value">{stats.chaptersRead}</span><span className="stat-label">Capítulos</span></div>
                              <div className="stat-item"><span className="stat-value">{stats.commentsPosted}</span><span className="stat-label">Aportes</span></div>
                            </div>
                          </IonCardContent>
                        </IonCard>
                        <div className="activity-heatmap glass-card">
                          <p className="heatmap-placeholder-text">Actividad Hunter</p>
                          <div className="heatmap-grid faux-heatmap">
                            {Array.from({ length: 28 }).map((_, i) => (<div key={i} className="heatmap-cell" style={{ opacity: Math.random() * 0.8 + 0.1 }}></div>))}
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
                            .slice(0, 10)
                            .map(([mangaId, p]) => (
                              <div key={mangaId} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', margin: 0 }} onClick={() => router.push(`/manga/${mangaId}`)}>
                                <h4 style={{ margin: 0, fontWeight: 700, flex: 1 }}>{p.mangaTitle || 'Manga'}</h4>
                                <IonButton fill="clear" onClick={(e) => { e.stopPropagation(); router.push(`/reader/${p.chapterId}`); }}>
                                  <IonIcon icon={playOutline} slot="icon-only" />
                                </IonButton>
                              </div>
                            ))}
                        </div>
                      ) : (<div className="empty-state"><p>Sin historial</p></div>)}
                    </div>
                  )}

                  {activeTab === 'ajustes' && (
                    <div className="animate-fade-in">
                      <IonList className="glass-list">
                        <IonItem button className="option-item" onClick={() => setShowDonations(true)}>
                          <IonIcon icon={diamondOutline} slot="start" color="warning" />
                          <IonLabel><h2>Donaciones</h2><p>Apoya el proyecto</p></IonLabel>
                        </IonItem>
                        <IonItem className="option-item">
                          <IonIcon icon={languageOutline} slot="start" color="secondary" />
                          <IonLabel><h2>Idioma</h2></IonLabel>
                          <select value={lang} onChange={(e) => setLang(e.target.value as Language)} style={{ background: 'transparent', color: '#fff', border: 'none' }}>
                            <option value="es">Español</option>
                            <option value="en">English</option>
                          </select>
                        </IonItem>
                        <IonItem className="option-item">
                          <IonIcon icon={eyeOutline} slot="start" color="danger" />
                          <IonLabel><h2>Contenido +18</h2></IonLabel>
                          <IonToggle slot="end" checked={showNSFW} onIonChange={e => {
                            const val = e.detail.checked;
                            setPendingNSFWValue(val);
                            setPinAction(nsfwPIN ? 'verify' : 'set');
                            setShowPINAlert(true);
                          }} />
                        </IonItem>
                      </IonList>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        <IonAlert
          isOpen={showEditAlert}
          onDidDismiss={() => setShowEditAlert(false)}
          header="Editar Perfil"
          inputs={[
            { name: 'name', type: 'text', placeholder: 'Nombre', value: user?.displayName || '' },
            { name: 'avatar', type: 'url', placeholder: 'Avatar URL', value: user?.photoURL || '' }
          ]}
          buttons={[{ text: 'Cancelar', role: 'cancel' }, { text: 'Guardar', handler: handleUpdateProfile }]}
        />
        
        <IonAlert
          isOpen={showPINAlert}
          onDidDismiss={() => setShowPINAlert(false)}
          header={pinAction === 'set' ? 'Crear PIN' : 'Verificar PIN'}
          inputs={[{ name: 'pin', type: 'password', placeholder: '4 dígitos', attributes: { maxlength: 4, inputmode: 'numeric' } }]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Confirmar', handler: (data) => {
              if (pinAction === 'set') {
                setNsfwPIN(data.pin);
                setShowNSFW(pendingNSFWValue);
              } else {
                if (data.pin === nsfwPIN) setShowNSFW(pendingNSFWValue);
                else return false;
              }
            }}
          ]}
        />
        <ArtPickerModal isOpen={showArtPicker} onClose={() => setShowArtPicker(false)} onSelect={handleApplyArtChoice} />
        <DonationsModal isOpen={showDonations} onClose={() => setShowDonations(false)} />
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
