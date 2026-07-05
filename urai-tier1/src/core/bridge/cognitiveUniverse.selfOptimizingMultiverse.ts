import { createMultiverseIntelligence } from "./cognitiveUniverse.multiverseIntelligence";
import { diffUniverses } from "./cognitiveUniverse.diff";
import { UniverseSnapshot } from "../persistence/cognitiveUniverse.persistence";

export type OptimizationSignal = {
  id: string;
  type: "coherence" | "entropy" | "resonance" | "structure";
  priority: number;
  recommendation: string;
  impactEstimate: number;
};

export type SelfOptimizingState = {
  tick: number;
  signals: OptimizationSignal[];
  globalScore: number;
  summary: string;
};

// SELF-OPTIMIZING MULTIVERSE LAYER (SAFE MODE)
// Generates optimization recommendations based on multiverse intelligence WITHOUT executing changes
export function createSelfOptimizingMultiverse() {
  const multiverse = createMultiverseIntelligence();

  let tick = 0;

  function ingestFork(id: string, snapshot: UniverseSnapshot) {
    multiverse.ingestFork(id, snapshot);
  }

  function evaluate(): SelfOptimizingState {
    tick++;

    const state = multiverse.getState();

    const signals: OptimizationSignal[] = [];

    // COHERENCE OPTIMIZATION
    if (state.globalCoherence < 0.4) {
      signals.push({
        id: "opt-coherence",
        type: "coherence",
        priority: 1,
        recommendation: "Increase structural alignment between forks via resonance amplification",
        impactEstimate: 0.7
      });
    }

    // ENTROPY OPTIMIZATION
    if (state.globalEntropy > 0.6) {
      signals.push({
        id: "opt-entropy",
        type: "entropy",
        priority: 2,
        recommendation: "Reduce divergence by clustering similar fork states",
        impactEstimate: 0.6
      });
    }

    // RESONANCE OPTIMIZATION
    if (state.resonanceField < 0.3) {
      signals.push({
        id: "opt-resonance",
        type: "resonance",
        priority: 3,
        recommendation: "Strengthen cross-fork interaction frequency and message coupling",
        impactEstimate: 0.5
      });
    }

    // STRUCTURE OPTIMIZATION
    if (state.clusterCount > 10) {
      signals.push({
        id: "opt-structure",
        type: "structure",
        priority: 4,
        recommendation: "Merge over-fragmented clusters to stabilize multiverse topology",
        impactEstimate: 0.4
      });
    }

    const globalScore = Math.max(
      0,
      1 - (state.globalEntropy * 0.5) + (state.globalCoherence * 0.5)
    );

    const summary = `score=${globalScore.toFixed(3)} | signals=${signals.length} | forks=${state.totalForks}`;

    return {
      tick,
      signals,
      globalScore,
      summary
    };
  }

  function getState(): SelfOptimizingState {
    return evaluate();
  }

  return {
    ingestFork,
    evaluate,
    getState
  };
}
