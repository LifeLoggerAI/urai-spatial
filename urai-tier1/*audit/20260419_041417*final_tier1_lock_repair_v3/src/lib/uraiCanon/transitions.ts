import { UraiPhase } from "./types";

export function canTransition(from: UraiPhase, to: UraiPhase): boolean {
if (from === "HOME" && to === "ASCENT") return true;
if (from === "ASCENT" && (to === "LIFEMAP" || to === "HOME")) return true;
if (from === "LIFEMAP" && (to === "FOCUS" || to === "HOME")) return true;
if (from === "FOCUS" && (to === "REPLAY" || to === "LIFEMAP")) return true;
if (from === "REPLAY" && to === "FOCUS") return true;
return false;
}
