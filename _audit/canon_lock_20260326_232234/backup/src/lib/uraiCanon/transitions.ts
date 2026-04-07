import type { TransitionSpec, UraiPhase } from "./types";

export const LEGAL_PHASE_TRANSITIONS: Record<UraiPhase, UraiPhase[]> = {
  HOME: ["LIFEMAP"],
  LIFEMAP: ["HOME", "FOCUS"],
  FOCUS: ["LIFEMAP", "REPLAY"],
  REPLAY: ["FOCUS"],
};

export const TRANSITION_SPECS: TransitionSpec[] = [
  {
    id: "HOME_TO_LIFEMAP",
    from: "HOME",
    to: "LIFEMAP",
    durationMs: 2200,
    lockInput: true,
    state: "ASCENT",
    easing: "easeOutCubic",
  },
  {
    id: "LIFEMAP_TO_HOME",
    from: "LIFEMAP",
    to: "HOME",
    durationMs: 2000,
    lockInput: true,
    state: "DESCENT",
    easing: "easeOutCubic",
  },
  {
    id: "LIFEMAP_TO_FOCUS",
    from: "LIFEMAP",
    to: "FOCUS",
    durationMs: 2100,
    lockInput: true,
    state: "FOCUS_LOCK",
    easing: "canonConvergence",
  },
  {
    id: "FOCUS_TO_LIFEMAP",
    from: "FOCUS",
    to: "LIFEMAP",
    durationMs: 1600,
    lockInput: true,
    state: "FOCUS_RELEASE",
    easing: "easeOutCubic",
  },
  {
    id: "FOCUS_TO_REPLAY",
    from: "FOCUS",
    to: "REPLAY",
    durationMs: 1400,
    lockInput: true,
    state: "REPLAY_ENTRY",
    easing: "easeOutCubic",
  },
  {
    id: "REPLAY_TO_FOCUS",
    from: "REPLAY",
    to: "FOCUS",
    durationMs: 1200,
    lockInput: true,
    state: "REPLAY_EXIT",
    easing: "easeOutCubic",
  },
];

export function isLegalPhaseTransition(from: UraiPhase, to: UraiPhase): boolean {
  return LEGAL_PHASE_TRANSITIONS[from].includes(to);
}

export function getTransitionSpec(from: UraiPhase, to: UraiPhase): TransitionSpec {
  const spec = TRANSITION_SPECS.find((item) => item.from === from && item.to === to);
  if (!spec) {
    throw new Error(`Illegal URAI phase transition: ${from} -> ${to}`);
  }
  return spec;
}
