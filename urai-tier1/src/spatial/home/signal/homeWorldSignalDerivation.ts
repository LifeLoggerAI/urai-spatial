import { sparseHomeWorldState } from "../homeWorldDefaults";
import type { HomeMoodState, HomeRecoveryState, HomeWorldState, HomeWorldTier } from "../homeWorldTypes";
import type {
  HomeWorldDerivationExplanation,
  HomeWorldSignalWindow,
  MoodRecoveryResult,
  NormalizedSignalPoint,
  SignalScoreBundle,
  SignalSourceName,
  StableHomeWorldDerivation,
  TierStabilityOptions,
} from "./homeWorldSignalTypes";

const SOURCES: SignalSourceName[] = ["sleep", "stress", "movement", "socialWarmth", "rituals", "memory", "audioTone", "location", "streaks"];

const DEFAULT_OPTIONS: TierStabilityOptions = {
  upgradeMargin: 6,
  downgradeMargin: 14,
  minConfidenceForUpgrade: 0.62,
  minConfidenceForDowngrade: 0.78,
  maxTierStepPerRun: 1,
};

function clamp(value: number | undefined, fallback: number, min = 0, max = 100) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number | undefined, fallback = 0.5) {
  return clamp(value, fallback, 0, 1);
}

function iso(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function weightedAverage(points: NormalizedSignalPoint[], fallback: number) {
  const usable = points.filter((point) => Number.isFinite(point.value));
  if (!usable.length) return { value: fallback, confidence: 0.25 };
  const totalWeight = usable.reduce((sum, point) => sum + clamp01(point.confidence, 0.4), 0);
  const value = usable.reduce((sum, point) => sum + clamp(point.value, fallback) * clamp01(point.confidence, 0.4), 0) / Math.max(0.001, totalWeight);
  const confidence = Math.min(1, totalWeight / Math.max(1, usable.length));
  return { value, confidence };
}

function collect(window: HomeWorldSignalWindow, source: SignalSourceName, fallback: number) {
  const direct = weightedAverage(window.points.filter((point) => point.source === source), fallback);
  const seven = clamp(window.sevenDay?.[source], direct.value);
  const thirty = clamp(window.thirtyDay?.[source], seven);
  const value = direct.value * 0.42 + seven * 0.38 + thirty * 0.2;
  const confidence = Math.min(1, direct.confidence * 0.62 + (window.sevenDay?.[source] == null ? 0.05 : 0.24) + (window.thirtyDay?.[source] == null ? 0.03 : 0.14));
  return { value, confidence };
}

function normalizeSignals(window: HomeWorldSignalWindow): SignalScoreBundle {
  const values = Object.fromEntries(SOURCES.map((source) => [source, collect(window, source, 50)])) as Record<SignalSourceName, { value: number; confidence: number }>;
  const confidence = SOURCES.reduce((sum, source) => sum + values[source].confidence, 0) / SOURCES.length;
  return {
    sleep: values.sleep.value,
    stress: values.stress.value,
    movement: values.movement.value,
    socialWarmth: values.socialWarmth.value,
    rituals: values.rituals.value,
    memory: values.memory.value,
    audioTone: values.audioTone.value,
    location: values.location.value,
    streaks: values.streaks.value,
    confidence,
  };
}

function scoreToRawTier(score: number): HomeWorldTier {
  if (score >= 82) return 5;
  if (score >= 64) return 4;
  if (score >= 43) return 3;
  if (score >= 24) return 2;
  return 1;
}

function tierThreshold(tier: HomeWorldTier) {
  return { 1: 0, 2: 24, 3: 43, 4: 64, 5: 82 }[tier];
}

function stabilizeTier(rawScore: number, previous: HomeWorldTier, confidence: number, options: TierStabilityOptions): HomeWorldTier {
  const rawTier = scoreToRawTier(rawScore);
  if (rawTier === previous) return previous;

  if (rawTier > previous) {
    const required = tierThreshold(Math.min(5, previous + 1) as HomeWorldTier) + options.upgradeMargin;
    if (confidence < options.minConfidenceForUpgrade || rawScore < required) return previous;
    return Math.min(5, previous + options.maxTierStepPerRun) as HomeWorldTier;
  }

  const requiredDropBelow = tierThreshold(previous) - options.downgradeMargin;
  if (confidence < options.minConfidenceForDowngrade || rawScore > requiredDropBelow) return previous;
  return Math.max(1, previous - options.maxTierStepPerRun) as HomeWorldTier;
}

function deriveMoodRecovery(signals: SignalScoreBundle): MoodRecoveryResult {
  const calmScore = (100 - signals.stress) * 0.34 + signals.sleep * 0.18 + signals.audioTone * 0.22 + signals.location * 0.12 + signals.socialWarmth * 0.14;
  const recoveryScore = signals.sleep * 0.24 + signals.movement * 0.2 + signals.rituals * 0.22 + signals.streaks * 0.18 + (100 - signals.stress) * 0.16;
  const joyScore = signals.socialWarmth * 0.3 + signals.audioTone * 0.26 + signals.streaks * 0.18 + signals.movement * 0.14 + signals.rituals * 0.12;
  const dreamScore = signals.sleep * 0.42 + signals.memory * 0.28 + signals.audioTone * 0.16 + signals.location * 0.14;
  const shadowScore = signals.stress * 0.46 + (100 - signals.sleep) * 0.24 + (100 - signals.socialWarmth) * 0.14 + signals.memory * 0.16;
  const focusScore = signals.movement * 0.18 + signals.sleep * 0.22 + (100 - signals.stress) * 0.32 + signals.streaks * 0.28;

  let moodState: HomeMoodState = "calm";
  const contenders: Array<[HomeMoodState, number]> = [
    ["joy", joyScore],
    ["dream", dreamScore],
    ["shadow", shadowScore],
    ["focused", focusScore],
    ["recovery", recoveryScore],
    ["calm", calmScore],
  ];
  const top = contenders.sort((a, b) => b[1] - a[1])[0];
  moodState = top[0];
  if (top[1] < 48) moodState = "low";

  let recoveryState: HomeRecoveryState = "dormant";
  if (recoveryScore >= 84) recoveryState = "awakened";
  else if (recoveryScore >= 66) recoveryState = "growing";
  else if (recoveryScore >= 48) recoveryState = "stable";
  else if (recoveryScore >= 28) recoveryState = "recovering";

  return { moodState, recoveryState, moodScore: top[1], recoveryScore };
}

function ceremonyFor(previous: HomeWorldState, next: HomeWorldState): StableHomeWorldDerivation["ceremonyType"] {
  const maxPrevious = Math.max(previous.groundTier, previous.orbTier, previous.skyTier);
  const maxNext = Math.max(next.groundTier, next.orbTier, next.skyTier);
  if (maxNext <= maxPrevious) return undefined;
  if (maxNext === 2) return "first-sprout";
  if (maxNext === 3) return "root-awakening";
  if (maxNext === 4) return "bloom-path";
  if (maxNext === 5) return "ecosystem-awakening";
  return undefined;
}

function explain(field: HomeWorldDerivationExplanation["field"], value: unknown, confidence: number, reason: string, sourceSignals: SignalSourceName[]): HomeWorldDerivationExplanation {
  return {
    field,
    value,
    confidence,
    reason,
    sourceSignals,
    privacySafeSummary: reason.replace(/stress/gi, "heavier signals").replace(/diagnosis/gi, "label"),
  };
}

export function deriveStableHomeWorldStateFromSignals(window: HomeWorldSignalWindow, options: Partial<TierStabilityOptions> = {}): StableHomeWorldDerivation {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const previous = window.previousState ?? { ...sparseHomeWorldState, userId: window.userId };
  const signals = normalizeSignals(window);
  const confidence = clamp01(signals.confidence, 0.45);

  const groundScore = signals.rituals * 0.22 + signals.movement * 0.2 + signals.streaks * 0.18 + signals.memory * 0.16 + signals.sleep * 0.14 + (100 - signals.stress) * 0.1;
  const orbScore = signals.audioTone * 0.24 + signals.socialWarmth * 0.22 + signals.rituals * 0.16 + signals.memory * 0.12 + signals.streaks * 0.14 + (100 - signals.stress) * 0.12;
  const skyScore = signals.sleep * 0.24 + (100 - signals.stress) * 0.24 + signals.audioTone * 0.18 + signals.location * 0.14 + signals.memory * 0.12 + signals.socialWarmth * 0.08;
  const moodRecovery = deriveMoodRecovery(signals);
  const now = iso(window.now);

  const state: HomeWorldState = {
    ...previous,
    userId: window.userId,
    groundTier: stabilizeTier(groundScore, previous.groundTier, confidence, opts),
    orbTier: stabilizeTier(orbScore, previous.orbTier, confidence, opts),
    skyTier: stabilizeTier(skyScore, previous.skyTier, confidence, opts),
    moodState: moodRecovery.moodState,
    recoveryState: moodRecovery.recoveryState,
    energyScore: Math.round(orbScore * 0.36 + groundScore * 0.32 + skyScore * 0.32),
    narratorSpeaking: false,
    skyWeatherIntensity: clamp(skyScore / 100, previous.skyWeatherIntensity, 0, 1),
    groundGrowthIntensity: clamp(groundScore / 100, previous.groundGrowthIntensity, 0, 1),
    orbPulseIntensity: clamp(orbScore / 100, previous.orbPulseIntensity, 0, 1),
    rawScores: { ground: groundScore, orb: orbScore, sky: skyScore },
    smoothedScores: { ground: groundScore, orb: orbScore, sky: skyScore },
    confidence: { overall: confidence, ground: confidence, orb: confidence, sky: confidence, label: confidence >= 0.7 ? "high" : confidence >= 0.45 ? "medium" : "low" },
    sourceCoverage: { ground: confidence, orb: confidence, sky: confidence },
    lastDerivedAt: now,
    lastMoodShiftAt: previous.moodState !== moodRecovery.moodState ? now : previous.lastMoodShiftAt,
    lastRecoveryBloomAt: previous.recoveryState !== moodRecovery.recoveryState && ["growing", "awakened"].includes(moodRecovery.recoveryState) ? now : previous.lastRecoveryBloomAt,
    lastTierUpgradeAt: Math.max(previous.groundTier, previous.orbTier, previous.skyTier) < Math.max(scoreToRawTier(groundScore), scoreToRawTier(orbScore), scoreToRawTier(skyScore)) ? now : previous.lastTierUpgradeAt,
    updatedAt: now,
  };

  const ceremonyType = ceremonyFor(previous, state);
  const upgradeEligible = Boolean(ceremonyType && confidence >= opts.minConfidenceForUpgrade);
  const shouldHoldTier = state.groundTier === previous.groundTier && state.orbTier === previous.orbTier && state.skyTier === previous.skyTier;

  return {
    state,
    explanations: [
      explain("groundTier", state.groundTier, confidence, "Ground changed from recovery routines, movement rhythm, streak consistency, memory density, sleep, and lighter heavy signals.", ["rituals", "movement", "streaks", "memory", "sleep", "stress"]),
      explain("orbTier", state.orbTier, confidence, "Orb changed from voice tone, social warmth, ritual signal, memory signal, streaks, and overall heaviness.", ["audioTone", "socialWarmth", "rituals", "memory", "streaks", "stress"]),
      explain("skyTier", state.skyTier, confidence, "Sky changed from sleep rhythm, heaviness, tone, location context, memory activity, and social warmth.", ["sleep", "stress", "audioTone", "location", "memory", "socialWarmth"]),
      explain("moodState", state.moodState, confidence, "Mood weather is a soft symbolic summary of recent rhythm, tone, rest, social warmth, and recovery signals.", ["sleep", "stress", "audioTone", "socialWarmth", "movement"]),
      explain("overall", state.energyScore, confidence, "The world uses gradual tier changes with confidence gates so it does not jump because of one isolated signal.", SOURCES),
    ],
    confidence,
    upgradeEligible,
    ceremonyType,
    shouldHoldTier,
    debugScores: { groundScore, orbScore, skyScore, moodScore: moodRecovery.moodScore, recoveryScore: moodRecovery.recoveryScore, confidence },
  };
}
