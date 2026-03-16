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
  IonBadge
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
          <IonTitle>Mi Perfil</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleLogout} color="danger">
              <IonIcon icon={logOutOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding profile-content">
        <div className="profile-hero">
          <div className="avatar-container">
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

        <IonCard className="stats-card glass-card">
          <IonCardContent>
             <div className="stats-grid">
               <div className="stat-item">
                 <span className="stat-value">Lv. {level}</span>
                 <span className="stat-label">Nivel</span>
               </div>
               <div className="stat-item">
                 <span className="stat-value">{stats.chaptersRead}</span>
                 <span className="stat-label">Capítulos</span>
               </div>
               <div className="stat-item">
                 <span className="stat-value">{stats.commentsPosted}</span>
                 <span className="stat-label">Social</span>
               </div>
             </div>
          </IonCardContent>
        </IonCard>

        <h3 className="section-title">LectorHaus Pro</h3>
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

        <div className="promo-banner">
          <IonIcon icon={trophyOutline} className="promo-icon" />
          <div className="promo-text">
            <h4>¡Camino a {userStatsService.getRankName(level + 1)}!</h4>
            <p>Te faltan {Math.ceil(xpNeededForThisLevel - currentXPProgress)} XP para subir al nivel {level + 1}.</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
