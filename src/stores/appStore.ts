import { create } from 'zustand';

interface AppState {
  sidebarCollapsed: boolean;
  currentPage: string;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  currentPage: 'dashboard',

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setCurrentPage: (page: string) => set({ currentPage: page }),
}));
