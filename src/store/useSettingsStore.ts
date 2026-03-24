import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  dataSaverMode: boolean;
  readingDirection: 'ltr' | 'rtl';
  toggleDataSaver: () => void;
  setReadingDirection: (dir: 'ltr' | 'rtl') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dataSaverMode: false,
      readingDirection: 'rtl', // Default to RTL as most manga is Japanese
      toggleDataSaver: () => set((state) => ({ dataSaverMode: !state.dataSaverMode })),
      setReadingDirection: (dir) => set({ readingDirection: dir }),
    }),
    {
      name: 'lectorhaus-settings',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
