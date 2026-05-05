import type { CompanionPresenceState } from "./companionPresence";
import type { EmotionalPrediction } from "./emotionalPrediction";
import type { EnvironmentEvolutionState } from "./environmentEvolution";

export type SimulatedDecisionPath = {
  action: "stayQuiet" | "softPrompt" | "guide" | "ground" | "celebrate";
  predictedOutcome: "stable" | "clearer" | "calmer" | "restored" | "energized";
  score: number;
  reason: string;
};

export type DecisionSimulation = {
  bestPath: SimulatedDecisionPath;
  paths: SimulatedDecisionPath[];
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function simulateDecisionPaths(args: {
  companion: CompanionPresenceState;
  evolution: EnvironmentEvolutionState;
  prediction: EmotionalPrediction;
}): DecisionSimulation {
  const trust = clamp01(args.companion.trust);
  const familiarity = clamp01(args.companion.familiarity);
  const bloomRatio = args.evolution.totalSignals > 0 ? args.evolution.bloomCount / args.evolution.totalSignals : 0;
  const overloadRisk = args.prediction.nextLikelyState === "overloaded" ? 0.28 : 0;

  const paths: SimulatedDecisionPath[] = [
    {
      action: "stayQuiet",
      predictedOutcome: "stable",
      score: clamp01(0.42 + (1 - args.prediction.confidence) * 0.25),
      reason: "silence-preserves-agency",
    },
    {
      action: "softPrompt",
      predictedOutcome: "restored",
      score: clamp01(0.36 + bloomRatio * 0.32 + trust * 0.14),
      reason: "recovery-window",
    },
    {
      action: "guide",
      predictedOutcome: "clearer",
      score: clamp01(0.4 + (args.prediction.currentNeed === "focus" ? 0.24 : 0) + trust * 0.16),
      reason: "clarity-support",
    },
    {
      action: "ground",
      predictedOutcome: "calmer",
      score: clamp01(0.38 + overloadRisk + familiarity * 0.12),
      reason: "overload-prevention",
    },
    {
      action: "celebrate",
      predictedOutcome: "energized",
      score: clamp01(0.32 + (args.prediction.currentNeed === "momentum" ? 0.28 : 0) + bloomRatio * 0.1),
      reason: "momentum-reinforcement",
    },
  ];

  const bestPath = [...paths].sort((a, b) => b.score - a.score)[0];
  return { bestPath, paths };
}
