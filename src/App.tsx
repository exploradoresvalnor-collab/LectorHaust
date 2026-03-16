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
  useIonViewWillEnter
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { useLocation } from 'react-router-dom';
import { home, search, library } from 'ionicons/icons';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import MangaDetailsPage from './pages/MangaDetailsPage';
import ReaderPage from './pages/ReaderPage';
import ProfilePage from './pages/ProfilePage';
import { useState, useEffect } from 'react';
import { useLibraryStore } from './store/useLibraryStore';
import { checkUpdatesForLibrary, MangaUpdate } from './services/updateService';

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

const AppContent: React.FC = () => {
  const { favorites } = useLibraryStore();
  const [showToast, setShowToast] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<MangaUpdate | null>(null);
  const router = useIonRouter();
  const location = useLocation();

  // Paths where we want to HIDE the bottom tab bar
  const hiddenTabsPaths = ['/reader/', '/manga/', '/profile'];
  const shouldHideTabs = hiddenTabsPaths.some(path => location.pathname.includes(path));

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

  return (
    <>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/home" component={HomePage} />
          <Route exact path="/manga/:id" component={MangaDetailsPage} />
          <Route exact path="/reader/:chapterId" component={ReaderPage} />
          <Route exact path="/search" component={SearchPage} />
          <Route path="/library" component={LibraryPage} />
          <Route exact path="/profile" component={ProfilePage} />
          <Route exact path="/">
            <Redirect to="/home" />
          </Route>
        </IonRouterOutlet>
        <IonTabBar 
          slot="bottom" 
          className={shouldHideTabs ? 'tab-bar-hidden' : ''}
        >
          <IonTabButton tab="home" href="/home">
            <IonIcon aria-hidden="true" icon={home} />
            <IonLabel>Inicio</IonLabel>
          </IonTabButton>
          <IonTabButton tab="search" href="/search">
            <IonIcon aria-hidden="true" icon={search} />
            <IonLabel>Explorar</IonLabel>
          </IonTabButton>
          <IonTabButton tab="library" href="/library">
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
        position="top"
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
