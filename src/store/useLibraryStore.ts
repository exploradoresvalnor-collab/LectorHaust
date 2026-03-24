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
        const user = auth.currentUser;
        if (user) get().pushToCloud(user.uid);
      },
      markAsRead: (chapterId) => {
        if (!get().readChapters.includes(chapterId)) {
          set((state) => {
            const updated = [...state.readChapters, chapterId];
            return { readChapters: updated.length > 500 ? updated.slice(-500) : updated };
          });
          const user = auth.currentUser;
          if (user) get().pushToCloud(user.uid);
        }
      },
      isRead: (chapterId) => get().readChapters.includes(chapterId),
      
      syncFromCloud: async (userId) => {
        try {
          const docRef = doc(db, 'users', userId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const decodeKeys = (obj: any): any => {
              if (!obj || typeof obj !== 'object') return obj;
              if (Array.isArray(obj)) return obj.map(decodeKeys);
              const decoded: any = {};
              for (const [key, value] of Object.entries(obj)) {
                const newKey = key.replace(/__SLASH__/g, '/').replace(/__DOT__/g, '.');
                decoded[newKey] = decodeKeys(value);
              }
              return decoded;
            };

            const cloudData = decodeKeys(docSnap.data());
            
            // Smart Merge to prevent data loss across devices or offline sessions
            const localFavs = get().favorites;
            const cloudFavs = cloudData.favorites || [];
            const favMap = new Map();
            localFavs.forEach((f: any) => favMap.set(f.id, f));
            cloudFavs.forEach((f: any) => favMap.set(f.id, f));
            const mergedFavs = Array.from(favMap.values());

            const localHistory = get().history;
            const cloudHistory = cloudData.history || {};
            const mergedHistory: any = { ...cloudHistory };
            for (const [mId, localProg] of Object.entries(localHistory)) {
               if (!mergedHistory[mId] || (localProg.lastRead || 0) > (mergedHistory[mId].lastRead || 0)) {
                   mergedHistory[mId] = localProg;
               }
            }

            const mergedReadChapters = Array.from(new Set([...get().readChapters, ...(cloudData.readChapters || [])]));
            if (mergedReadChapters.length > 1000) mergedReadChapters.splice(0, mergedReadChapters.length - 1000);

            set({
              favorites: mergedFavs,
              history: mergedHistory,
              readChapters: mergedReadChapters,
              showNSFW: cloudData.showNSFW !== undefined ? cloudData.showNSFW : get().showNSFW
            });
            
            // Automatically push the merged result back to cloud
            get().pushToCloud(userId);
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
            
            // Helper to remove 'undefined' which Firebase doesn't support, and encode forbidden keys
            const cleanAndEncode = (obj: any): any => {
              const cleaned = JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
              
              const encodeKeys = (o: any): any => {
                if (!o || typeof o !== 'object') return o;
                if (Array.isArray(o)) return o.map(encodeKeys);
                const encoded: any = {};
                for (const [key, value] of Object.entries(o)) {
                  // Firestore forbids . and / in map keys
                  const newKey = key.replace(/\//g, '__SLASH__').replace(/\./g, '__DOT__');
                  encoded[newKey] = encodeKeys(value);
                }
                return encoded;
              };
              
              return encodeKeys(cleaned);
            };

            await setDoc(docRef, cleanAndEncode({
              favorites: get().favorites,
              history: get().history,
              readChapters: get().readChapters,
              showNSFW: get().showNSFW,
              updatedAt: Date.now()
            }), { merge: true });
          } catch (err) {
            console.error('Error pushing to cloud:', err);
          }
        }, 1500); 
      }
    }),
    { 
      name: 'kami-reader-library', 
      storage: createJSONStorage(() => localStorage) 
    }
  )
);
