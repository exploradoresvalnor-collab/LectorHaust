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
  useIonToast,
  IonToast,
  useIonViewWillEnter,
  IonBadge
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { home, search, library, chatbubbles, tvOutline } from 'ionicons/icons';
import { getTranslation, Language, getDefaultLanguage } from './utils/translations';
import LocalizationBanner from './components/LocalizationBanner';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import MangaDetailsPage from './pages/MangaDetailsPage';
import ReaderPage from './pages/ReaderPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import PrivateChatPage from './pages/PrivateChatPage';
import SocialPage from './pages/SocialPage';
import { useState, useEffect, useRef } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { checkUpdatesForLibrary, MangaUpdate } from './services/updateService';
import { hapticsService } from './services/hapticsService';
import { db } from './services/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, setDoc, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuthService } from './services/firebaseAuthService';
import { socialService } from './services/socialService';

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
  const [currentLang, setCurrentLang] = useState<Language>(getDefaultLanguage());
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalUnread, setTotalUnread] = useState(0);
  const router = useIonRouter();
  const location = useLocation();
  const [presentToast] = useIonToast();
  const lastPendingRef = useRef(0);

  // Paths where we want to HIDE the bottom tab bar
  const shouldHideTabs = 
    location.pathname.startsWith('/manga/') || 
    location.pathname.startsWith('/reader/') ||
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/social') ||
    location.pathname.startsWith('/profile');

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

  // Social & Private Chat Notifications
  useEffect(() => {
    let unsubReq: (() => void) | null = null;
    let unsubPriv: (() => void) | null = null;

    const unsubscribeAuth = firebaseAuthService.subscribe(async (user) => {
      if (unsubReq) unsubReq();
      if (unsubPriv) unsubPriv();

      if (user) {
        // --- INITIALIZE USER DOC IF MISSING ---
        const userRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const defaultName = user.displayName || `Explorador_${user.uid.substring(0, 4)}`;
            await setDoc(userRef, {
              uid: user.uid,
              name: defaultName,
              displayName: defaultName, // For compatibility
              avatar: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
              avatarUrl: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`, // For compatibility
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
          // Presence Update Interval (Every 2 minutes)
          const interval = setInterval(() => socialService.updateUserPresence(user.uid), 120000);

          // Monitor general notifications (Friendships, etc)
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
          // Chain cleanup (Updated to include interval)
          const oldUnsubReq = unsubReq;
          unsubReq = () => { 
            if (oldUnsubReq) oldUnsubReq(); 
            unsubNotif(); 
            clearInterval(interval); 
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
  }, []);

  // Listen for language changes from storage
  useEffect(() => {
    const checkLang = () => {
      setCurrentLang(getDefaultLanguage());
    };

    window.addEventListener('storage', checkLang);
    return () => window.removeEventListener('storage', checkLang);
  }, []);

  // Global Chat Notifications Logic
  useEffect(() => {
    if (pendingRequests > lastPendingRef.current) {
      if (Capacitor.isNativePlatform()) {
        hapticsService.lightImpact();
      }
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
    }, (error) => {
      console.warn('Firebase: Chat listener issue (ignoring)', error.message);
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
      <LocalizationBanner lang={currentLang} onClose={() => {}} />
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
          <Route exact path="/chat/:friendId" component={PrivateChatPage} />
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
            <IonLabel>{getTranslation('tabs.home', currentLang)}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="search" href="/search" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={search} />
            <IonLabel>{getTranslation('tabs.explore', currentLang)}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="chat" href="/social" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={chatbubbles} />
            {(pendingRequests > 0 || totalUnread > 0 || hasUnreadChat) && (
              <IonBadge color="danger" className="tab-badge">
                {(pendingRequests + totalUnread) > 0 ? (pendingRequests + totalUnread) : ' '}
              </IonBadge>
            )}
            <IonLabel>{getTranslation('tabs.chat', currentLang)}</IonLabel>
          </IonTabButton>
          <IonTabButton tab="library" href="/library" onClick={() => hapticsService.lightImpact()}>
            <IonIcon aria-hidden="true" icon={library} />
            <IonLabel>{getTranslation('tabs.library', currentLang)}</IonLabel>
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
