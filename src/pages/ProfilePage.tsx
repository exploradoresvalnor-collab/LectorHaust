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
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const history = useHistory();

  useEffect(() => {
    const unsubscribe = firebaseAuthService.subscribe((user) => {
      if (!user) {
        history.replace('/home');
      } else {
        setUser(user);
      }
    });
    return () => unsubscribe();
  }, [history]);

  const readChapters = useLibraryStore(state => state.readChapters);
  
  const handleLogout = async () => {
    await firebaseAuthService.logout();
    history.replace('/home');
  };

  const readCount = readChapters.length;
  const userLevel = Math.floor(readCount / 10) + 1;
  const chaptersToNextLevel = 10 - (readCount % 10);

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
          <h2 className="user-name">{user.displayName}</h2>
          <p className="user-email">{user.email}</p>
          <div className="badge-belt">
             <IonBadge color="primary" className="profile-badge">Lector Novato</IonBadge>
             <IonBadge color="secondary" className="profile-badge">Fundador</IonBadge>
          </div>
        </div>

        <IonCard className="stats-card glass-card">
          <IonCardContent>
             <div className="stats-grid">
               <div className="stat-item">
                 <span className="stat-value">Lv. {userLevel}</span>
                 <span className="stat-label">Nivel</span>
               </div>
               <div className="stat-item">
                 <span className="stat-value">{readCount}</span>
                 <span className="stat-label">Capítulos</span>
               </div>
               <div className="stat-item">
                 <span className="stat-value">1</span>
                 <span className="stat-label">Racha</span>
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
            <h4>¡Sigue leyendo!</h4>
            <p>Lee {chaptersToNextLevel} capítulos más para subir al nivel {userLevel + 1}.</p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
