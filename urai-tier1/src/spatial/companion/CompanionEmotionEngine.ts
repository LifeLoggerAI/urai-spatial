import type { CompanionContext, CompanionMood, CompanionState } from "./companionTypes";

export type CompanionEmotionTone =
  | "still"
  | "warm"
  | "softConcern"
  | "protectiveQuiet"
  | "wonder"
  | "relief"
  | "mourning"
  | "steady";

export type CompanionExpression = {
  tone: CompanionEmotionTone;
  mood: CompanionMood;
  breathSeconds: number;
  glowStrength: number;
  tiltDegrees: number;
  pulseScale: number;
  warmth: number;
  restraint: number;
  whisper: boolean;
  silenceHint: string;
};

const expressionByContext: Record<CompanionContext, CompanionExpression> = {
  home: {
    tone: "still",
    mood: "quiet",
    breathSeconds: 5.8,
    glowStrength: 0.34,
    tiltDegrees: 0,
    pulseScale: 1.015,
    warmth: 0.48,
    restraint: 0.82,
    whisper: true,
    silenceHint: "quiet_return",
  },
  lifemap: {
    tone: "wonder",
    mood: "curious",
    breathSeconds: 4.8,
    glowStrength: 0.52,
    tiltDegrees: -2,
    pulseScale: 1.028,
    warmth: 0.62,
    restraint: 0.62,
    whisper: false,
    silenceHint: "observing_map",
  },
  focus: {
    tone: "steady",
    mood: "reflective",
    breathSeconds: 5.6,
    glowStrength: 0.48,
    tiltDegrees: 1.5,
    pulseScale: 1.02,
    warmth: 0.66,
    restraint: 0.74,
    whisper: true,
    silenceHint: "holding_memory",
  },
  replay: {
    tone: "steady",
    mood: "grounding",
    breathSeconds: 6.4,
    glowStrength: 0.44,
    tiltDegrees: 0,
    pulseScale: 1.014,
    warmth: 0.58,
    restraint: 0.88,
    whisper: true,
    silenceHint: "staying_close",
  },
  mirror: {
    tone: "warm",
    mood: "reflective",
    breathSeconds: 5.2,
    glowStrength: 0.62,
    tiltDegrees: -1,
    pulseScale: 1.024,
    warmth: 0.78,
    restraint: 0.7,
    whisper: false,
    silenceHint: "seeing_arc",
  },
  recovery: {
    tone: "relief",
    mood: "celebratory",
    breathSeconds: 4.4,
    glowStrength: 0.72,
    tiltDegrees: -3,
    pulseScale: 1.036,
    warmth: 0.84,
    restraint: 0.54,
    whisper: false,
    silenceHint: "soft_celebration",
  },
  shadow: {
    tone: "protectiveQuiet",
    mood: "protective",
    breathSeconds: 7.2,
    glowStrength: 0.3,
    tiltDegrees: 2,
    pulseScale: 1.008,
    warmth: 0.52,
    restraint: 0.94,
    whisper: true,
    silenceHint: "gentle_guard",
  },
  dream: {
    tone: "wonder",
    mood: "curious",
    breathSeconds: 5.9,
    glowStrength: 0.58,
    tiltDegrees: -4,
    pulseScale: 1.03,
    warmth: 0.6,
    restraint: 0.68,
    whisper: false,
    silenceHint: "symbol_listening",
  },
  relationship: {
    tone: "softConcern",
    mood: "concerned",
    breathSeconds: 6.1,
    glowStrength: 0.46,
    tiltDegrees: 3,
    pulseScale: 1.018,
    warmth: 0.68,
    restraint: 0.82,
    whisper: true,
    silenceHint: "holding_connection",
  },
  threshold: {
    tone: "mourning",
    mood: "grounding",
    breathSeconds: 7.8,
    glowStrength: 0.28,
    tiltDegrees: 0,
    pulseScale: 1.006,
    warmth: 0.55,
    restraint: 0.98,
    whisper: true,
    silenceHint: "map_small",
  },
};

export function companionExpressionFor(context: CompanionContext, state?: CompanionState): CompanionExpression {
  const base = expressionByContext[context];
  const silencePreference = state?.silencePreference ?? 0.35;
  const trustLevel = state?.trustLevel ?? 0.45;

  return {
    ...base,
    glowStrength: Math.max(0.18, Math.min(0.9, base.glowStrength + trustLevel * 0.08 - silencePreference * 0.1)),
    warmth: Math.max(0.2, Math.min(1, base.warmth + trustLevel * 0.1)),
    restraint: Math.max(0.35, Math.min(1, base.restraint + silencePreference * 0.12)),
    whisper: base.whisper || silencePreference > 0.72,
  };
}

export function emotionalizeCompanionLine(text: string, expression: CompanionExpression): string {
  if (expression.tone === "protectiveQuiet" || expression.tone === "mourning") {
    return text.length > 72 ? text.slice(0, 69).trimEnd() + "..." : text;
  }

  if (expression.tone === "relief" && !/[.!?]$/.test(text)) return `${text}.`;

  return text;
}
