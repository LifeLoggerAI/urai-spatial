import { createUniverseInteractions } from "./cognitiveUniverse.interactions";

export type EmergentPattern = {
  id: string;
  type: "cluster" | "attractor" | "divergence";
  strength: number;
  members: number[];
};

export type EmergenceState = {
  patterns: EmergentPattern[];
  globalCoherence: number;
  entropy: number;
};

// Emergent Intelligence Layer (detects global structure across interacting worlds)
export function createEmergenceLayer(userId: string = "demo-user") {
  const universe = createUniverseInteractions(userId);

  let patterns: EmergentPattern[] = [];
  let tick = 0;
  let running = false;
  let interval: any = null;

  function analyze() {
    const field = universe.getField();
    const messages = field.messages;

    tick++;

    // 1. cluster interaction density by world pairs
    const interactionMap: Record<string, number> = {};

    for (const m of messages) {
      const key = `${m.from}-${m.to}`;
      interactionMap[key] = (interactionMap[key] || 0) + 1;
    }

    const clusters: EmergentPattern[] = Object.entries(interactionMap)
      .map(([key, count]) => {
        const [from, to] = key.split("-").map(Number);

        return {
          id: key,
          type: count > 5 ? "attractor" : "cluster",
          strength: Math.min(1, count / 10),
          members: [from, to]
        };
      });

    // 2. compute global coherence
    const density = field.density;
    const globalCoherence = Math.min(1, clusters.length / Math.max(1, messages.length));

    // 3. entropy estimate (diversity of interactions)
    const uniquePairs = Object.keys(interactionMap).length;
    const entropy = uniquePairs / Math.max(1, messages.length);

    patterns = clusters;

    return {
      patterns,
      globalCoherence,
      entropy
    };
  }

  function step() {
    const state = analyze();

    // feedback emergent structure back into universe
    if (state.globalCoherence > 0.7) {
      // reinforce stable interactions
      universe.broadcast(0, { type: "reinforce", state }, "sync");
    }

    if (state.entropy > 0.6) {
      // signal instability
      universe.broadcast(0, { type: "stabilize", state }, "mutation");
    }

    return state;
  }

  function start(intervalMs: number = 2000) {
    if (running) return stop;
    running = true;

    universe.start(intervalMs);

    interval = setInterval(() => {
      step();
    }, intervalMs);

    return stop;
  }

  function stop() {
    running = false;
    if (interval) clearInterval(interval);
    interval = null;
  }

  function getState(): EmergenceState {
    const state = analyze();

    return {
      patterns: state.patterns,
      globalCoherence: state.globalCoherence,
      entropy: state.entropy
    };
  }

  return {
    universe,
    analyze,
    step,
    start,
    stop,
    getState
  };
}
