import type { CompanionPresenceState } from "./companionPresence";
import type { EnvironmentEvolutionState } from "./environmentEvolution";
import type { EmotionalPrediction } from "./emotionalPrediction";

export type PersonalityEvolution = {
  version: 1;
  dominantMode: "grounded" | "focused" | "recovering" | "momentum" | "observing";
  emotionalStabilityIndex: number;
  recoverySpeed: number;
  overstimulationFrequency: number;
  trustDepth: number;
  interactionRhythm: number;
  updatedAt: string;
};

const STORAGE_KEY = "urai.spatial.personalityEvolution.v1";

const DEFAULT_STATE: PersonalityEvolution = {
  version: 1,
  dominantMode: "observing",
  emotionalStabilityIndex: 0.5,
  recoverySpeed: 0.42,
  overstimulationFrequency: 0.18,
  trustDepth: 0.28,
  interactionRhythm: 0.5,
  updatedAt: "",
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function readState(): PersonalityEvolution {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw), version: 1 };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: PersonalityEvolution) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Optional persistence only.
  }
}

export function evolvePersonality(args: {
  companion: CompanionPresenceState;
  evolution: EnvironmentEvolutionState;
  prediction: EmotionalPrediction;
}): PersonalityEvolution {
  const previous = readState();
  const total = Math.max(1, args.evolution.totalSignals);
  const bloomRatio = args.evolution.bloomCount / total;
  const whisperRatio = args.evolution.whisperCount / total;

  const dominantMode: PersonalityEvolution["dominantMode"] =
    args.prediction.suggestedCompanionAction === "ground"
      ? "grounded"
      : args.prediction.suggestedCompanionAction === "guide"
        ? "focused"
        : args.prediction.suggestedCompanionAction === "softPrompt"
          ? "recovering"
          : args.prediction.suggestedCompanionAction === "celebrate"
            ? "momentum"
            : "observing";

  const next: PersonalityEvolution = {
    version: 1,
    dominantMode,
    emotionalStabilityIndex: clamp01(previous.emotionalStabilityIndex * 0.82 + (1 - whisperRatio) * 0.18),
    recoverySpeed: clamp01(previous.recoverySpeed * 0.8 + bloomRatio * 0.2),
    overstimulationFrequency: clamp01(previous.overstimulationFrequency * 0.86 + (args.prediction.nextLikelyState === "overloaded" ? 0.14 : 0)),
    trustDepth: clamp01(previous.trustDepth * 0.78 + args.companion.trust * 0.22),
    interactionRhythm: clamp01(previous.interactionRhythm * 0.84 + Math.min(total, 60) / 60 * 0.16),
    updatedAt: new Date().toISOString(),
  };

  writeState(next);
  return next;
}
