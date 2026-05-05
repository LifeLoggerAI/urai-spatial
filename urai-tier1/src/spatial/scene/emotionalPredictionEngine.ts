import type { LifeMapMode, LifeMapNode } from "./lifeMapModel";
import type { PersonalCompanionMemory } from "./personalCompanionMemory";

export type EmotionalPrediction = {
  id: string;
  horizon: "now" | "soon" | "later";
  direction: "stable" | "softening" | "rising-pressure" | "recovery-window" | "dreamy";
  confidence: number;
  risk: "low" | "medium" | "high";
  suggestedTone: "gentle" | "direct" | "quiet" | "protective" | "mythic";
  message: string;
  recommendedAction: "watch" | "reflect" | "open-companion" | "ritual" | "rest";
  timestamp: number;
};

export type EmotionalPredictionContext = {
  mode: LifeMapMode;
  selectedNode: LifeMapNode | null;
  visibleNodes: LifeMapNode[];
  memory: PersonalCompanionMemory;
  recentInteractionCount: number;
  now?: number;
};

function averageImportance(nodes: LifeMapNode[]) {
  if (!nodes.length) return 0;
  return nodes.reduce((sum, node) => sum + node.importanceScore, 0) / nodes.length;
}

export function predictEmotionalState(context: EmotionalPredictionContext): EmotionalPrediction {
  const now = context.now ?? Date.now();
  const nodes = context.visibleNodes;
  const shadowCount = nodes.filter((node) => node.isShadow).length;
  const recoveryCount = nodes.filter((node) => node.isRecovery).length;
  const dreamCount = nodes.filter((node) => node.isDream).length;
  const avgImportance = averageImportance(nodes);
  const selected = context.selectedNode;

  let direction: EmotionalPrediction["direction"] = "stable";
  let risk: EmotionalPrediction["risk"] = "low";
  let suggestedTone: EmotionalPrediction["suggestedTone"] = "gentle";
  let recommendedAction: EmotionalPrediction["recommendedAction"] = "watch";
  let confidence = 0.54;

  if (context.mode === "shadow" || selected?.isShadow || shadowCount >= 2) {
    direction = "rising-pressure";
    risk = shadowCount >= 3 || selected?.isShadow ? "high" : "medium";
    suggestedTone = "protective";
    recommendedAction = risk === "high" ? "open-companion" : "reflect";
    confidence = 0.72;
  } else if (context.mode === "recovery" || selected?.isRecovery || recoveryCount >= 2) {
    direction = "recovery-window";
    risk = "low";
    suggestedTone = "gentle";
    recommendedAction = "ritual";
    confidence = 0.7;
  } else if (context.mode === "dream" || selected?.isDream || dreamCount >= 2) {
    direction = "dreamy";
    risk = "low";
    suggestedTone = "mythic";
    recommendedAction = "reflect";
    confidence = 0.62;
  } else if (avgImportance > 74 || context.recentInteractionCount > 4) {
    direction = "rising-pressure";
    risk = "medium";
    suggestedTone = "quiet";
    recommendedAction = "rest";
    confidence = 0.64;
  } else if (recoveryCount > shadowCount) {
    direction = "softening";
    risk = "low";
    suggestedTone = "gentle";
    recommendedAction = "watch";
    confidence = 0.6;
  }

  const name = context.memory.userName || "there";
  const message =
    direction === "rising-pressure"
      ? `${name}, I am seeing pressure gather before it becomes a full pattern. We can slow this down now.`
      : direction === "recovery-window"
        ? `${name}, this looks like a recovery window. It may be a good moment to mark what helped you come back.`
        : direction === "dreamy"
          ? `${name}, your signal feels symbolic right now. Reflection may work better than action.`
          : direction === "softening"
            ? `${name}, the pattern appears to be softening. Stay close to what is working.`
            : `${name}, your sky looks mostly stable. I will stay quiet unless the signal changes.`;

  return {
    id: `emotion-prediction-${now}`,
    horizon: risk === "high" ? "now" : risk === "medium" ? "soon" : "later",
    direction,
    confidence,
    risk,
    suggestedTone,
    message,
    recommendedAction,
    timestamp: now,
  };
}

export function emitEmotionalPrediction(prediction: EmotionalPrediction) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("urai:emotion.prediction", { detail: prediction }));
}
