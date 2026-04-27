import type { CrossModalSignal, EmotionKey, EmotionalState, SymbolicArchetype } from "./types";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const EMOTION_VECTOR: Record<EmotionKey, { valence: number; arousal: number; clarity: number }> = {
  calm: { valence: 0.45, arousal: 0.2, clarity: 0.85 },
  joy: { valence: 0.9, arousal: 0.65, clarity: 0.7 },
  grief: { valence: -0.75, arousal: 0.45, clarity: 0.35 },
  anger: { valence: -0.65, arousal: 0.9, clarity: 0.45 },
  fear: { valence: -0.8, arousal: 0.85, clarity: 0.25 },
  focus: { valence: 0.25, arousal: 0.5, clarity: 0.95 },
  awe: { valence: 0.65, arousal: 0.55, clarity: 0.75 },
  loneliness: { valence: -0.55, arousal: 0.35, clarity: 0.4 },
  hope: { valence: 0.7, arousal: 0.45, clarity: 0.65 },
  overload: { valence: -0.6, arousal: 1, clarity: 0.15 },
  neutral: { valence: 0, arousal: 0.25, clarity: 0.5 },
};

export function resolveEmotionalState(signals: CrossModalSignal[] = [], now = Date.now()): EmotionalState {
  const weighted = new Map<EmotionKey, number>();

  for (const signal of signals) {
    const age = Math.max(0, now - signal.timestamp);
    const halfLife = Math.max(1, signal.decayHalfLifeMs);
    const decay = Math.pow(0.5, age / halfLife);
    const score = clamp01(signal.confidence) * clamp01(signal.intensity) * decay;
    weighted.set(signal.emotion, (weighted.get(signal.emotion) ?? 0) + score);
  }

  if (weighted.size === 0) weighted.set("neutral", 0.65);

  const sorted = [...weighted.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0) || 1;

  const blends = sorted.slice(0, 4).map(([key, value]) => ({
    key,
    weight: clamp01(value / total),
  }));

  const primary = blends[0]?.key ?? "neutral";
  const secondary = blends[1]?.key;

  const valence = blends.reduce((sum, b) => sum + EMOTION_VECTOR[b.key].valence * b.weight, 0);
  const arousal = blends.reduce((sum, b) => sum + EMOTION_VECTOR[b.key].arousal * b.weight, 0);
  const clarity = blends.reduce((sum, b) => sum + EMOTION_VECTOR[b.key].clarity * b.weight, 0);

  const top = sorted[0]?.[1] ?? 0;
  const second = sorted[1]?.[1] ?? 0;
  const intensity = clamp01(total);
  const volatility = clamp01(1 - Math.abs(top - second));

  return {
    primary,
    secondary,
    blends,
    intensity,
    volatility,
    valence,
    arousal,
    clarity,
    symbolicWeight: clamp01(intensity * 0.55 + arousal * 0.3 + (1 - clarity) * 0.15),
    archetype: resolveArchetype(primary, valence, arousal, clarity),
    updatedAt: now,
  };
}

function resolveArchetype(primary: EmotionKey, valence: number, arousal: number, clarity: number): SymbolicArchetype {
  if (primary === "grief" || primary === "loneliness") return "Ghost";
  if (primary === "overload" || primary === "fear") return "Survivor";
  if (primary === "focus") return "Builder";
  if (primary === "hope") return "Phoenix";
  if (primary === "awe") return "Oracle";
  if (clarity > 0.8 && valence > 0.2) return "Seeker";
  if (arousal > 0.8 && valence < -0.2) return "Survivor";
  return "Wanderer";
}
