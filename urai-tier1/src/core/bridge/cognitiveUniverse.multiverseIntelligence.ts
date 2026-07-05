import { createCrossForkEngine } from "./cognitiveUniverse.crossFork";
import { UniverseSnapshot } from "../persistence/cognitiveUniverse.persistence";

export type MultiverseIntelligenceState = {
  tick: number;
  totalForks: number;
  globalCoherence: number;
  globalEntropy: number;
  clusterCount: number;
  resonanceField: number;
  summary: string;
};

// MULTIVERSE INTELLIGENCE LAYER
// Aggregates cross-fork dynamics into a global emergent intelligence field (observational only)
export function createMultiverseIntelligence() {
  const crossFork = createCrossForkEngine();

  let tick = 0;

  function ingestFork(id: string, snapshot: UniverseSnapshot) {
    crossFork.registerFork(id, snapshot);
  }

  function analyze(): MultiverseIntelligenceState {
    tick++;

    const state = crossFork.getState();
    const forks = state.forks;

    let totalCoherence = 0;
    let totalEntropy = 0;
    let affinityCount = 0;

    let resonanceSum = 0;
    let comparisons = 0;

    // pairwise comparison across forks (lightweight sampling)
    for (let i = 0; i < forks.length; i++) {
      for (let j = i + 1; j < forks.length; j++) {
        const a = forks[i];
        const b = forks[j];

        const result = crossFork.computeAffinity(a, b);
        if (!result) continue;

        // derive global fields
        totalCoherence += result.similarity;
        resonanceSum += result.resonance;

        affinityCount++;
        comparisons++;
      }
    }

    const globalCoherence = affinityCount ? totalCoherence / affinityCount : 0;
    const globalEntropy = 1 - globalCoherence;
    const resonanceField = comparisons ? resonanceSum / comparisons : 0;

    const clusterCount = Math.max(1, Math.floor(affinityCount / 2));

    const summary = `forks=${forks.length} | coherence=${globalCoherence.toFixed(3)} | entropy=${globalEntropy.toFixed(3)} | resonance=${resonanceField.toFixed(3)}`;

    return {
      tick,
      totalForks: forks.length,
      globalCoherence,
      globalEntropy,
      clusterCount,
      resonanceField,
      summary
    };
  }

  function getState(): MultiverseIntelligenceState {
    const a = analyze();
    return a;
  }

  return {
    ingestFork,
    analyze,
    getState
  };
}
