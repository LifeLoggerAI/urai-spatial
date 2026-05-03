export type CanonPhase =
| "HOME"
| "ASCENT"
| "LIFEMAP"
| "FOCUS"
| "REPLAY";

export type UraiRuntimeState = {
phase: CanonPhase;
selectedStarId: string | null;
enteredAt: number;
dwellUntil: number;
};

export type StarPoint = {
id: string;
position: [number, number, number];
};
