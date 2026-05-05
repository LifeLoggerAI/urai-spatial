import type { EnvironmentEvolutionState, EnvironmentSpeechCue } from "./environmentEvolution";

export type CompanionBondLevel = "new" | "aware" | "attuned" | "trusted";

export type CompanionPresenceState = {
  name: "URAI";
  bondLevel: CompanionBondLevel;
  warmth: number;
  trust: number;
  familiarity: number;
  greeting: string;
  microAction: "listen" | "steady" | "guide" | "celebrate";
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function bondLevelFor(familiarity: number): CompanionBondLevel {
  if (familiarity > 0.72) return "trusted";
  if (familiarity > 0.44) return "attuned";
  if (familiarity > 0.18) return "aware";
  return "new";
}

export function createCompanionPresence(
  evolution: EnvironmentEvolutionState,
  speech: EnvironmentSpeechCue
): CompanionPresenceState {
  const familiarity = clamp01(evolution.totalSignals / 40);
  const warmth = clamp01(0.36 + evolution.bloomCount / 24 + (speech.tone === "supportive" ? 0.12 : 0));
  const trust = clamp01(0.28 + evolution.whisperCount / 30 + familiarity * 0.3);
  const bondLevel = bondLevelFor(familiarity);

  const microAction: CompanionPresenceState["microAction"] =
    speech.tone === "energizing" ? "celebrate" : speech.tone === "threshold" ? "steady" : speech.tone === "focused" ? "guide" : "listen";

  const greetingByBond: Record<CompanionBondLevel, string> = {
    new: "I am here quietly with you.",
    aware: "I am starting to recognize your rhythm.",
    attuned: "I can feel the pattern forming. I will stay close to the signal.",
    trusted: "I know this terrain with you now. I will help you cross it gently.",
  };

  return {
    name: "URAI",
    bondLevel,
    warmth,
    trust,
    familiarity,
    greeting: greetingByBond[bondLevel],
    microAction,
  };
}
