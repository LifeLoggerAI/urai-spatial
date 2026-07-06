// URAI Spatial - Prediction Engine Plugin
// Consumes memory patterns to generate forward state predictions

import type { SimulationEnginePlugin } from "./SimulationEnginePlugin";
import type { SimulationState } from "../engine/SimulationEngine";

export class PredictionEnginePlugin implements SimulationEnginePlugin {
  id = "prediction-engine";

  onInit(state: SimulationState) {
    if (!(state as any).prediction) {
      (state as any).prediction = {
        candidates: [] as any[],
      };
    }
  }

  afterTick(state: SimulationState) {
    const memory = state.memory;

    // naive pattern extraction: last tick trend
    const last = memory[memory.length - 1];

    const prediction = (state as any).prediction;

    if (!prediction) return;

    prediction.candidates.push({
      tick: state.tick,
      inferredFrom: last?.id ?? "seed",
      likelihood: Math.min(1, memory.length / 100),
      projection: {
        expectedMemoryGrowth: memory.length + 1,
      },
      timestamp: Date.now(),
    });

    // cap predictions
    if (prediction.candidates.length > 50) {
      prediction.candidates = prediction.candidates.slice(-50);
    }
  }

  reduceState(state: SimulationState): SimulationState {
    return state;
  }
}
