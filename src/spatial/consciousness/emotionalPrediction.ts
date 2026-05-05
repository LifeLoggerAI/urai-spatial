import type { CompanionPresenceState } from "./companionPresence";
import type { EnvironmentEvolutionState, EnvironmentSpeechCue } from "./environmentEvolution";

export type EmotionalPrediction = {
  currentNeed: "space" | "focus" | "reassurance" | "momentum" | "rest";
  nextLikelyState: "steady" | "overloaded" | "recovering" | "activated" | "deepening";
  confidence: number;
  suggestedCompanionAction: "stayQuiet" | "softPrompt" | "guide" | "ground" | "celebrate";
  message: string;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function createEmotionalPrediction(
  companion: CompanionPresenceState,
  evolution: EnvironmentEvolutionState,
  speech: EnvironmentSpeechCue,
  intensity: number
): EmotionalPrediction {
  const safeIntensity = clamp01(intensity);
  const trust = clamp01(companion.trust);
  const familiarity = clamp01(companion.familiarity);
  const bloomRatio = evolution.totalSignals > 0 ? evolution.bloomCount / evolution.totalSignals : 0;
  const whisperRatio = evolution.totalSignals > 0 ? evolution.whisperCount / evolution.totalSignals : 0;

  let currentNeed: EmotionalPrediction["currentNeed"] = "space";
  let nextLikelyState: EmotionalPrediction["nextLikelyState"] = "steady";
  let suggestedCompanionAction: EmotionalPrediction["suggestedCompanionAction"] = "stayQuiet";

  if (speech.tone === "threshold" || safeIntensity > 0.74) {
    currentNeed = "reassurance";
    nextLikelyState = whisperRatio > 0.42 ? "deepening" : "overloaded";
    suggestedCompanionAction = "ground";
  } else if (speech.tone === "focused") {
    currentNeed = "focus";
    nextLikelyState = "steady";
    suggestedCompanionAction = "guide";
  } else if (speech.tone === "supportive" || bloomRatio > 0.34) {
    currentNeed = "rest";
    nextLikelyState = "recovering";
    suggestedCompanionAction = "softPrompt";
  } else if (speech.tone === "energizing") {
    currentNeed = "momentum";
    nextLikelyState = "activated";
    suggestedCompanionAction = "celebrate";
  }

  const confidence = clamp01(0.32 + familiarity * 0.26 + trust * 0.24 + Math.min(evolution.totalSignals, 20) / 100);

  const messageByAction: Record<EmotionalPrediction["suggestedCompanionAction"], string> = {
    stayQuiet: "I will stay quiet and keep the environment steady.",
    softPrompt: "A softer path may help next. I will keep the signal gentle.",
    guide: "The next useful move is clarity. I will narrow the field for you.",
    ground: "You may need grounding soon. I will lower the intensity and stay close.",
    celebrate: "There is momentum here. I will brighten the path without pushing too hard.",
  };

  return {
    currentNeed,
    nextLikelyState,
    confidence,
    suggestedCompanionAction,
    message: messageByAction[suggestedCompanionAction],
  };
}
