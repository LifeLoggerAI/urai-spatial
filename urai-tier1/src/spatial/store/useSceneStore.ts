import { create } from "zustand";

export type CanonMode = "HOME" | "ASCENT" | "GROUND" | "LIFEMAP" | "FOCUS" | "REPLAY" | "PASSPORT" | "STATUS" | string;

type SceneState = {
  mode: CanonMode;
  sceneMode: CanonMode;
  phase: CanonMode;
  selectedStarId: string | null;
  selectedStarPosition: [number, number, number] | null;
  isTransitioning: boolean;
  inputLocked: boolean;
  progress: number;
  setMode: (m: CanonMode) => void;
  setPhase: (p: CanonMode) => void;
  setSelectedStar: (id: string | null, position?: [number, number, number] | null) => void;
  focusStar: (id: string, position: [number, number, number]) => void;
  enterGround: () => void;
  enterReplay: () => void;
  enterPassport: () => void;
  enterStatus: () => void;
  clearFocusedStar: () => void;
  enterLifeMap: () => void;
  setPlaceFromRoute: (pathname: string) => void;
  setProgress: (p: number) => void;
  unlock: () => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function placeForPathname(pathname: string): CanonMode {
  const path = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (path === "/" || path === "/spatial/ar-vr") return "HOME";
  if (path.indexOf("/ground") === 0) return "GROUND";
  if (path.indexOf("/life-map") === 0) return "LIFEMAP";
  if (path.indexOf("/focus") === 0) return "FOCUS";
  if (path.indexOf("/replay") === 0) return "REPLAY";
  if (path.indexOf("/passport") === 0) return "PASSPORT";
  if (path.indexOf("/status") === 0) return "STATUS";
  return "HOME";
}

function phaseState(phase: CanonMode) {
  return { mode: phase, sceneMode: phase, phase, isTransitioning: false, inputLocked: false, progress: phase === "ASCENT" ? 0 : 1 };
}

export const useSceneStore = create<SceneState>((set) => ({
  mode: "HOME",
  sceneMode: "HOME",
  phase: "HOME",
  selectedStarId: null,
  selectedStarPosition: null,
  isTransitioning: false,
  inputLocked: false,
  progress: 0,
  setMode: (m) => set(phaseState(m)),
  setPhase: (p) => set(phaseState(p)),
  setSelectedStar: (id, position = null) => set({ selectedStarId: id, selectedStarPosition: position }),
  focusStar: (id, position) => set({ selectedStarId: id, selectedStarPosition: position, ...phaseState("FOCUS") }),
  enterGround: () => set(phaseState("GROUND")),
  enterPassport: () => set(phaseState("PASSPORT")),
  enterStatus: () => set(phaseState("STATUS")),
  enterReplay: () => set((state) => phaseState(state.selectedStarId ? "REPLAY" : state.phase)),
  clearFocusedStar: () => set({ selectedStarId: null, selectedStarPosition: null, ...phaseState("LIFEMAP") }),
  enterLifeMap: () => set({ mode: "ASCENT", sceneMode: "ASCENT", phase: "ASCENT", isTransitioning: true, inputLocked: true, progress: 0 }),
  setPlaceFromRoute: (pathname) => set((state) => {
    const nextPhase = placeForPathname(pathname);
    if (state.phase === nextPhase) return state;
    return phaseState(nextPhase);
  }),
  setProgress: (p) => set({ progress: clamp01(p) }),
  unlock: () => set({ isTransitioning: false, inputLocked: false }),
}));
