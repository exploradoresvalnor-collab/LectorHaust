import React, { Suspense, useState, useEffect } from 'react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
  IonBadge,
  useIonRouter,
  IonButton
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { 
  home, 
  search, 
  library, 
  chatbubbles, 
  tvOutline 
} from 'ionicons/icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Providers and Contexts
import { GlobalLoadingProvider } from './contexts/GlobalLoadingContext';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay';
import PageLoadingFallback from './components/PageLoadingFallback';

// Pages - Lazy loaded for performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const LibraryPage = React.lazy(() => import('./pages/LibraryPage'));
const MangaDetailsPage = React.lazy(() => import('./pages/MangaDetailsPage'));
const ReaderPage = React.lazy(() => import('./pages/ReaderPage'));
const SocialPage = React.lazy(() => import('./pages/SocialPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AnimePage = React.lazy(() => import('./pages/AnimePage'));
const AnimeDetailsPage = React.lazy(() => import('./pages/AnimeDetailsPage'));
const AnimeDirectoryPage = React.lazy(() => import('./pages/AnimeDirectoryPage'));
const PrivateChatPage = React.lazy(() => import('./pages/PrivateChatPage'));

// Services and Utilities
import { useLanguageStore } from './store/useLanguageStore';
import { getTranslation, getDefaultLanguage } from './utils/translations';
import { hapticsService } from './services/hapticsService';
import { checkUpdatesForLibrary } from './services/updateService';
import { firebaseAuthService } from './services/firebaseAuthService';
import { useLibraryStore } from './store/useLibraryStore';
import { db } from './services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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
import './theme/variables.css';
import './theme/global.css';

setupIonicReact();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  const { favorites } = useLibraryStore();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentLang, setCurrentLang] = useState(getDefaultLanguage());
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ mangaId: string; mangaTitle: string; chapterTitle: string } | null>(null);
  
  const router = useIonRouter();
  const location = useLocation();
  
  const shouldHideTabs = ['/manga/', '/reader/', '/chat/', '/anime/'].some(path => location.pathname.includes(path));

  // Sync translation store with local language state
  useEffect(() => {
    const handleStorage = () => {
      const newLang = getDefaultLanguage();
      setCurrentLang(newLang);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Update check logic
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;
    
    const pollUpdates = async () => {
      try {
        const updates = await checkUpdatesForLibrary(favorites);
        if (updates && updates.length > 0) {
          setUpdateInfo(updates[0]);
          setShowUpdateToast(true);
        }
      } catch (e) {
        console.warn("Update check failed", e);
      }
    };

    pollUpdates();
    const interval = setInterval(pollUpdates, 300000); // 5 min
    return () => clearInterval(interval);
  }, [favorites, currentUser]);

  // Auth and Social Subscriptions
  useEffect(() => {
    let unsubSocial: (() => void) | null = null;
    let unsubPrivate: (() => void) | null = null;

    const unsubscribeAuth = firebaseAuthService.subscribe(async (user) => {
      setCurrentUser(user);
      
      // Cleanup previous social subs
      if (unsubSocial) unsubSocial();
      if (unsubPrivate) unsubPrivate();

      if (user && !user.isAnonymous) {
        // Subscribe to Friend Requests
        const qReq = query(collection(db, `users/${user.uid}/friendRequests`), where('status', '==', 'pending'));
        unsubSocial = onSnapshot(qReq, (snap) => {
          setPendingRequests(snap.size);
        });

        // Subscribe to Total Private Unread Messages
        const qPriv = collection(db, `users/${user.uid}/privateChats`);
        unsubPrivate = onSnapshot(qPriv, (snap) => {
          let total = 0;
          snap.forEach(doc => {
            total += (doc.data().unreadCount || 0);
          });
          setTotalUnread(total);
        });
      } else {
        setPendingRequests(0);
        setTotalUnread(0);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubSocial) unsubSocial();
      if (unsubPrivate) unsubPrivate();
    };
  }, []);

  const totalBadges = pendingRequests + totalUnread;

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Suspense fallback={<PageLoadingFallback message="Preparando aventura..." />}>
          <Route exact path="/home" component={HomePage} />
          <Route exact path="/search" component={SearchPage} />
          <Route exact path="/library" component={LibraryPage} />
          <Route exact path="/manga/:id" component={MangaDetailsPage} />
          <Route exact path="/reader/:chapterId" component={ReaderPage} />
          <Route exact path="/social" component={SocialPage} />
          <Route exact path="/chat" component={ChatPage} />
          <Route exact path="/chat/:friendId" component={PrivateChatPage} />
          <Route exact path="/profile" component={ProfilePage} />
          <Route exact path="/anime" component={AnimePage} />
          <Route exact path="/anime/:id" component={AnimeDetailsPage} />
          <Route exact path="/browse-anime" component={AnimeDirectoryPage} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </Suspense>
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className={`main-tab-bar ${shouldHideTabs ? 'tab-bar-hidden' : ''}`}>
        <IonTabButton tab="home" href="/home" onClick={() => hapticsService.lightImpact()}>
          <IonIcon aria-hidden="true" icon={home} />
          <IonLabel>{getTranslation('tabs.home', currentLang)}</IonLabel>
        </IonTabButton>

        <IonTabButton tab="search" href="/search" onClick={() => hapticsService.lightImpact()}>
          <IonIcon aria-hidden="true" icon={search} />
          <IonLabel>{getTranslation('tabs.search', currentLang)}</IonLabel>
        </IonTabButton>

        <IonTabButton tab="anime" href="/anime" onClick={() => hapticsService.lightImpact()}>
          <IonIcon aria-hidden="true" icon={tvOutline} />
          <IonLabel>Anime</IonLabel>
        </IonTabButton>

        <IonTabButton tab="chat" href="/social" onClick={() => hapticsService.lightImpact()}>
          <IonIcon aria-hidden="true" icon={chatbubbles} />
          {totalBadges > 0 && (
            <IonBadge color="danger" className="tab-badge-custom">{totalBadges}</IonBadge>
          )}
          <IonLabel>{getTranslation('tabs.chat', currentLang)}</IonLabel>
        </IonTabButton>

        <IonTabButton tab="library" href="/library" onClick={() => hapticsService.lightImpact()}>
          <IonIcon aria-hidden="true" icon={library} />
          {favorites.length > 0 && (
            <IonBadge color="primary" mode="ios">{favorites.length}</IonBadge>
          )}
          <IonLabel>{getTranslation('tabs.library', currentLang)}</IonLabel>
        </IonTabButton>
      </IonTabBar>

      {/* Standard Update Toast Notification */}
      {showUpdateToast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '20px',
            right: '20px',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            zIndex: 1000,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
          }}
        >
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 800 }}>¡Nuevo capítulo!</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
              {updateInfo?.mangaTitle}: Cap. {updateInfo?.chapterTitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <IonButton 
              size="small" 
              fill="clear" 
              onClick={() => setShowUpdateToast(false)}
              style={{ '--color': 'rgba(255,255,255,0.4)' }}
            >
              Ignorar
            </IonButton>
            <IonButton 
              size="small" 
              color="primary" 
              onClick={() => {
                setShowUpdateToast(false);
                router.push(`/manga/${updateInfo?.mangaId}`);
              }}
            >
              Leer
            </IonButton>
          </div>
        </div>
      )}
    </IonTabs>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalLoadingProvider>
      <IonApp>
        <GlobalLoadingOverlay />
        <IonReactRouter>
          <Suspense fallback={<PageLoadingFallback message="Iniciando aplicación..." />}>
            <AppContent />
          </Suspense>
        </IonReactRouter>
      </IonApp>
    </GlobalLoadingProvider>
  </QueryClientProvider>
);

export default App;
