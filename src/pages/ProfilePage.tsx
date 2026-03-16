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
  IonSegmentButton
} from '@ionic/react';
import { 
  personCircleOutline,
  logOutOutline, 
  starOutline, 
  timeOutline, 
  trophyOutline, 
  colorPaletteOutline,
  shieldCheckmarkOutline,
  diamondOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { User } from 'firebase/auth';
import { useLibraryStore } from '../store/useLibraryStore';
import { userStatsService, UserStats } from '../services/userStatsService';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial' | 'ajustes'>('resumen');
  const [stats, setStats] = useState<UserStats>({
    xp: 0,
    level: 1,
    chaptersRead: 0,
    commentsPosted: 0,
    lastUpdated: Date.now()
  });
  const history = useHistory();

  useEffect(() => {
    let unsubscribeStats: (() => void) | undefined;

    const unsubscribeAuth = firebaseAuthService.subscribe((user) => {
      if (!user) {
        history.replace('/home');
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

  const readChapters = useLibraryStore(state => state.readChapters);
  
  const handleLogout = async () => {
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

  if (!user) return null;

  return (
    <IonPage className="profile-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="profile-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Mi Perfil Pro</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleLogout} color="danger">
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="profile-content">
        {/* Header Cover Banner */}
        <div className="profile-cover-banner">
          <div className="cover-gradient"></div>
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
              <div className="status-indicator"></div>
            </div>
            
            <h2 className="user-name">{user.displayName || (user.isAnonymous ? 'Lector Fantasma' : 'Lector Haus')}</h2>
            <p className="user-email">{user.isAnonymous ? 'Modo Anónimo Activo' : user.email}</p>
            
            <div className="badge-belt">
               <IonBadge color="primary" className="profile-badge">{rank}</IonBadge>
               {!user.isAnonymous && <IonBadge color="secondary" className="profile-badge">Pro Hunter</IonBadge>}
               {user.isAnonymous && <IonBadge color="medium" className="profile-badge">Fantasma</IonBadge>}
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

          {/* RIGHT MAIN CONTENT (Tabs & Scrollable on PC) */}
          <div className="profile-main-content">
            <IonSegment 
              value={activeTab} 
              onIonChange={e => setActiveTab(e.detail.value as any)}
              className="profile-segment"
            >
              <IonSegmentButton value="resumen">
                <IonLabel>Resumen</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="historial">
                <IonLabel>Últimos Vistos</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="ajustes">
                <IonLabel>Ajustes</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            <div className="tab-render-area">
              {/* TAB 1: RESUMEN */}
              {activeTab === 'resumen' && (
                <div className="animate-fade-in">
                  <IonCard className="stats-card glass-card">
                    <IonCardContent>
                       <div className="stats-grid">
                         <div className="stat-item">
                           <span className="stat-value">Lv. {level}</span>
                           <span className="stat-label">Nivel Actual</span>
                         </div>
                         <div className="stat-item">
                           <span className="stat-value">{stats.chaptersRead}</span>
                           <span className="stat-label">Capítulos Leídos</span>
                         </div>
                         <div className="stat-item">
                           <span className="stat-value">{stats.commentsPosted}</span>
                           <span className="stat-label">Aportes Sociales</span>
                         </div>
                       </div>
                    </IonCardContent>
                  </IonCard>

                  <h3 className="section-title">Actividad Reciente de Lectura</h3>
                  <div className="activity-heatmap glass-card">
                    <p className="heatmap-placeholder-text">El gráfico de actividad térmica estará disponible pronto para los Elite Hunters.</p>
                    <div className="heatmap-grid faux-heatmap">
                      {Array.from({ length: 28 }).map((_, i) => (
                        <div key={i} className="heatmap-cell" style={{ opacity: Math.random() * 0.8 + 0.1 }}></div>
                      ))}
                    </div>
                  </div>

                  <div className="promo-banner">
                    <IonIcon icon={trophyOutline} className="promo-icon" />
                    <div className="promo-text">
                      <h4>¡Rango {userStatsService.getRankName(level + 1)}!</h4>
                      <p>Te faltan {Math.ceil(xpNeededForThisLevel - currentXPProgress)} XP para ascender al siguiente nivel de cazador.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HISTORIAL (Placeholder para la UI por ahora) */}
              {activeTab === 'historial' && (
                <div className="animate-fade-in empty-state">
                  <IonIcon icon={timeOutline} color="medium" style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }} />
                  <h3>Tu Historial está aquí</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Módulo en construcción: Próximamente verás tu progreso exacto capítulo por capítulo.</p>
                </div>
              )}

              {/* TAB 3: AJUSTES */}
              {activeTab === 'ajustes' && (
                <div className="animate-fade-in">
                  <h3 className="section-title" style={{ marginTop: '0' }}>Ajustes LectorHaus Pro</h3>
                  <IonList className="options-list glass-list">
                    <IonItem button detail={true} className="option-item">
                      <IonIcon icon={diamondOutline} slot="start" color="warning" />
                      <IonLabel>
                        <h2>Mecenas / Donaciones</h2>
                        <p>Desbloquea temas y medallas exclusivas</p>
                      </IonLabel>
                    </IonItem>
                    
                    <IonItem button detail={true} className="option-item">
                      <IonIcon icon={colorPaletteOutline} slot="start" color="primary" />
                      <IonLabel>
                        <h2>Temas y Apariencia</h2>
                        <p>Personaliza tu experiencia de lectura</p>
                      </IonLabel>
                    </IonItem>

                    <IonItem button detail={true} className="option-item">
                      <IonIcon icon={shieldCheckmarkOutline} slot="start" color="success" />
                      <IonLabel>
                        <h2>Seguridad de Cuenta</h2>
                        <p>Gestionar tus datos en la nube</p>
                      </IonLabel>
                    </IonItem>
                  </IonList>
                </div>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
