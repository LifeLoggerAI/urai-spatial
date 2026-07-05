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
 * AI POLICY LAYER (now connected to live model inference)
 *
 * Primary path: external model inference API
 * Fallback path: deterministic heuristic policy
 */
export async function aiEvolutionPolicy(
  ctx: EvolutionContext
): Promise<EvolutionAction> {
  try {
    const res = await fetch("/api/model/infer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "evolution_policy",
        context: ctx
      })
    });

    if (res.ok) {
      const action = await res.json();
      if (action?.type) return action;
    }
  } catch (e) {
    // fallback below
  }

  // fallback heuristic signals
  const { historyLength, branchCount, density, anomalyScore = 0 } = ctx;

  const pressure = historyLength / 25;
  const instability = branchCount / 5;
  const chaos = density + anomalyScore;

  if (pressure > 1.0 && chaos < 0.7) {
    return {
      type: "fork",
      index: Math.max(0, historyLength - 5)
    };
  }

  if (instability > 1 && chaos > 0.5) {
    return {
      type: "merge",
      a: "auto",
      b: "auto"
    };
  }

  if (anomalyScore > 0.8) {
    return { type: "synthesize" };
  }

  return { type: "none" };
}
