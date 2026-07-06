// URAI Spatial - Memory Graph Plugin
// Records simulation ticks into a lightweight memory log

import type { SimulationEnginePlugin } from "./SimulationEnginePlugin";
import type { SimulationState } from "../kernel/SimulationState";

export class MemoryGraphPlugin implements SimulationEnginePlugin {
  id = "memory-graph";

  onInit(state: SimulationState) {
    if (!state.memory) state.memory = [];
  }

  afterTick(state: SimulationState) {
    state.memory.push({
      id: randomId(),
      type: "tick",
      data: { tick: state.tick },
      timestamp: Date.now()
    });
  }

  reduceState(state: SimulationState): SimulationState {
    if (state.memory.length > 100) {
      state.memory = state.memory.slice(-100);
    }
    return state;
  }
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}