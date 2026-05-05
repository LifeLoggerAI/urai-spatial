import type { CompanionPresenceState } from "./companionPresence";
import type { EmotionalPrediction } from "./emotionalPrediction";
import type { EnvironmentEvolutionState, EnvironmentSpeechCue } from "./environmentEvolution";

export type CompanionIntervention = {
  shouldIntervene: boolean;
  interventionType: "none" | "grounding" | "focus" | "recovery" | "celebration";
  urgency: "silent" | "soft" | "clear";
  delayMs: number;
  message: string;
  reason: string;
};

const COOLDOWN_MS = 1000 * 60 * 3;
const STORAGE_KEY = "urai.spatial.lastIntervention.v1";

function lastInterventionAt() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function markIntervention() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Optional persistence only.
  }
}

export function createPerfectMomentIntervention(args: {
  companion: CompanionPresenceState;
  evolution: EnvironmentEvolutionState;
  prediction: EmotionalPrediction;
  speech: EnvironmentSpeechCue;
  intensity: number;
}): CompanionIntervention {
  const { companion, evolution, prediction, speech, intensity } = args;
  const cooldownActive = Date.now() - lastInterventionAt() < COOLDOWN_MS;

  if (cooldownActive) {
    return {
      shouldIntervene: false,
      interventionType: "none",
      urgency: "silent",
      delayMs: 0,
      message: "I will stay quiet for now.",
      reason: "cooldown",
    };
  }

  if (prediction.suggestedCompanionAction === "ground" && prediction.confidence > 0.48) {
    markIntervention();
    return {
      shouldIntervene: true,
      interventionType: "grounding",
      urgency: intensity > 0.78 ? "clear" : "soft",
      delayMs: intensity > 0.78 ? 250 : 1400,
      message: "Let’s lower the intensity for a moment. Breathe once, slowly.",
      reason: `ground:${prediction.confidence.toFixed(2)}`,
    };
  }

  if (prediction.suggestedCompanionAction === "guide" && companion.trust > 0.32) {
    markIntervention();
    return {
      shouldIntervene: true,
      interventionType: "focus",
      urgency: "soft",
      delayMs: 900,
      message: "I can narrow the field now. One next step is enough.",
      reason: `guide:${companion.trust.toFixed(2)}`,
    };
  }

  if (prediction.suggestedCompanionAction === "softPrompt" && evolution.bloomCount > 1) {
    markIntervention();
    return {
      shouldIntervene: true,
      interventionType: "recovery",
      urgency: "soft",
      delayMs: 1800,
      message: "This looks like a recovery window. I will keep the space gentle.",
      reason: `recovery:${evolution.bloomCount}`,
    };
  }

  if (prediction.suggestedCompanionAction === "celebrate" && speech.tone === "energizing") {
    markIntervention();
    return {
      shouldIntervene: true,
      interventionType: "celebration",
      urgency: "soft",
      delayMs: 500,
      message: "Momentum is here. I will brighten the path without pushing.",
      reason: "momentum",
    };
  }

  return {
    shouldIntervene: false,
    interventionType: "none",
    urgency: "silent",
    delayMs: 0,
    message: "I will stay quiet and keep watching the signal.",
    reason: "below-threshold",
  };
}
