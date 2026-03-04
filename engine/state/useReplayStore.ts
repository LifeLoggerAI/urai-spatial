import { create } from 'zustand';

interface ReplayState {
  activeStarId: string | null;
  setActiveStarId: (id: string | null) => void;
}

export const useReplayStore = create<ReplayState>((set) => ({
  activeStarId: null,
  setActiveStarId: (id) => set({ activeStarId: id }),
}));
