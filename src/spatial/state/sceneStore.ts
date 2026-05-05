import { create } from "zustand";

export type ScenePhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
export type SceneMode = Lowercase<ScenePhase>;
export type AvatarState = "hidden" | "idle-home" | "entering-lifemap" | "returning-home";

export type HomeSubstate =
  | "home_idle"
  | "home_orb_focus"
  | "home_confirm_enter";

const PHASE_TO_MODE: Record<ScenePhase, SceneMode> = {
  HOME: "home",
  ASCENT: "ascent",
  LIFEMAP: "lifemap",
  FOCUS: "focus",
  REPLAY: "replay",
};

const LEGAL_FORWARD: Record<ScenePhase, ScenePhase | null> = {
  HOME: "ASCENT",
  ASCENT: "LIFEMAP",
  LIFEMAP: "FOCUS",
  FOCUS: "REPLAY",
  REPLAY: null,
};

const LEGAL_ESC: Record<ScenePhase, ScenePhase | null> = {
  REPLAY: "FOCUS",
  FOCUS: "LIFEMAP",
  LIFEMAP: "HOME",
  ASCENT: "HOME",
  HOME: null,
};

/* =========================
   HELPERS
   ========================= */

const deriveAvatarState = (
  phase: ScenePhase,
  ascentSubstate: SceneState["ascentSubstate"]
): AvatarState => {
  if (phase === "HOME") return ascentSubstate === "IDLE" ? "idle-home" : "returning-home";
  if (phase === "ASCENT") return "entering-lifemap";
  return "hidden";
};

const setPhaseState = (
  phase: ScenePhase,
  ascentSubstate: SceneState["ascentSubstate"] = "IDLE"
) => ({
  phase,
  mode: PHASE_TO_MODE[phase],
  avatarState: deriveAvatarState(phase, ascentSubstate),
  homeSubstate: phase === "HOME" ? "home_idle" : "home_confirm_enter",
});

/* =========================
   STATE
   ========================= */

export type SceneState = {
  phase: ScenePhase;
  mode: SceneMode;

  homeSubstate: HomeSubstate;

  selectedStarId: string | null;
  hoveredStarId: string | null;

  isTransitioning: boolean;
  inputLocked: boolean;

  avatarState: AvatarState;

  ascentSubstate:
    | "IDLE"
    | "CAMERA_LIFT"
    | "GROUND_RECESS"
    | "STREAK_RAMP"
    | "NEBULA_REVEAL"
    | "COMPLETE";

  cameraLookTarget: [number, number, number];

  /* actions */
  setPhase: (phase: ScenePhase) => void;
  enterLifeMap: () => void;
  focusHomeOrb: () => void;
  confirmHomeEntry: () => void;
  setHomeSubstate: (s: HomeSubstate) => void;
};

/* =========================
   STORE
   ========================= */

export const useSceneStore = create<SceneState>((set, get) => ({
  ...setPhaseState("HOME"),
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
  inputLocked: false,
  ascentSubstate: "IDLE",
  cameraLookTarget: [-0.6, 1.05, 0],

  /* ========================= */

  setPhase: (phase) =>
    set((state) => ({
      ...setPhaseState(phase, state.ascentSubstate),
    })),

  enterLifeMap: () =>
    set((state) => ({
      ...setPhaseState("LIFEMAP", state.ascentSubstate),
      isTransitioning: false,
      inputLocked: false,
      homeSubstate: "home_confirm_enter",
    })),

  /* =========================
     HOME ORB FLOW
     ========================= */

  setHomeSubstate: (s) =>
    set((state) =>
      state.phase === "HOME" ? { homeSubstate: s } : state
    ),

  focusHomeOrb: () =>
    set((state) =>
      state.phase === "HOME"
        ? {
            homeSubstate: "home_orb_focus",
            isTransitioning: false,
            inputLocked: false,
          }
        : state
    ),

  confirmHomeEntry: () =>
    set((state) =>
      state.phase === "HOME"
        ? {
            homeSubstate: "home_confirm_enter",
            isTransitioning: true,
          }
        : state
    ),
}));