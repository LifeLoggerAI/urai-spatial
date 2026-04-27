import { CanonPhase, UraiRuntimeState } from "./types";

export const INITIAL_STATE: UraiRuntimeState = {
phase: "HOME",
selectedStarId: null,
enteredAt: Date.now(),
dwellUntil: 0,
};

export function canTransition(from: CanonPhase, to: CanonPhase): boolean {
if (from === "HOME" && to === "ASCENT") return true;
if (from === "ASCENT" && to === "LIFEMAP") return true;
if (from === "LIFEMAP" && to === "FOCUS") return true;
if (from === "FOCUS" && to === "REPLAY") return true;
if (from === "REPLAY" && to === "FOCUS") return true;
if (from === "FOCUS" && to === "LIFEMAP") return true;
if (from === "LIFEMAP" && to === "HOME") return true;
return false;
}
