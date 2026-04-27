/* URAI CANON TYPES — FULL BACKWARD COMPATIBILITY */

export const URAI_PHASES = ["HOME", "ASCENT", "LIFEMAP", "FOCUS", "REPLAY"] as const;
export type UraiPhase = (typeof URAI_PHASES)[number];
export type Phase = UraiPhase;
export type CanonPhase = UraiPhase;

/* BACKWARD COMPATIBILITY EXPORTS */
export type Mode = UraiPhase;
export type UraiMode = UraiPhase;

/* NARRATOR COMPAT */
export type NarratorPhase = UraiPhase;

/* STAR TYPES */
export interface StarPoint {
id: string;
position: [number, number, number];
color?: string;
scale?: number;
label?: string;
}

/* RUNTIME STATE */
export interface UraiRuntimeState {
mode: Mode;
phase: UraiPhase;
selectedStarId: string | null;
transitionToken: number;
inputLocked: boolean;
}

export const INITIAL_URAI_RUNTIME_STATE: UraiRuntimeState = {
mode: "HOME",
phase: "HOME",
selectedStarId: null,
transitionToken: 0,
inputLocked: false,
};

/* ESC CHAIN */
export const CANON_ESC_UNWIND: Record<UraiPhase, UraiPhase | null> = {
HOME: null,
ASCENT: "HOME",
LIFEMAP: "HOME",
FOCUS: "LIFEMAP",
REPLAY: "FOCUS",
};
