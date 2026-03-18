import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
  useIonRouter,
  IonToast,
  useIonViewWillEnter,
  IonBadge
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useLocation } from 'react-router-dom';
import { home, search, library, chatbubbles } from 'ionicons/icons';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import MangaDetailsPage from './pages/MangaDetailsPage';
import ReaderPage from './pages/ReaderPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import SocialPage from './pages/SocialPage';
import { useState, useEffect } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { checkUpdatesForLibrary, MangaUpdate } from './services/updateService';
import { hapticsService } from './services/hapticsService';
import { db } from './services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';
import './theme/global.css';

setupIonicReact();

import OfflineBanner from './components/OfflineBanner';

const AppContent: React.FC = () => {
  const { favorites } = useLibraryStore();
  const [showToast, setShowToast] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<MangaUpdate | null>(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const router = useIonRouter();
  const location = useLocation();

  // Paths where we want to HIDE the bottom tab bar
  const shouldHideTabs = 
    location.pathname.startsWith('/manga/') || 
    location.pathname.startsWith('/reader/') ||
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/social');

  useEffect(() => {
    // Check for updates every 5 minutes
    const interval = setInterval(async () => {
      const updates = await checkUpdatesForLibrary(favorites);
      if (updates.length > 0) {
        setUpdateInfo(updates[0]);
        setShowToast(true);
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [favorites]);

  // Chat Notifications Logic
  useEffect(() => {
    const chatRef = collection(db, 'global_chat');
    const q = query(chatRef, orderBy('timestamp', 'desc'), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && location.pathname !== '/chat') {
        const lastMsg = snapshot.docs[0].data();
        const lastMsgTime = lastMsg.timestamp?.toMillis() || Date.now();
        const lastRead = Number(localStorage.getItem('lastReadChat') || 0);

        if (lastMsgTime > lastRead) {
          setHasUnreadChat(true);
        }
      }
    });

    return () => unsubscribe();
  }, [location.pathname]);

  // Clear badge when entering chat
  useEffect(() => {
    if (location.pathname === '/chat') {
      setHasUnreadChat(false);
      localStorage.setItem('lastReadChat', Date.now().toString());
    }
  }, [location.pathname]);

  return (
    <>
      <OfflineBanner />
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/home" component={HomePage} />
          <Route exact path="/manga/:id" component={MangaDetailsPage} />
          <Route exact path="/reader/:chapterId" component={ReaderPage} />
          <Route exact path="/search" component={SearchPage} />
          <Route path="/library" component={LibraryPage} />
          <Route exact path="/profile" component={ProfilePage} />
          <Route exact path="/chat">
            <ChatPage />
          </Route>
          <Route exact path="/social" component={SocialPage} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
        <IonTabBar 
          slot="bottom" 
          className={shouldHideTabs ? 'tab-bar-hidden' : ''}
        >
          <IonTabButton tab="home" href="/home" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={home} />
            <IonLabel>Inicio</IonLabel>
          </IonTabButton>
          <IonTabButton tab="search" href="/search" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={search} />
            <IonLabel>Explorar</IonLabel>
          </IonTabButton>
          <IonTabButton tab="chat" href="/chat" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={chatbubbles} />
            {hasUnreadChat && (
              <IonBadge color="danger" className="tab-badge"> </IonBadge>
            )}
            <IonLabel>Chat</IonLabel>
          </IonTabButton>
          <IonTabButton tab="library" href="/library" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={library} />
            <IonLabel>Biblioteca</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={`¡Nuevo capítulo de ${updateInfo?.mangaTitle}! (Cap. ${updateInfo?.chapterTitle})`}
        duration={5000}
        position="bottom"
        color="primary"
        cssClass="custom-toast"
        buttons={[
          {
            text: 'VER',
            role: 'info',
            handler: () => {
              if (updateInfo) router.push(`/manga/${updateInfo.mangaId}`);
            }
          },
          {
            text: 'Cerrar',
            role: 'cancel'
          }
        ]}
      />
    </>
  );
};

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <AppContent />
    </IonReactRouter>
  </IonApp>
);

export default App;
