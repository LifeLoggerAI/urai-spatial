'''import { create } from 'zustand';

export type SceneMode = 'home' | 'lifemap' | 'focus' | 'replay';

export type SceneState = {
  mode: SceneMode;
  focusedStarId: string | null;
  setMode: (mode: SceneMode) => void;
  setFocus: (starId: string | null) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  mode: 'home',
  focusedStarId: null,
  setMode: (mode) => set({ mode }),
  setFocus: (starId) => set({ focusedStarId: starId, mode: starId ? 'focus' : 'lifemap' }),
}));
'''