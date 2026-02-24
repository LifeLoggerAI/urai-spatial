import { create } from 'zustand';

// Define the shape of the scene state and its possible variations
export type SceneState = {
  type: 'home';
} | {
  type: 'lifemap';
} | {
  type: 'lifereview';
} | {
  type: 'replay';
  id: string;
};

// Define the store's interface
interface SceneStore {
  scene: SceneState;
  setScene: (scene: SceneState) => void;
}

// Create the store
export const useSceneStore = create<SceneStore>((set) => ({
  scene: { type: 'home' }, // Default scene
  setScene: (scene) => set({ scene }),
}));
