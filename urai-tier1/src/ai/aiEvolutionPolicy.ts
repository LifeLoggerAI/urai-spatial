"use client";

export type EvolutionContext = {
  historyLength: number;
  branchCount: number;
  density: number;
  anomalyScore?: number;
  time?: number;
};

export type EvolutionAction =
  | { type: "none" }
  | { type: "fork"; index: number }
  | { type: "merge"; a: string; b: string }
  | { type: "synthesize" };

/**
 * AI POLICY LAYER (stubbed intelligence core)
 *
 * Replaces hardcoded evolution rules with a decision policy.
 * Later upgrade point: LLM / RL / learned policy network.
 */
export function aiEvolutionPolicy(ctx: EvolutionContext): EvolutionAction {
  const { historyLength, branchCount, density, anomalyScore = 0 } = ctx;

  // heuristic signals (replace with model later)
  const pressure = historyLength / 25;
  const instability = branchCount / 5;
  const chaos = density + anomalyScore;

  // 🧠 fork decision
  if (pressure > 1.0 && chaos < 0.7) {
    return {
      type: "fork",
      index: Math.max(0, historyLength - 5)
    };
  }

  // 🔀 merge decision
  if (instability > 1 && chaos > 0.5) {
    return {
      type: "merge",
      a: "auto",
      b: "auto"
    };
  }

  // 🧬 synthesis decision
  if (anomalyScore > 0.8) {
    return { type: "synthesize" };
  }

  return { type: "none" };
}
