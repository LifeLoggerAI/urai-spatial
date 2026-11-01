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

const clamp01 = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const isRouteOrChild = (path: string, route: string) => path === route || path.startsWith(`${route}/`);

export function placeForPathname(pathname: string): CanonMode {
  const path = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (path === "/" || path === "/spatial/ar-vr") return "HOME";
  if (isRouteOrChild(path, "/ground")) return "GROUND";
  if (isRouteOrChild(path, "/life-map")) return "LIFEMAP";
  if (isRouteOrChild(path, "/focus")) return "FOCUS";
  if (isRouteOrChild(path, "/replay")) return "REPLAY";
  if (isRouteOrChild(path, "/passport")) return "PASSPORT";
  if (isRouteOrChild(path, "/status")) return "STATUS";
  return "HOME";
}

function phaseState(phase: CanonMode) {
  return { mode: phase, sceneMode: phase, phase, isTransitioning: false, inputLocked: false, progress: phase === "ASCENT" ? 0 : 1 };
}

function navigatedPhaseState(phase: CanonMode) {
  // Only Focus and Replay may carry a selected memory star. Imperative scene
  // transitions must enforce the same invariant as pathname transitions.
  return { ...phaseState(phase), ...(phase === "FOCUS" || phase === "REPLAY" ? {} : {
    selectedStarId: null, selectedStarPosition: null,
  }) };
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
  setMode: (m) => set(navigatedPhaseState(m)),
  setPhase: (p) => set(navigatedPhaseState(p)),
  setSelectedStar: (id, position = null) => set({ selectedStarId: id, selectedStarPosition: position }),
  focusStar: (id, position) => set({ selectedStarId: id, selectedStarPosition: position, ...phaseState("FOCUS") }),
  enterGround: () => set(navigatedPhaseState("GROUND")),
  enterPassport: () => set(navigatedPhaseState("PASSPORT")),
  enterStatus: () => set(navigatedPhaseState("STATUS")),
  enterReplay: () => set((state) => state.phase === "FOCUS" && state.selectedStarId ? phaseState("REPLAY") : state),
  // A delayed Replay/Focus cleanup may arrive after navigation to Home or
  // Ground. Only unwind to LifeMap while the current scene is still focused.
  clearFocusedStar: () => set((state) => ({
    selectedStarId: null,
    selectedStarPosition: null,
    ...(state.phase === "FOCUS" || state.phase === "REPLAY" ? phaseState("LIFEMAP") : {}),
  })),
  enterLifeMap: () => set({ mode: "ASCENT", sceneMode: "ASCENT", phase: "ASCENT", isTransitioning: true, inputLocked: true, progress: 0, selectedStarId: null, selectedStarPosition: null }),
  setPlaceFromRoute: (pathname) => set((state) => {
    const nextPhase = placeForPathname(pathname);
    // Focus and Replay share an intentional star selection. All other scene
    // routes must drop that selection to prevent stale direct Replay entry.
    const retainsStar = nextPhase === "FOCUS" || nextPhase === "REPLAY";
    if (state.phase === nextPhase &&
        (retainsStar || (state.selectedStarId === null && state.selectedStarPosition === null))) {
      return state;
    }
    return navigatedPhaseState(nextPhase);
  }),
  setProgress: (p) => set({ progress: clamp01(p) }),
  unlock: () => set({ isTransitioning: false, inputLocked: false }),
}));
