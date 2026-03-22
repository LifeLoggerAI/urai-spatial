import { create } from "zustand";

export type SceneMode =
| "home"
| "lifemap"
| "ground"
| "object"
| "focus"
| "replay";

export interface SceneStore {
mode: SceneMode;
selectedStar: string | null;
selectedObject: string | null;
hoveredStar: string | null;
hoveredObject: string | null;
setMode: (mode: SceneMode) => void;
goHome: () => void;
returnHome: () => void;
goSky: () => void;
enterLifemap: () => void;
returnFromLifemap: () => void;
goGround: () => void;
returnFromGround: () => void;
selectStar: (id: string) => void;
focusStar: (id: string) => void;
enterReplay: () => void;
exitReplay: () => void;
selectObject: (id: string) => void;
focusObject: (id: string) => void;
exitObject: () => void;
setHoveredStar: (id: string | null) => void;
setHoveredObject: (id: string | null) => void;
clearHover: () => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
mode: "home",
selectedStar: null,
selectedObject: null,
hoveredStar: null,
hoveredObject: null,

setMode: (mode) => set({ mode }),

goHome: () =>
set({
mode: "home",
selectedStar: null,
selectedObject: null,
hoveredStar: null,
hoveredObject: null,
}),

returnHome: () =>
set({
mode: "home",
selectedStar: null,
selectedObject: null,
hoveredStar: null,
hoveredObject: null,
}),

goSky: () => set({ mode: "lifemap", selectedObject: null }),
enterLifemap: () => set({ mode: "lifemap", selectedObject: null }),
returnFromLifemap: () =>
set({
mode: "home",
selectedStar: null,
hoveredStar: null,
}),

goGround: () => set({ mode: "ground", selectedStar: null }),
returnFromGround: () =>
set({
mode: "home",
selectedObject: null,
hoveredObject: null,
}),

selectStar: (id) => set({ mode: "focus", selectedStar: id, selectedObject: null }),
focusStar: (id) => set({ mode: "focus", selectedStar: id, selectedObject: null }),

enterReplay: () =>
set((state) => ({ mode: state.selectedStar ? "replay" : state.mode })),
exitReplay: () =>
set((state) => ({ mode: state.selectedStar ? "focus" : "lifemap" })),

selectObject: (id) => set({ mode: "object", selectedObject: id, selectedStar: null }),
focusObject: (id) => set({ mode: "object", selectedObject: id, selectedStar: null }),
exitObject: () => set({ mode: "ground", selectedObject: null, hoveredObject: null }),

setHoveredStar: (id) => set({ hoveredStar: id }),
setHoveredObject: (id) => set({ hoveredObject: id }),
clearHover: () => set({ hoveredStar: null, hoveredObject: null }),
}));
