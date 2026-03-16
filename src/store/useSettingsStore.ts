import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  dataSaverMode: boolean;
  toggleDataSaver: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dataSaverMode: false,
      toggleDataSaver: () => set((state) => ({ dataSaverMode: !state.dataSaverMode })),
    }),
    {
      name: 'lectorhaus-settings',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
