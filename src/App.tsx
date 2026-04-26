import React, { Suspense, useState, useEffect, useRef } from 'react';
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
  useIonToast,
  IonToast,
  IonButton
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Capacitor } from '@capacitor/core';
import { home, search, library, chatbubbles, tvOutline } from 'ionicons/icons';

// Services & Store
import { getTranslation, Language, getDefaultLanguage } from './utils/translations';
import { useLibraryStore } from './store/useLibraryStore';
import { checkUpdatesForLibrary, MangaUpdate } from './services/updateService';
import { hapticsService } from './services/hapticsService';
import { firebaseAuthService } from './services/firebaseAuthService';
import { socialService } from './services/socialService';
import { db } from './services/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc, where, updateDoc, serverTimestamp } from 'firebase/firestore';

// Providers & Components
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalLoadingProvider } from './contexts/GlobalLoadingContext';
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay';
import LoadingScreen from './components/LoadingScreen';
import OfflineBanner from './components/OfflineBanner';

// Lazy Loaded Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const LibraryPage = React.lazy(() => import('./pages/LibraryPage'));
const MangaDetailsPage = React.lazy(() => import('./pages/MangaDetailsPage'));
const ReaderPage = React.lazy(() => import('./pages/ReaderPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const PrivateChatPage = React.lazy(() => import('./pages/PrivateChatPage'));
const SocialPage = React.lazy(() => import('./pages/SocialPage'));
const AnimePage = React.lazy(() => import('./pages/AnimePage'));
const AnimeDetailsPage = React.lazy(() => import('./pages/AnimeDetailsPage'));
const AnimeDirectoryPage = React.lazy(() => import('./pages/AnimeDirectoryPage'));

/* Core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';
import './theme/global.css';

setupIonicReact();

const AppContent: React.FC = () => {
  const { favorites } = useLibraryStore();
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<MangaUpdate | null>(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>(getDefaultLanguage());
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const router = useIonRouter();
  const location = useLocation();
  const [presentToast] = useIonToast();
  const lastPendingRef = useRef(0);

  // Hide tab bar on specific routes
  const shouldHideTabs = 
    location.pathname === '/anime' ||
    location.pathname === '/browse-anime' ||
    location.pathname.startsWith('/manga/') || 
    location.pathname.startsWith('/anime/') || 
    location.pathname.startsWith('/reader/') ||
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/social') ||
    location.pathname.startsWith('/profile');


  // Update check logic (every 5 min)
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
    const interval = setInterval(pollUpdates, 300000);
    return () => clearInterval(interval);
  }, [favorites, currentUser]);

  // Auth and Social Subscriptions
  useEffect(() => {
    let unsubReq: (() => void) | null = null;
    let unsubPriv: (() => void) | null = null;

    const unsubscribeAuth = firebaseAuthService.subscribe(async (user) => {
      setCurrentUser(user);
      if (unsubReq) unsubReq();
      if (unsubPriv) unsubPriv();

      if (user) {
        // Init user doc
        const userRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const defaultName = user.displayName || `Explorador_${user.uid.substring(0, 4)}`;
            await setDoc(userRef, {
              uid: user.uid,
              name: defaultName,
              displayName: defaultName,
              avatar: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
              avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
              email: user.email || '',
              friends: [],
              blockedUsers: [],
              lastActive: Date.now(),
              createdAt: serverTimestamp()
            });
          } else {
            await socialService.updateUserPresence(user.uid);
          }
        } catch (err) { console.warn("User init failed", err); }

        if (!user.isAnonymous) {
          unsubReq = socialService.subscribeToFriendRequests(user.uid, (reqs) => {
            setPendingRequests(reqs.length);
          });
          unsubPriv = socialService.subscribeToAllUnreadCount(user.uid, (total) => {
            setTotalUnread(total);
          });

          const intervalId = setInterval(() => socialService.updateUserPresence(user.uid), 120000);
          
          // Notifications listener
          const unsubNotif = onSnapshot(
            query(collection(db, 'notifications'), where('userId', '==', user.uid), where('read', '==', false)),
            (snapshot) => {
              snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                  const n = change.doc.data();
                  if (n.type === 'friend_accepted') {
                    const fSnap = await getDoc(doc(db, 'users', n.fromId));
                    const fName = fSnap.exists() ? (fSnap.data().name || fSnap.data().displayName) : 'Un Nakama';
                    presentToast({
                      message: `¡${fName} aceptó tu solicitud! 🎉`,
                      duration: 4000, color: 'success', position: 'top',
                      buttons: [{ text: 'Chat', handler: () => router.push(`/chat/${n.fromId}`) }]
                    });
                    await updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
                  }
                }
              });
            }
          );

          const oldUnsubReq = unsubReq;
          unsubReq = () => { 
            if (oldUnsubReq) oldUnsubReq(); 
            unsubNotif(); 
            clearInterval(intervalId); 
          };
        }
      } else {
        setPendingRequests(0);
        setTotalUnread(0);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubReq) unsubReq();
      if (unsubPriv) unsubPriv();
    };
  }, [presentToast, router]);

  // Language sync
  useEffect(() => {
    const handleStorage = () => {
      setCurrentLang(getDefaultLanguage());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Friend request notifications (Haptics)
  useEffect(() => {
    if (pendingRequests > lastPendingRef.current) {
      if (Capacitor.isNativePlatform()) hapticsService.lightImpact();
      presentToast({
        message: '¡Tienes una nueva solicitud de Nakama! 🤝',
        duration: 3000,
        position: 'top',
        color: 'primary',
        buttons: [{ text: 'Ver', handler: () => router.push('/social') }]
      });
    }
    lastPendingRef.current = pendingRequests;
  }, [pendingRequests, presentToast, router]);

  // Global Chat badge
  useEffect(() => {
    const chatRef = collection(db, 'global_chat');
    const q = query(chatRef, orderBy('timestamp', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && location.pathname !== '/chat') {
        const lastMsg = snapshot.docs[0].data();
        const lastMsgTime = lastMsg.timestamp?.toMillis() || Date.now();
        const lastRead = Number(localStorage.getItem('lastReadChat') || 0);
        if (lastMsgTime > lastRead) setHasUnreadChat(true);
      }
    }, (error) => console.warn('Firebase: Chat listener issue', error.message));
    return () => unsubscribe();
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/chat') {
      setHasUnreadChat(false);
      localStorage.setItem('lastReadChat', Date.now().toString());
    }
  }, [location.pathname]);

  const totalBadges = pendingRequests + totalUnread;

  return (
    <>
      <OfflineBanner />
      <IonTabs>
        <IonRouterOutlet>
          <Suspense fallback={<LoadingScreen message="Preparando aventura..." />}>
            <Route exact path="/home" component={HomePage} />
            <Route exact path="/manga/:id" component={MangaDetailsPage} />
            <Route exact path="/reader/:chapterId" component={ReaderPage} />
            <Route exact path="/search" component={SearchPage} />
            <Route path="/library" component={LibraryPage} />
            <Route exact path="/profile" component={ProfilePage} />
            <Route exact path="/chat" component={ChatPage} />
            <Route exact path="/chat/:friendId" component={PrivateChatPage} />
            <Route exact path="/social" component={SocialPage} />
            <Route exact path="/anime" component={AnimePage} />
            <Route exact path="/browse-anime" component={AnimeDirectoryPage} />
            <Route exact path="/anime/:id" component={AnimeDetailsPage} />
            <Route exact path="/"><Redirect to="/home" /></Route>
          </Suspense>
        </IonRouterOutlet>
        
        <IonTabBar slot="bottom" className={`main-tab-bar ${shouldHideTabs ? 'tab-bar-hidden' : ''}`}>
          <IonTabButton tab="home" href="/home" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={home} />
            <IonLabel>{getTranslation('tabs.home', currentLang)}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="search" href="/search" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={search} />
            <IonLabel>{getTranslation('tabs.explore', currentLang)}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="anime" href="/anime" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={tvOutline} />
            <IonLabel>{getTranslation('tabs.anime', currentLang)}</IonLabel>
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
      </IonTabs>

      {/* Premium Update Toast */}
      {showUpdateToast && updateInfo && (
        <div className="premium-update-banner fade-in-up">
          <div className="banner-content">
            <div className="banner-icon">✨</div>
            <div className="banner-text">
              <h4>¡Nuevo capítulo!</h4>
              <p>{updateInfo.mangaTitle}: {updateInfo.chapterTitle}</p>
            </div>
          </div>
          <div className="banner-actions">
            <IonButton fill="clear" size="small" onClick={() => setShowUpdateToast(false)}>Ignorar</IonButton>
            <IonButton color="primary" size="small" onClick={() => {
              setShowUpdateToast(false);
              router.push(updateInfo.type === 'manga' ? `/manga/${updateInfo.mangaId}` : `/anime/${updateInfo.mangaId}`);
            }}>Leer</IonButton>
          </div>
        </div>
      )}
    </>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalLoadingProvider>
      <IonApp>
        <GlobalLoadingOverlay />
        <IonReactRouter>
          <Suspense fallback={<LoadingScreen message="Iniciando aplicación..." isInitialLoad={true} />}>
            <AppContent />
          </Suspense>
        </IonReactRouter>
      </IonApp>
    </GlobalLoadingProvider>
  </QueryClientProvider>
);

export default App;
