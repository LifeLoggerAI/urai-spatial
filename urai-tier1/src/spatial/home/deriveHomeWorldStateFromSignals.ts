import { sparseHomeWorldState } from "./homeWorldDefaults";
import type {
  DerivedHomeWorldState,
  ExplainableContribution,
  HomeMoodState,
  HomeRecoveryState,
  HomeWorldConfidenceSnapshot,
  HomeWorldSignalKey,
  HomeWorldSignals,
  HomeWorldState,
  HomeWorldTier,
} from "./homeWorldTypes";

export type HomeWorldSignalInput = HomeWorldSignals;

const THRESHOLDS = [22, 42, 66, 84] as const;
const UP_MARGIN = 4;
const DOWN_MARGIN = 8;
const CHANNELS = ["ground", "orb", "sky"] as const;
type Channel = (typeof CHANNELS)[number];

type WeightedSignal = { signal: HomeWorldSignalKey; weight: number };

const WEIGHTS: Record<Channel, WeightedSignal[]> = {
  ground: [
    { signal: "recoveryScore", weight: 0.28 },
    { signal: "ritualCount", weight: 0.18 },
    { signal: "memoryCount", weight: 0.14 },
    { signal: "movementScore", weight: 0.12 },
    { signal: "sleepScore", weight: 0.1 },
    { signal: "socialWarmthScore", weight: 0.06 },
    { signal: "lifeEventIntensity", weight: 0.05 },
    { signal: "recentStress", weight: -0.07 },
  ],
  orb: [
    { signal: "energyScore", weight: 0.28 },
    { signal: "moodScore", weight: 0.18 },
    { signal: "recoveryScore", weight: 0.12 },
    { signal: "socialWarmthScore", weight: 0.1 },
    { signal: "focusScore", weight: 0.1 },
    { signal: "ritualCount", weight: 0.06 },
    { signal: "movementScore", weight: 0.06 },
    { signal: "recentStress", weight: -0.1 },
  ],
  sky: [
    { signal: "moodScore", weight: 0.24 },
    { signal: "sleepScore", weight: 0.14 },
    { signal: "recentStress", weight: -0.18 },
    { signal: "energyScore", weight: 0.1 },
    { signal: "socialWarmthScore", weight: 0.08 },
    { signal: "lifeEventIntensity", weight: 0.12 },
    { signal: "calmScore", weight: 0.08 },
    { signal: "shadowScore", weight: -0.06 },
  ],
};

const HALF_LIVES_HOURS: Partial<Record<HomeWorldSignalKey, number>> = {
  moodScore: 12,
  energyScore: 12,
  recentStress: 12,
  movementScore: 12,
  sleepScore: 24,
  socialWarmthScore: 72,
  ritualCount: 168,
  memoryCount: 168,
  lifeEventIntensity: 168,
};

const LABELS: Record<HomeWorldSignalKey, string> = {
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

export function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number) {
  return clamp(value, 0, 1);
}

export function countToScore(count: number, saturationPoint: number) {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return clamp((1 - Math.exp(-count / saturationPoint)) * 100);
}

function toTime(value: unknown, fallback: number) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function freshnessFactor(updatedAt: unknown, now: unknown, halfLifeHours = 24) {
  const nowMs = toTime(now, Date.now());
  const updatedMs = toTime(updatedAt, nowMs);
  const ageHours = Math.max(0, (nowMs - updatedMs) / 36e5);
  return clamp01(Math.pow(0.5, ageHours / halfLifeHours));
}

export function weightedMean(parts: Array<{ value: number; weight: number }>, fallback = 0) {
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight <= 0) return fallback;
  return parts.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight;
}

export function ema(previous: number | undefined, current: number, alpha: number) {
  if (typeof previous !== "number" || !Number.isFinite(previous)) return current;
  return previous * (1 - alpha) + current * alpha;
}

export function tierFromScore(score: number): HomeWorldTier {
  if (score >= THRESHOLDS[3]) return 5;
  if (score >= THRESHOLDS[2]) return 4;
  if (score >= THRESHOLDS[1]) return 3;
  if (score >= THRESHOLDS[0]) return 2;
  return 1;
}

