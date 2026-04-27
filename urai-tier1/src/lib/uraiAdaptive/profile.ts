import type { UraiAdaptiveOutput, UraiAdaptiveProfile, UraiAdaptiveSignal } from "./types";

const EMPTY_COUNTS: Record<string, number> = {};

export function createDefaultAdaptiveProfile(): UraiAdaptiveProfile {
  return {
    version: 1,
    totalSignals: 0,
    phaseCounts: {},
    toneCounts: {},
    arcCounts: {},
    memoryTypeCounts: {},
    companionModeCounts: {},
    preferredNarratorTempo: "balanced",
    preferredCompanionMode: "witness",
    dominantTone: "neutral",
    dominantArc: "mixed_field",
    updatedAt: Date.now(),
  };
}

function addCount(counts: Record<string, number>, key: string | null | undefined): Record<string, number> {
  if (!key) return counts;
  return {
    ...counts,
    [key]: (counts[key] ?? 0) + 1,
  };
}

function topKey(counts: Record<string, number>, fallback: string): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) return fallback;
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

export function updateAdaptiveProfile(
  profile: UraiAdaptiveProfile,
  signal: UraiAdaptiveSignal
): UraiAdaptiveProfile {
  const nextPhaseCounts = addCount(profile.phaseCounts ?? EMPTY_COUNTS, signal.phase);
  const nextToneCounts = addCount(profile.toneCounts ?? EMPTY_COUNTS, signal.selectedTone ?? "neutral");
  const nextArcCounts = addCount(profile.arcCounts ?? EMPTY_COUNTS, signal.dominantArc);
  const nextMemoryTypeCounts = addCount(profile.memoryTypeCounts ?? EMPTY_COUNTS, signal.selectedMemoryType ?? "none");
  const nextCompanionModeCounts = addCount(profile.companionModeCounts ?? EMPTY_COUNTS, signal.companionMode);

  const dominantTone = topKey(nextToneCounts, "neutral");
  const dominantArc = topKey(nextArcCounts, "mixed_field");
  const preferredCompanionMode = topKey(nextCompanionModeCounts, "witness") as UraiAdaptiveProfile["preferredCompanionMode"];

  const heavySignal = signal.memoryWeight >= 0.72 || signal.auraIntensity >= 0.72;
  const preferredNarratorTempo =
    dominantTone === "shadow" || dominantArc === "shadow_loop" || heavySignal
      ? "slow"
      : dominantTone === "bright" || dominantArc === "clarity_sequence"
        ? "direct"
        : "balanced";

  return {
    version: 1,
    totalSignals: profile.totalSignals + 1,
    phaseCounts: nextPhaseCounts,
    toneCounts: nextToneCounts,
    arcCounts: nextArcCounts,
    memoryTypeCounts: nextMemoryTypeCounts,
    companionModeCounts: nextCompanionModeCounts,
    preferredNarratorTempo,
    preferredCompanionMode,
    dominantTone,
    dominantArc,
    updatedAt: signal.timestamp,
  };
}

export function resolveAdaptiveOutput(profile: UraiAdaptiveProfile): UraiAdaptiveOutput {
  const narratorTempoMultiplier =
    profile.preferredNarratorTempo === "slow" ? 1.18 :
    profile.preferredNarratorTempo === "direct" ? 0.90 :
    1;

  const companionPresenceMultiplier =
    profile.preferredCompanionMode === "guardian" ? 1.12 :
    profile.preferredCompanionMode === "guide" ? 1.08 :
    profile.preferredCompanionMode === "idle" ? 0.86 :
    1;

  const visualSensitivityMultiplier =
    profile.dominantTone === "shadow" ? 0.88 :
    profile.dominantTone === "threshold" ? 0.94 :
    profile.dominantTone === "charged" ? 0.96 :
    profile.dominantTone === "bright" ? 1.04 :
    1;

  const adaptiveLine =
    profile.totalSignals < 3
      ? "Adaptive layer is calibrating."
      : "Adaptive layer is tuning narrator pace, companion presence, and visual sensitivity from repeated signals.";

  return {
    profile,
    narratorTempoMultiplier,
    companionPresenceMultiplier,
    visualSensitivityMultiplier,
    adaptiveLine,
  };
}
