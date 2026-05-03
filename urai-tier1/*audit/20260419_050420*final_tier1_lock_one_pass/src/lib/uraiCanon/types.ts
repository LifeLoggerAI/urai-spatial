export type CanonPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
export type Mode = CanonPhase;
export type Phase = CanonPhase;
export type ScenePhase = CanonPhase;
export type UraiPhase = CanonPhase;
export type NarratorPhase = CanonPhase;
export type Vec3 = [number, number, number];

export type UraiCommand =
| "BEGIN_ASCENT"
| "OPEN_LIFEMAP"
| "OPEN_FOCUS"
| "OPEN_REPLAY"
| "ESCAPE";

export type StarPoint = {
id: string;
position: Vec3;
size?: number;
intensity?: number;
color?: string;
};

export type CameraPose = {
position: Vec3;
lookAt: Vec3;
fov?: number;
};

export type CameraConvergenceSpec = {
from: CameraPose;
to: CameraPose;
damping: number;
};

export type UraiRuntimeState = {
phase: CanonPhase;
mode: Mode;
selectedStarId: string | null;
enteredAt: number;
dwellUntil: number;
inputLocked: boolean;
isTransitioning: boolean;
transitioning: boolean;
transitionLock: boolean;
transitionState:
| "idle"
| "open_replay"
| "close_replay"
| "open_focus"
| "close_focus"
| "open_lifemap"
| "close_lifemap"
| "open_ascent"
| "close_ascent";
};

export type UraiState = UraiRuntimeState;
