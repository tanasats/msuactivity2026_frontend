import { create } from 'zustand';

interface AppState {
  message: string;
  setMessage: (msg: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  message: '',
  setMessage: (msg) => set({ message: msg }),
}));
