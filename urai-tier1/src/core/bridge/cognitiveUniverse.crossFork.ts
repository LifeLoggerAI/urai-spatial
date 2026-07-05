import { UniverseSnapshot } from "../persistence/cognitiveUniverse.persistence";
import { diffUniverses } from "./cognitiveUniverse.diff";

export type CrossForkMessage = {
  id: string;
  fromFork: string;
  toFork: string;
  type: "echo" | "drift" | "resonance";
  payload: any;
  timestamp: number;
};

export type ForkAffinity = {
  forkA: string;
  forkB: string;
  similarity: number;
  resonance: number;
};

// CROSS-FORK INTERACTION LAYER
// Enables controlled, read-only interaction modeling between forked universes
export function createCrossForkEngine() {
  const forks: Record<string, UniverseSnapshot> = {};
  const messages: CrossForkMessage[] = [];

  function registerFork(id: string, snapshot: UniverseSnapshot) {
    forks[id] = snapshot;
  }

  function computeAffinity(aId: string, bId: string): ForkAffinity | null {
    const a = forks[aId];
    const b = forks[bId];

    if (!a || !b) return null;

    const diff = diffUniverses(a, b);

    // similarity heuristic (inverse of divergence)
    const similarity = Math.max(0, 1 - Math.abs(diff.coherenceDelta) - Math.abs(diff.entropyDelta));

    const resonance = (diff.memoryNodesDelta + diff.interactionsDelta) / 100;

    return {
      forkA: aId,
      forkB: bId,
      similarity,
      resonance
    };
  }

  function emitCrossForkMessage(
    fromFork: string,
    toFork: string,
    type: CrossForkMessage["type"],
    payload: any
  ) {
    const msg: CrossForkMessage = {
      id: `xf-${Date.now()}-${Math.random()}`,
      fromFork,
      toFork,
      type,
      payload,
      timestamp: Date.now()
    };

    messages.push(msg);
    return msg;
  }

  function simulateInteraction(aId: string, bId: string) {
    const affinity = computeAffinity(aId, bId);

    if (!affinity) return null;

    // resonance trigger
    if (affinity.similarity > 0.7) {
      emitCrossForkMessage(aId, bId, "resonance", {
        strength: affinity.similarity
      });
    }

    // drift trigger
    if (affinity.similarity < 0.3) {
      emitCrossForkMessage(aId, bId, "drift", {
        divergence: 1 - affinity.similarity
      });
    }

    // echo always possible as informational coupling
    emitCrossForkMessage(aId, bId, "echo", affinity);

    return {
      affinity,
      messages: messages.slice(-10)
    };
  }

  function getState() {
    return {
      forks: Object.keys(forks),
      messageCount: messages.length,
      recentMessages: messages.slice(-20)
    };
  }

  return {
    registerFork,
    computeAffinity,
    emitCrossForkMessage,
    simulateInteraction,
    getState
  };
}
