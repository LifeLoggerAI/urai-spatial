
'use client';
import { create } from 'zustand';

export type SceneMode = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay';

export type SceneState = {
  mode: SceneMode;
  progress: number;
  selectedStarId: string | null;
  hoveredStarId: string | null;
  isTransitioning: boolean;
  // Actions
  enterAscent: () => void;
  completeAscent: () => void;
  descendToHome: () => void;
  focusStar: (id: string) => void;
  unfocus: () => void;
  enterReplay: () => void;
  exitReplay: () => void;
  // Setters
  setProgress: (p: number) => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
};

const HOME_STATE = {
  mode: 'home' as SceneMode,
  progress: 0,
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
};

export const useSceneStore = create<SceneState>((set, get) => ({
  ...HOME_STATE,

  enterAscent: () => {
    if (get().mode === 'home') {
      set({ mode: 'ascent', isTransitioning: true, progress: 0 });
    }
  },

  completeAscent: () => {
    if (get().mode === 'ascent') {
      set({ mode: 'lifemap', isTransitioning: false, progress: 1 });
    }
  },

  descendToHome: () => {
    if (get().mode === 'lifemap') {
      set({ ...HOME_STATE, isTransitioning: true });
    }
  },

  focusStar: (id) => {
    if (get().mode === 'lifemap') {
      set({ mode: 'focus', selectedStarId: id, isTransitioning: true });
    }
  },

  unfocus: () => {
    if (get().mode === 'focus') {
      set({ mode: 'lifemap', selectedStarId: null, isTransitioning: true });
    }
  },

  enterReplay: () => {
    if (get().mode === 'focus' && get().selectedStarId) {
      set({ mode: 'replay', isTransitioning: true });
    }
  },

  exitReplay: () => {
    if (get().mode === 'replay') {
      set({ mode: 'focus', isTransitioning: true });
    }
  },
  
  setProgress: (progress) => set({ progress }),
  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
}));
