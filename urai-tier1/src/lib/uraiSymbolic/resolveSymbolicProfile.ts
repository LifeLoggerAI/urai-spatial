import type { EmotionalState, EmotionKey, Phase } from "@/lib/uraiEmotion/types";
import type { SymbolicVisualProfile } from "./types";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const HUE_SHIFT: Record<EmotionKey, number> = {
  calm: 205,
  joy: 42,
  grief: 230,
  anger: 8,
  fear: 265,
  focus: 185,
  awe: 285,
  loneliness: 215,
  hope: 120,
  overload: 330,
  neutral: 210,
};

export function resolveSymbolicProfile(
  emotion: EmotionalState,
  memoryWeight = 0.35,
  phase: Phase = "HOME"
): SymbolicVisualProfile {
  const phaseGain =
    phase === "REPLAY" ? 1.25 :
    phase === "FOCUS" ? 1 :
    phase === "LIFEMAP" ? 0.72 :
    phase === "ASCENT" ? 0.55 :
    0.35;

  const weight = clamp01(memoryWeight);
  const intensity = clamp01(emotion.intensity);
  const arousal = clamp01(emotion.arousal);
  const clarity = clamp01(emotion.clarity);
  const shadow = clamp01(1 - clarity);

  return {
    auraIntensity: clamp01((0.22 + intensity * 0.52 + weight * 0.26) * phaseGain),
    auraRadius: 0.8 + weight * 1.4 + intensity * 0.7,
    auraPulse: clamp01(0.18 + arousal * 0.55 + emotion.volatility * 0.27),
    particleDensity: clamp01((0.16 + intensity * 0.42 + shadow * 0.22 + weight * 0.2) * phaseGain),
    particleSpeed: clamp01(0.12 + arousal * 0.65 + emotion.volatility * 0.23),
    starGlow: clamp01(0.28 + weight * 0.5 + intensity * 0.22),
    starScale: 0.75 + weight * 0.8 + intensity * 0.25,
    fogDensity: clamp01(0.08 + shadow * 0.35 + (phase === "REPLAY" ? 0.22 : 0)),
    replayEnclosure: phase === "REPLAY" ? clamp01(0.35 + weight * 0.35 + intensity * 0.3) : 0,
    lightWarmth: emotion.valence > 0 ? clamp01(0.5 + emotion.valence * 0.5) : clamp01(0.5 + emotion.valence * 0.25),
    lightIntensity: clamp01(0.45 + intensity * 0.35 + clarity * 0.2),
    motionStillness: phase === "REPLAY" ? clamp01(0.4 + weight * 0.35 + clarity * 0.25) : clamp01(clarity * 0.4),
    colorGrade: {
      hueShift: HUE_SHIFT[emotion.primary] ?? 210,
      saturation: clamp01(0.55 + intensity * 0.25 - shadow * 0.12),
      contrast: clamp01(0.55 + weight * 0.25 + shadow * 0.15),
      exposure: clamp01(0.52 + emotion.valence * 0.12 - shadow * 0.08),
    },
  };
}
