import { create } from "zustand";

export type Star = {
  id: string;
  position: [number, number, number];
  image?: string;
};

type CameraMode = "home" | "sky" | "lifemap" | "star" | "memory" | "replay";

type SpatialState = {
  stars: Star[];
  selectedStarId: string | null;
  hoveredStarId: string | null;
  interactionLock: boolean;
  inReplayMode: boolean;
  cameraMode: CameraMode;

  setStars: (stars: Star[]) => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
  setInteractionLock: (lock: boolean) => void;
  setReplayMode: (v: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
  clearSelection: () => void;
};

export const useSpatialStore = create<SpatialState>((set) => ({
  stars: [],
  selectedStarId: null,
  hoveredStarId: null,
  interactionLock: false,
  inReplayMode: false,
  cameraMode: "home",

  setStars: (stars) => set({ stars }),
  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
  setInteractionLock: (lock) => set({ interactionLock: lock }),
  setReplayMode: (v) => set({ inReplayMode: v }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  clearSelection: () => set({ 
    selectedStarId: null,
    interactionLock: false,
    inReplayMode: false,
    cameraMode: 'lifemap' 
  }),
}));