export function applyHysteresis(score: number, previousTier: HomeWorldTier | undefined, confidence: number): HomeWorldTier {
  const directTier = tierFromScore(score);
  if (!previousTier) return directTier;
  if (confidence < 0.45 && Math.abs(directTier - previousTier) < 2) return previousTier;
  if (directTier === previousTier) return previousTier;

  if (directTier > previousTier) {
    const threshold = THRESHOLDS[previousTier - 1];
    return score >= threshold + UP_MARGIN ? directTier : previousTier;
  }

  const threshold = THRESHOLDS[Math.max(0, previousTier - 2)];
  return score < threshold - DOWN_MARGIN ? directTier : previousTier;
}

function confidenceLabel(overall: number): HomeWorldConfidenceSnapshot["label"] {
  if (overall >= 0.7) return "high";
  if (overall >= 0.45) return "medium";
  return "low";
}

function bucket(value: number): "low" | "medium" | "high" {
  if (value >= 67) return "high";
  if (value >= 34) return "medium";
  return "low";
}

function confidenceBucket(value: number): "low" | "medium" | "high" {
  if (value >= 0.7) return "high";
  if (value >= 0.45) return "medium";
  return "low";
}

function freshnessBucket(value: number): "fresh" | "recent" | "fading" | "stale" {
  if (value >= 0.78) return "fresh";
  if (value >= 0.52) return "recent";
  if (value >= 0.25) return "fading";
  return "stale";
}

function readValue(input: HomeWorldSignals, signal: HomeWorldSignalKey) {
  const direct = input.values?.[signal] ?? input[signal];
  if (typeof direct === "number") return direct;
  if (signal === "sleepScore" && typeof input.sleepQuality === "number") return input.sleepQuality;
  if (signal === "movementScore" && typeof input.motionStability === "number") return input.motionStability;
  if (signal === "socialWarmthScore" && typeof input.socialWarmth === "number") return input.socialWarmth;
  return undefined;
}

function normalizedValue(input: HomeWorldSignals, signal: HomeWorldSignalKey) {
  const value = readValue(input, signal);
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (signal === "ritualCount") return countToScore(value, 4);
  if (signal === "memoryCount") return countToScore(value, 10);
  return clamp(value);
}

function effectiveConfidence(input: HomeWorldSignals, signal: HomeWorldSignalKey) {
  return clamp01(input.confidence?.[signal] ?? input.confidence?.overall ?? 0.7);
}

function enabledGate(input: HomeWorldSignals, signal: HomeWorldSignalKey) {
  return input.enabledSources?.[signal] === false ? 0 : 1;
}

function signalUpdatedAt(input: HomeWorldSignals, signal: HomeWorldSignalKey) {
  return input.updatedAt?.[signal] ?? input.now;
}

function scoreChannel(channel: Channel, input: HomeWorldSignals, now: string) {
  const parts: Array<{ value: number; weight: number }> = [];
  const contributors: ExplainableContribution[] = [];
  let possibleWeight = 0;
  let effectiveWeightTotal = 0;

  for (const weighted of WEIGHTS[channel]) {
    const raw = normalizedValue(input, weighted.signal);
    possibleWeight += Math.abs(weighted.weight);
    if (raw === undefined) continue;

    const confidence = effectiveConfidence(input, weighted.signal);
    const freshness = freshnessFactor(signalUpdatedAt(input, weighted.signal), now, HALF_LIVES_HOURS[weighted.signal] ?? 24);
    const gate = enabledGate(input, weighted.signal);
    const effectiveWeight = Math.abs(weighted.weight) * confidence * freshness * gate;
    if (effectiveWeight <= 0) continue;

    const value = weighted.weight < 0 ? 100 - raw : raw;
    parts.push({ value, weight: effectiveWeight });
    effectiveWeightTotal += effectiveWeight;
    contributors.push({
      signal: weighted.signal,
      channel,
      direction: weighted.weight < 0 ? "softens" : value >= 55 ? "lifts" : "steadies",
      weight: Math.round(effectiveWeight * 100) / 100,
      scoreBucket: bucket(value),
      confidenceBucket: confidenceBucket(confidence),
      freshnessBucket: freshnessBucket(freshness),
      summary: `${LABELS[weighted.signal]} ${weighted.weight < 0 ? "softened" : "shaped"} the ${channel} channel with ${bucket(value)} strength.`,
    });
  }

  const fallback = sparseHomeWorldState.rawScores?.[channel] ?? 30;
  const rawScore = clamp(weightedMean(parts, fallback));
  const coverage = possibleWeight > 0 ? clamp01(effectiveWeightTotal / possibleWeight) : 0;
  const confidence = clamp01(coverage);
  return { rawScore, coverage, confidence, contributors };
}

