import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import type { MangaEntry, ReadingProgress } from '../types/user';

// Re-export types for consumers that imported from here
export type { MangaEntry, ReadingProgress };

interface LibraryState {
  favorites: MangaEntry[];
  toggleFavorite: (manga: MangaEntry) => void;
  isFavorite: (id: string) => boolean;
  history: Record<string, ReadingProgress>; // mangaId -> progress
  saveProgress: (mangaId: string, progress: ReadingProgress) => void;
  getProgress: (mangaId: string) => ReadingProgress | null;
  readChapters: string[];
  toggleRead: (chapterId: string) => void;
  markAsRead: (chapterId: string) => void;
  isRead: (chapterId: string) => boolean;
   // Cloud Sync
  syncFromCloud: (userId: string) => Promise<void>;
  pushToCloud: (userId: string) => Promise<void>;
  // Global Settings
  showNSFW: boolean;
  setShowNSFW: (val: boolean) => void;
}

let syncTimeout: NodeJS.Timeout | null = null;

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      showNSFW: false,
      setShowNSFW: (val) => {
        set({ showNSFW: val });
        const user = auth.currentUser;
        if (user) get().pushToCloud(user.uid);
      },
      toggleFavorite: (manga) => {
        const isFav = get().favorites.some(f => f.id === manga.id);
        const updated = isFav 
          ? get().favorites.filter(f => f.id !== manga.id)
          : [...get().favorites, manga];
        
        set({ favorites: updated });
        
        const user = auth.currentUser;
        if (user) get().pushToCloud(user.uid);
      },
      isFavorite: (id) => get().favorites.some(f => f.id === id),
      history: {},
      saveProgress: (mangaId, progress) => {
        set((state) => ({
          history: {
            ...state.history,
            [mangaId]: progress
          }
        }));
        
        const user = auth.currentUser;
        if (user) get().pushToCloud(user.uid);
      },
      getProgress: (mangaId) => get().history[mangaId] || null,
      readChapters: [],
      toggleRead: (chapterId: string) => {
        set((state) => {
          const isRead = state.readChapters.includes(chapterId);
          if (isRead) {
            return { readChapters: state.readChapters.filter(id => id !== chapterId) };
          } else {
            const updated = [...state.readChapters, chapterId];
            return { readChapters: updated.length > 500 ? updated.slice(-500) : updated };
          }
        });
      },
      markAsRead: (chapterId) => {
        if (!get().readChapters.includes(chapterId)) {
          set((state) => {
            const updated = [...state.readChapters, chapterId];
            return { readChapters: updated.length > 500 ? updated.slice(-500) : updated };
          });
        }
      },
      isRead: (chapterId) => get().readChapters.includes(chapterId),
      
      syncFromCloud: async (userId) => {
        try {
          const docRef = doc(db, 'users', userId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            set({
              favorites: cloudData.favorites || [],
              history: cloudData.history || {},
              readChapters: cloudData.readChapters || [],
              showNSFW: cloudData.showNSFW || false
            });
          }
        } catch (err) {
          console.error('Error syncing from cloud:', err);
        }
      },

      pushToCloud: async (userId) => {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
          try {
            const docRef = doc(db, 'users', userId);
            await setDoc(docRef, {
              favorites: get().favorites,
              history: get().history,
              readChapters: get().readChapters,
              showNSFW: get().showNSFW,
              updatedAt: Date.now()
            }, { merge: true });
          } catch (err) {
            console.error('Error pushing to cloud:', err);
          }
        }, 1500); // Debounce de 1.5s para no spamear Firebase
      }
    }),
    { 
      name: 'kami-reader-library', 
      storage: createJSONStorage(() => localStorage) 
    }
  )
);
