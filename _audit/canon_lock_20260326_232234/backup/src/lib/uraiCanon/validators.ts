import type { StarNode, UraiRuntimeState, UraiPhase } from "./types";
import { isLegalPhaseTransition } from "./transitions";

export function assertValidStarNode(star: StarNode): StarNode {
  if (!star.id) throw new Error("StarNode.id is required");
  if (!Number.isFinite(star.position.x) || !Number.isFinite(star.position.y) || !Number.isFinite(star.position.z)) {
    throw new Error(`StarNode.position must be finite for star ${star.id}`);
  }
  if (star.intensity < 0 || star.intensity > 1) {
    throw new Error(`StarNode.intensity must be within 0..1 for star ${star.id}`);
  }
  if (!star.memoryRef) {
    throw new Error(`StarNode.memoryRef is required for star ${star.id}`);
  }
  return star;
}

export function assertLegalTransition(from: UraiPhase, to: UraiPhase): void {
  if (!isLegalPhaseTransition(from, to)) {
    throw new Error(`Illegal phase transition ${from} -> ${to}`);
  }
}

export function assertReplaySelectionIntegrity(state: UraiRuntimeState): void {
  if (state.phase === "REPLAY" && !state.replayMemoryRef) {
    throw new Error("Replay phase requires replayMemoryRef");
  }
  if ((state.phase === "FOCUS" || state.phase === "REPLAY") && !state.selectedStarId) {
    throw new Error(`${state.phase} phase requires selectedStarId`);
  }
}
