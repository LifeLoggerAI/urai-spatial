export type GroundTier = 1 | 2 | 3 | 4 | 5;
export type GroundRhythmState = "off-rhythm" | "overstimulated" | "stable" | "recovering" | "flow";

export type GroundSignalState = {
  moodScore?: number | null;
  rhythmState?: GroundRhythmState | string | null;
  recoveryScore?: number | null;
  vitalityScore?: number | null;
  symbolicIntensity?: number | null;
  shadowStress?: number | null;
  emotionalIntensity?: number | null;
};

export type GroundCinematicState = {
  tier: GroundTier;
  name: string;
  ariaLabel: string;
  glow: number;
  bloom: number;
  particleCount: number;
  breathSeconds: number;
  hue: string;
};

const clamp01 = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  const normalized = value > 1 ? value / 100 : value;
  return Math.max(0, Math.min(1, normalized));
};

export function resolveGroundTier(state: GroundSignalState = {}): GroundTier {
  const mood = clamp01(state.moodScore, 0.56);
  const recovery = clamp01(state.recoveryScore, 0.54);
  const vitality = clamp01(state.vitalityScore, 0.54);
  const symbolic = clamp01(state.symbolicIntensity, 0.42);
  const shadow = clamp01(state.shadowStress, 0.28);
  const emotional = clamp01(state.emotionalIntensity, 0.5);
  const rhythm = String(state.rhythmState ?? "stable").toLowerCase();

  const rhythmBonus = rhythm === "flow" ? 0.18 : rhythm === "stable" ? 0.08 : rhythm === "recovering" ? 0.04 : rhythm === "overstimulated" ? -0.1 : rhythm === "off-rhythm" ? -0.18 : 0;
  const score = mood * 0.2 + recovery * 0.24 + vitality * 0.24 + symbolic * 0.12 + emotional * 0.08 + (1 - shadow) * 0.12 + rhythmBonus;

  if (score >= 0.86 && symbolic >= 0.72 && recovery >= 0.78 && vitality >= 0.78 && shadow <= 0.32) return 5;
  if (score >= 0.68 && recovery >= 0.62 && vitality >= 0.6 && shadow <= 0.5) return 4;
  if (score >= 0.46 && shadow <= 0.72) return 3;
  if (score >= 0.3 || rhythm === "recovering") return 2;
  return 1;
}

export function cinematicGroundFor(state: GroundSignalState = {}, forcedTier?: GroundTier | null): GroundCinematicState {
  const tier = forcedTier ?? resolveGroundTier(state);
  const map: Record<GroundTier, GroundCinematicState> = {
    1: { tier: 1, name: "dormant", ariaLabel: "Ground tier one dormant", glow: 0.18, bloom: 0, particleCount: 10, breathSeconds: 12, hue: "34 40 44" },
    2: { tier: 2, name: "sprout", ariaLabel: "Ground tier two sprout", glow: 0.28, bloom: 0.16, particleCount: 16, breathSeconds: 10, hue: "58 92 68" },
    3: { tier: 3, name: "rooted", ariaLabel: "Ground tier three rooted stable", glow: 0.42, bloom: 0.34, particleCount: 22, breathSeconds: 8, hue: "72 130 84" },
    4: { tier: 4, name: "blooming", ariaLabel: "Ground tier four blooming", glow: 0.62, bloom: 0.7, particleCount: 34, breathSeconds: 6, hue: "92 174 104" },
    5: { tier: 5, name: "mythic", ariaLabel: "Ground tier five mythic", glow: 0.9, bloom: 1, particleCount: 52, breathSeconds: 5, hue: "154 255 190" }
  };
  return map[tier];
}

export const GROUND_PREVIEW_STATES: Record<GroundTier, GroundSignalState> = {
  1: { moodScore: 20, rhythmState: "off-rhythm", recoveryScore: 18, vitalityScore: 22, symbolicIntensity: 20, shadowStress: 84, emotionalIntensity: 36 },
  2: { moodScore: 40, rhythmState: "recovering", recoveryScore: 42, vitalityScore: 38, symbolicIntensity: 35, shadowStress: 58, emotionalIntensity: 42 },
  3: { moodScore: 58, rhythmState: "stable", recoveryScore: 56, vitalityScore: 57, symbolicIntensity: 45, shadowStress: 34, emotionalIntensity: 50 },
  4: { moodScore: 78, rhythmState: "flow", recoveryScore: 74, vitalityScore: 76, symbolicIntensity: 62, shadowStress: 24, emotionalIntensity: 72 },
  5: { moodScore: 94, rhythmState: "flow", recoveryScore: 92, vitalityScore: 94, symbolicIntensity: 90, shadowStress: 10, emotionalIntensity: 88 }
};
