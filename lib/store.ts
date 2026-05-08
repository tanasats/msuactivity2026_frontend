import { create } from 'zustand';
import type { User } from './types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isBootstrapping: boolean;
  setAuth: (token: string, user: User) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setBootstrapping: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isBootstrapping: true,
  setAuth: (token, user) => set({ accessToken: token, user }),
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setBootstrapping: (v) => set({ isBootstrapping: v }),
}));
