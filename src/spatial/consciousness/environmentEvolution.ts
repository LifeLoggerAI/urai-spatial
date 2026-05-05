import type { ConsciousEnvironmentState } from "./consciousEnvironment";

export type EnvironmentEvolutionState = {
  version: 1;
  totalSignals: number;
  bloomCount: number;
  whisperCount: number;
  dominantArchetype: ConsciousEnvironmentState["archetype"];
  lastNarratorCue: string;
  updatedAt: string;
};

export type EnvironmentSpeechCue = {
  text: string;
  tone: "calm" | "focused" | "supportive" | "threshold" | "energizing";
  shouldRequestVoice: boolean;
  reason: string;
};

const STORAGE_KEY = "urai.spatial.environmentEvolution.v1";

const DEFAULT_STATE: EnvironmentEvolutionState = {
  version: 1,
  totalSignals: 0,
  bloomCount: 0,
  whisperCount: 0,
  dominantArchetype: "stillness",
  lastNarratorCue: "",
  updatedAt: "",
};

function safeNow() {
  return new Date().toISOString();
}

function readState(): EnvironmentEvolutionState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<EnvironmentEvolutionState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      version: 1,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: EnvironmentEvolutionState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage is optional. The environment should continue working if unavailable.
  }
}

export function evolveEnvironment(state: ConsciousEnvironmentState): EnvironmentEvolutionState {
  const previous = readState();

  const next: EnvironmentEvolutionState = {
    version: 1,
    totalSignals: previous.totalSignals + 1,
    bloomCount: previous.bloomCount + (state.shouldBloom ? 1 : 0),
    whisperCount: previous.whisperCount + (state.shouldWhisper ? 1 : 0),
    dominantArchetype: state.archetype,
    lastNarratorCue: state.narratorCue,
    updatedAt: safeNow(),
  };

  writeState(next);
  return next;
}

export function createEnvironmentSpeechCue(
  state: ConsciousEnvironmentState,
  evolution: EnvironmentEvolutionState
): EnvironmentSpeechCue {
  const toneByArchetype: Record<ConsciousEnvironmentState["archetype"], EnvironmentSpeechCue["tone"]> = {
    stillness: "calm",
    focus: "focused",
    recovery: "supportive",
    threshold: "threshold",
    spark: "energizing",
  };

  const textByArchetype: Record<ConsciousEnvironmentState["archetype"], string> = {
    stillness: "I am steady with you.",
    focus: "I am narrowing the field so you can move clearly.",
    recovery: "I can feel the system softening. Let this moment restore you.",
    threshold: "A threshold is opening. I will keep the environment calm while you cross it.",
    spark: "There is momentum here. I will brighten the path without overwhelming you.",
  };

  return {
    text: textByArchetype[state.archetype],
    tone: toneByArchetype[state.archetype],
    shouldRequestVoice: state.shouldWhisper && evolution.whisperCount <= 3,
    reason: `${state.archetype}:${evolution.totalSignals}`,
  };
}
