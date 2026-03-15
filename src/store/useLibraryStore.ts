import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MangaEntry {
  id: string;
  title: string;
  cover: string;
  format?: string;
  tags?: string[];
}

interface ReadingProgress {
  chapterId: string;
  chapterNumber: string;
  pageIndex: number;
  lastRead: number; // Timestamp
}

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
  dataSaverMode: boolean;
  toggleDataSaver: () => void;
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (manga) => {
        const isFav = get().favorites.some(f => f.id === manga.id);
        set({
          favorites: isFav 
            ? get().favorites.filter(f => f.id !== manga.id)
            : [...get().favorites, manga]
        });
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
      dataSaverMode: false,
      toggleDataSaver: () => set((state) => ({ dataSaverMode: !state.dataSaverMode })),
    }),
    { 
      name: 'kami-reader-library', 
      storage: createJSONStorage(() => localStorage) 
    }
  )
);
