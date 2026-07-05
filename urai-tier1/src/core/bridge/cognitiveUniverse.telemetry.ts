import { createCognitiveUniverse } from "./cognitiveUniverse";
import { createEmergenceLayer } from "./cognitiveUniverse.emergence";
import { createUniverseInteractions } from "./cognitiveUniverse.interactions";

export type UniverseTelemetrySnapshot = {
  tick: number;
  worlds: number;
  memoryNodes: number;
  edges: number;
  interactionDensity: number;
  globalCoherence: number;
  entropy: number;
  messageCount: number;
};

// TELEMETRY LAYER (READ-ONLY OBSERVABILITY SYSTEM)
export function createTelemetryLayer(userId: string = "demo-user") {
  const universe = createCognitiveUniverse(userId);
  const emergence = createEmergenceLayer(userId);
  const interactions = createUniverseInteractions(userId);

  let tick = 0;
  let interval: any = null;
  let running = false;

  function snapshot(): UniverseTelemetrySnapshot {
    const universeState = universe.getState();
    const emergenceState = emergence.analyze();
    const field = interactions.getField();

    const graph = emergenceState.patterns ?? [];

    return {
      tick,
      worlds: universeState.worlds ?? 0,
      memoryNodes: graph.length,
      edges: field.messages.length,
      interactionDensity: field.density,
      globalCoherence: emergenceState.globalCoherence ?? 0,
      entropy: emergenceState.entropy ?? 0,
      messageCount: field.messages.length
    };
  }

  function step(): UniverseTelemetrySnapshot {
    tick++;
    return snapshot();
  }

  function start(intervalMs: number = 2000) {
    if (running) return stop;
    running = true;

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

  return {
    universe,
    emergence,
    interactions,
    snapshot,
    step,
    start,
    stop
  };
}
