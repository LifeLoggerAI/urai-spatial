import type {
  DerivedHomeWorldState,
  HomeWorldExplanation,
  HomeWorldSignals,
  HomeWorldState,
} from "./homeWorldTypes";

const SIGNAL_LABELS: Record<string, string> = {
  moodScore: "mood pattern",
  recoveryScore: "recovery cues",
  energyScore: "energy rhythm",
  recentStress: "recent load",
  sleepScore: "rest rhythm",
  movementScore: "movement steadiness",
  socialWarmthScore: "social warmth",
  ritualCount: "ritual rhythm",
  memoryCount: "memory activity",
  lifeEventIntensity: "life-event intensity",
  focusScore: "focus rhythm",
  calmScore: "calm cues",
  shadowScore: "shadow load",
};

function pct(value: number | undefined) {
  return `${Math.round(Math.max(0, Math.min(1, value ?? 0)) * 100)}%`;
}

function topSummary(derived: DerivedHomeWorldState, channel: "ground" | "orb" | "sky") {
  const contributors = derived.contributors[channel] ?? [];
  if (!contributors.length) return "still gathering signal";
  return contributors
    .slice(0, 3)
    .map((item) => `${SIGNAL_LABELS[item.signal] ?? item.signal} (${item.scoreBucket}, confidence ${item.confidenceBucket})`)
    .join(", ");
}

function confidenceReasons(state: HomeWorldState) {
  const reasons: string[] = [];
  const confidence = state.confidence?.overall ?? 0.25;
  if (confidence < 0.45) {
    reasons.push("URAI is still gathering signal, so tier movement is intentionally gentle.");
  } else if (confidence < 0.7) {
    reasons.push("Recent derived patterns are visible, but older or missing sources still limit certainty.");
  } else {
    reasons.push("Several fresh derived sources are aligned, so the world can respond with more confidence.");
  }
  reasons.push(`Ground coverage ${pct(state.sourceCoverage?.ground)}, orb coverage ${pct(state.sourceCoverage?.orb)}, sky coverage ${pct(state.sourceCoverage?.sky)}.`);
  return reasons;
}

function enabledSourceSummary(input: HomeWorldSignals | undefined) {
  const enabled = Object.entries(input?.enabledSources ?? {})
    .filter(([, value]) => value !== false)
    .map(([key]) => SIGNAL_LABELS[key] ?? key);
  return enabled.length ? enabled : ["derived passive patterns"];
}

function headline(state: HomeWorldState) {
  if ((state.confidence?.overall ?? 0) < 0.45) return "Your world is still gathering signal.";
  if (state.groundTier >= 4 || state.orbTier >= 4 || state.skyTier >= 4) return "Your world is brightening.";
  if (state.groundTier <= 2 && state.skyTier <= 2) return "Your world is holding more weight today.";
  return "Your world is finding a steadier rhythm.";
}

export function explainHomeWorldState(
  state: HomeWorldState,
  derived?: DerivedHomeWorldState,
  input?: HomeWorldSignals,
): HomeWorldExplanation {
  const contributors = derived?.contributors ?? { ground: [], orb: [], sky: [] };
  const updatedAt = state.lastDerivedAt ?? state.updatedAt ?? new Date().toISOString();
  const enabled = enabledSourceSummary(input);
  const confidenceLabel = state.confidence?.label ?? "low";

  return {
    version: 3,
    userId: state.userId,
    headline: headline(state),
    summary:
      confidenceLabel === "low"
        ? "URAI is still gathering signal, so your Home World stays soft, sparse, and steady instead of overreacting."
        : "URAI blended recent derived patterns with stability rules so the Home World changes without flicker.",
    whyAmISeeingThis: [
      "Your world responds to derived patterns, not raw private media.",
      "Recent signals carry more weight than older ones.",
      "Tier changes use smoothing and hysteresis so the Home World does not jump around.",
    ],
    ground: `Ground is shaped by ${derived ? topSummary(derived, "ground") : "still gathering signal"}.`,
    orb: `Orb is shaped by ${derived ? topSummary(derived, "orb") : "still gathering signal"}.`,
    sky: `Sky is shaped by ${derived ? topSummary(derived, "sky") : "still gathering signal"}.`,
    mood:
      state.moodState === "shadow"
        ? "The mood layer looks clouded, so the sky holds a little more weight."
        : state.moodState === "recovery"
          ? "The mood layer is reading recovery cues and keeping the world steadier."
          : `The mood layer is ${state.moodState}, based only on derived pattern buckets.`,
    recovery:
      state.recoveryState === "dormant"
        ? "Recovery cues are quiet, so growth stays protected while URAI keeps gathering signal."
        : `Recovery is ${state.recoveryState}, so the ground reflects a steadier formation path.`,
    confidence: {
      label: confidenceLabel,
      reasons: confidenceReasons(state),
    },
    dataSources: {
      enabled,
      coverage: state.sourceCoverage ?? { ground: 0.25, orb: 0.25, sky: 0.25 },
      summary: `Using ${enabled.length} derived source bucket${enabled.length === 1 ? "" : "s"}; raw source payloads are not included here.`,
    },
    contributors,
    privacy: {
      rawSignalsStored: false,
      usedRawAudio: false,
      usedContactIdentity: false,
      note: "Derived only · private media is never stored",
    },
    updatedAt,
  };
}
