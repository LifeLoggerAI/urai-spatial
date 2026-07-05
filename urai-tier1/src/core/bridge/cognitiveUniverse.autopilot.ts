import { createSelfOptimizingMultiverse } from "./cognitiveUniverse.selfOptimizingMultiverse";

export type AutopilotAction = {
  id: string;
  type: "reweight" | "cluster" | "drift-correct" | "resonance-boost";
  priority: number;
  description: string;
  estimatedImpact: number;
};

export type AutopilotState = {
  tick: number;
  actions: AutopilotAction[];
  simulationScore: number;
  summary: string;
};

// AUTOPILOT MODE (CONTROLLED SIMULATION EXECUTION LAYER)
// Converts optimization signals into SAFE simulated actions (no real mutation)
export function createAutopilotMode() {
  const optimizer = createSelfOptimizingMultiverse();

  let tick = 0;

  function ingestFork(id: string, snapshot: any) {
    optimizer.ingestFork(id, snapshot);
  }

  function evaluate(): AutopilotState {
    tick++;

    const state = optimizer.evaluate();

    const actions: AutopilotAction[] = [];

    for (const signal of state.signals) {
      if (signal.type === "coherence") {
        actions.push({
          id: `act-${signal.id}`,
          type: "resonance-boost",
          priority: signal.priority,
          description: "Increase coupling between high-coherence forks in simulation",
          estimatedImpact: signal.impactEstimate
        });
      }

      if (signal.type === "entropy") {
        actions.push({
          id: `act-${signal.id}`,
          type: "cluster",
          priority: signal.priority,
          description: "Group divergent forks into stabilized clusters (simulated)",
          estimatedImpact: signal.impactEstimate
        });
      }

      if (signal.type === "resonance") {
        actions.push({
          id: `act-${signal.id}`,
          type: "drift-correct",
          priority: signal.priority,
          description: "Adjust cross-fork drift in simulated environment",
          estimatedImpact: signal.impactEstimate
        });
      }

      if (signal.type === "structure") {
        actions.push({
          id: `act-${signal.id}`,
          type: "reweight",
          priority: signal.priority,
          description: "Rebalance cluster weights in multiverse topology",
          estimatedImpact: signal.impactEstimate
        });
      }
    }

    const simulationScore = Math.max(0, Math.min(1,
      state.globalScore
    ));

    const summary = `autopilot tick=${tick} | actions=${actions.length} | score=${simulationScore.toFixed(3)}`;

    return {
      tick,
      actions,
      simulationScore,
      summary
    };
  }

  function getState(): AutopilotState {
    return evaluate();
  }

  return {
    ingestFork,
    evaluate,
    getState
  };
}