function moodFromState(scores: { sky: number; orb: number }, input: HomeWorldSignals): HomeMoodState {
  const stress = normalizedValue(input, "recentStress") ?? 38;
  const lifeEvent = normalizedValue(input, "lifeEventIntensity") ?? 20;
  const sleep = normalizedValue(input, "sleepScore") ?? 55;
  if (lifeEvent > 78 && stress > 62) return "shadow";
  if (scores.sky > 68 && scores.orb > 62) return "joy";
  if (sleep > 72 && lifeEvent > 48) return "dream";
  if (scores.orb > 58 && stress < 38) return "focused";
  if (scores.sky < 34 && scores.orb < 42) return "low";
  if (scores.sky >= 48 && stress < 58) return "recovery";
  return "calm";
}

function recoveryFromScore(score: number): HomeRecoveryState {
  if (score >= 84) return "awakened";
  if (score >= 64) return "growing";
  if (score >= 44) return "stable";
  if (score >= 22) return "recovering";
  return "dormant";
}

function roundScore(value: number) {
  return Math.round(clamp(value) * 10) / 10;
}

export function deriveHomeWorldStateFromSignals(input: HomeWorldSignals): DerivedHomeWorldState {
  const now = new Date(toTime(input.now, Date.now())).toISOString();
  const previous = input.previousState;

  const ground = scoreChannel("ground", input, now);
  const orb = scoreChannel("orb", input, now);
  const sky = scoreChannel("sky", input, now);
  const rawScores = {
    ground: roundScore(ground.rawScore),
    orb: roundScore(orb.rawScore),
    sky: roundScore(sky.rawScore),
  };
  const overall = clamp01((ground.confidence + orb.confidence + sky.confidence) / 3);
  const confidence: HomeWorldConfidenceSnapshot = {
    ground: clamp01(ground.confidence),
    orb: clamp01(orb.confidence),
    sky: clamp01(sky.confidence),
    overall,
    label: confidenceLabel(overall),
  };
  const alpha = previous ? clamp01(0.18 + 0.22 * confidence.overall) : 1;
  const smoothedScores = {
    ground: roundScore(ema(previous?.smoothedScores?.ground ?? previous?.rawScores?.ground, rawScores.ground, alpha)),
    orb: roundScore(ema(previous?.smoothedScores?.orb ?? previous?.rawScores?.orb, rawScores.orb, alpha)),
    sky: roundScore(ema(previous?.smoothedScores?.sky ?? previous?.rawScores?.sky, rawScores.sky, alpha)),
  };

  const groundTier = applyHysteresis(smoothedScores.ground, previous?.groundTier, confidence.ground);
  const orbTier = applyHysteresis(smoothedScores.orb, previous?.orbTier, confidence.orb);
  const skyTier = applyHysteresis(smoothedScores.sky, previous?.skyTier, confidence.sky);
  const moodState = moodFromState({ sky: smoothedScores.sky, orb: smoothedScores.orb }, input);
  const recoveryState = recoveryFromScore(smoothedScores.ground);
  const createdAt = previous?.createdAt ?? now;

  const state = {
    ...sparseHomeWorldState,
    version: 3,
    userId: input.userId,
    groundTier,
    orbTier,
    skyTier,
    moodState,
    recoveryState,
    energyScore: roundScore(normalizedValue(input, "energyScore") ?? smoothedScores.orb),
    narratorSpeaking: Boolean(input.narratorSpeaking),
    skyWeatherIntensity: roundScore(smoothedScores.sky) / 100,
    groundGrowthIntensity: roundScore(smoothedScores.ground) / 100,
    orbPulseIntensity: roundScore(smoothedScores.orb) / 100,
    rawScores,
    smoothedScores,
    confidence,
    sourceCoverage: {
      ground: clamp01(ground.coverage),
      orb: clamp01(orb.coverage),
      sky: clamp01(sky.coverage),
    },
    lastDerivedAt: now,
    createdAt,
    updatedAt: now,
  } satisfies HomeWorldState & { version: 3 };

  return {
    state,
    contributors: {
      ground: ground.contributors.sort((a, b) => b.weight - a.weight).slice(0, 5),
      orb: orb.contributors.sort((a, b) => b.weight - a.weight).slice(0, 5),
      sky: sky.contributors.sort((a, b) => b.weight - a.weight).slice(0, 5),
    },
  };
}
