import { resolveARPlacementState } from "./resolveARPlacementState";

export function resolveARPlacementStateById(mode: string) {
return resolveARPlacementState(mode === "REPLAY");
}
