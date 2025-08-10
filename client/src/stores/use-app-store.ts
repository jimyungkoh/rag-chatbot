import { create } from "zustand";

interface AppState {
  currentCollection: string | null;
  setCurrentCollection: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentCollection: null,
  setCurrentCollection: (name) => set({ currentCollection: name }),
}));
