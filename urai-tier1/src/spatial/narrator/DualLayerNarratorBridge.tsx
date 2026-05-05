"use client";

import { useEffect, useRef } from "react";

type NarratorCue = {
  event?: string;
  script?: string;
  starId?: string | null;
  title?: string | null;
  tone?: string | null;
  symbolicWeight?: string | null;
  timing?: {
    delayMs?: number;
    durationMs?: number;
  };
};

type StarMemory = {
  visits: number;
  firstSeenAt: number;
  lastSeenAt: number;
  tones: Record<string, number>;
  weights: Record<string, number>;
};

type PathStep = {
  starId: string;
  tone: string;
  weight: string;
  seenAt: number;
};

type MemoryHistory = Record<string, StarMemory>;

type PathHistory = {
  recent: PathStep[];
  transitions: Record<string, number>;
  toneTransitions: Record<string, number>;
};

type EmotionalTrajectory = {
  scoreDelta: number;
  direction: "rising" | "falling" | "stable" | "mixed";
  startTone: string | null;
  endTone: string | null;
  stuckTone: string | null;
  recoveryArc: boolean;
  strainArc: boolean;
};

type PredictiveIntervention = {
  predictedDirection: "recovery" | "strain" | "loop" | "stable" | "uncertain";
  confidence: number;
  suggestion: "pause" | "stay" | "soften" | "continue" | "notice";
  phrase: string;
};

type TrustDecision = {
  shouldSpeak: boolean;
  reason: "needed" | "low-confidence" | "user-improving" | "recently-spoke" | "quiet-mode";
  silenceMs: number;
  trustScore: number;
};

type CompanionIdentity = {
  id: string;
  name: string;
  archetype: "Witness" | "Guide" | "Mirror" | "Guardian";
  temperament: "quiet" | "reflective" | "direct" | "warm";
  familiarity: number;
  restraint: number;
  warmth: number;
  directness: number;
  createdAt: number;
  updatedAt: number;
};

type ContinuityMemory = {
  chapter: "Opening" | "Return" | "Loop" | "Recovery" | "Threshold";
  lastCallbackAt: number | null;
  callbackCount: number;
  longArc: "unknown" | "softening" | "tightening" | "circling" | "lifting";
};

type InterventionLearningState = {
  intensity: number;
  trustScore: number;
  quietUntil: number | null;
  companion: CompanionIdentity;
  continuity: ContinuityMemory;
  exposures: number;
  lastSuggestion: PredictiveIntervention["suggestion"] | null;
  lastPredictedDirection: PredictiveIntervention["predictedDirection"] | null;
  lastTone: string | null;
  lastScore: number | null;
  lastSeenAt: number | null;
  lastSpokeAt: number | null;
  outcomes: Array<{
    seenAt: number;
    suggestion: PredictiveIntervention["suggestion"];
    predictedDirection: PredictiveIntervention["predictedDirection"];
    tone: string;
    score: number;
    outcome: "improved" | "worsened" | "looped" | "held" | "unknown";
    intensity: number;
  }>;
};

const STORAGE_KEY = "urai:lifemap:memory-history:v1";
const PATH_STORAGE_KEY = "urai:lifemap:path-history:v1";
const LEARNING_STORAGE_KEY = "urai:lifemap:intervention-learning:v1";
const MAX_RECENT_PATH = 12;
const MAX_OUTCOMES = 24;

const TONE_SCORE: Record<string, number> = {
  grief: -3,
  tension: -2,
  charged: -2,
  neutral: 0,
  calm: 1,
  awe: 1,
  hope: 2,
  recovery: 3,
};

function now() {
  return Date.now();
}

function defaultCompanion(): CompanionIdentity {
  const t = now();
  return {
    id: "urai-companion-v1",
    name: "Aster",
    archetype: "Witness",
    temperament: "quiet",
    familiarity: 0.08,
    restraint: 0.72,
    warmth: 0.42,
    directness: 0.22,
    createdAt: t,
    updatedAt: t,
  };
}

function defaultContinuity(): ContinuityMemory {
  return {
    chapter: "Opening",
    lastCallbackAt: null,
    callbackCount: 0,
    longArc: "unknown",
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can fail in private browsing or quota pressure. Narration still works without persistence.
  }
}

function readHistory(): MemoryHistory {
  return readJson<MemoryHistory>(STORAGE_KEY, {});
}

function writeHistory(history: MemoryHistory) {
  writeJson(STORAGE_KEY, history);
}

function readPathHistory(): PathHistory {
  return readJson<PathHistory>(PATH_STORAGE_KEY, {
    recent: [],
    transitions: {},
    toneTransitions: {},
  });
}

function writePathHistory(history: PathHistory) {
  writeJson(PATH_STORAGE_KEY, history);
}

function readLearning(): InterventionLearningState {
  const fallback = {
    intensity: 0.42,
    trustScore: 0.62,
    quietUntil: null,
    companion: defaultCompanion(),
    continuity: defaultContinuity(),
    exposures: 0,
    lastSuggestion: null,
    lastPredictedDirection: null,
    lastTone: null,
    lastScore: null,
    lastSeenAt: null,
    lastSpokeAt: null,
    outcomes: [],
  } satisfies InterventionLearningState;

  const state = readJson<InterventionLearningState>(LEARNING_STORAGE_KEY, fallback);
  return {
    ...fallback,
    ...state,
    companion: {
      ...defaultCompanion(),
      ...(state as Partial<InterventionLearningState>).companion,
    },
    continuity: {
      ...defaultContinuity(),
      ...(state as Partial<InterventionLearningState>).continuity,
    },
  };
}

function writeLearning(state: InterventionLearningState) {
  writeJson(LEARNING_STORAGE_KEY, state);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toneScore(tone: string) {
  return TONE_SCORE[tone] ?? 0;
}

function formatTimeSince(timestamp: number | null) {
  if (!timestamp) return null;
  const diff = now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "a moment ago";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function updateCompanion(
  companion: CompanionIdentity,
  outcome: "improved" | "worsened" | "looped" | "held" | "unknown",
  trajectory: EmotionalTrajectory,
  intensity: number,
  trustScore: number,
): CompanionIdentity {
  let warmth = companion.warmth;
  let restraint = companion.restraint;
  let directness = companion.directness;
  let familiarity = companion.familiarity;

  familiarity += 0.018;

  if (outcome === "improved" || trajectory.recoveryArc) {
    warmth += 0.035;
    restraint += 0.04;
    directness -= 0.018;
  }

  if (outcome === "worsened" || trajectory.strainArc) {
    warmth += 0.018;
    restraint -= 0.035;
    directness += 0.045;
  }

  if (outcome === "looped") {
    directness += 0.035;
    restraint -= 0.018;
  }

  if (trustScore >= 0.72) restraint += 0.03;
  if (intensity >= 0.72) directness += 0.025;

  warmth = clamp(warmth, 0.18, 0.92);
  restraint = clamp(restraint, 0.22, 0.95);
  directness = clamp(directness, 0.12, 0.86);
  familiarity = clamp(familiarity, 0.08, 0.95);

  const archetype: CompanionIdentity["archetype"] =
    directness > 0.62 ? "Guardian" : warmth > 0.68 ? "Guide" : familiarity > 0.52 ? "Mirror" : "Witness";

  const temperament: CompanionIdentity["temperament"] =
    restraint > 0.78 ? "quiet" : directness > 0.58 ? "direct" : warmth > 0.62 ? "warm" : "reflective";

  return {
    ...companion,
    archetype,
    temperament,
    familiarity,
    restraint,
    warmth,
    directness,
    updatedAt: now(),
  };
}

function updateContinuity(
  continuity: ContinuityMemory,
  outcome: "improved" | "worsened" | "looped" | "held" | "unknown",
  trajectory: EmotionalTrajectory,
  pattern: ReturnType<typeof analyzePath>,
  previousVisits: number,
  memory: StarMemory,
): ContinuityMemory {
  const chapter: ContinuityMemory["chapter"] = trajectory.recoveryArc
    ? "Recovery"
    : trajectory.strainArc || memory.weights.threshold
      ? "Threshold"
      : pattern.hasABAB || pattern.transitionCount >= 2
        ? "Loop"
        : previousVisits > 0
          ? "Return"
          : "Opening";

  const longArc: ContinuityMemory["longArc"] = trajectory.recoveryArc
    ? "lifting"
    : trajectory.strainArc
      ? "tightening"
      : pattern.hasABAB || pattern.transitionCount >= 2
        ? "circling"
        : outcome === "improved"
          ? "softening"
          : continuity.longArc;

  const shouldCallback = previousVisits > 0 || pattern.hasABAB || trajectory.recoveryArc || trajectory.strainArc;

  return {
    chapter,
    longArc,
    lastCallbackAt: shouldCallback ? now() : continuity.lastCallbackAt,
    callbackCount: continuity.callbackCount + (shouldCallback ? 1 : 0),
  };
}

function companionPrefix(companion: CompanionIdentity, trust: TrustDecision) {
  if (!trust.shouldSpeak) return "";
  if (companion.temperament === "quiet") return "";
  if (companion.temperament === "warm") return `${companion.name} stays near... `;
  if (companion.temperament === "direct") return `${companion.name} is clearer now... `;
  return `${companion.name} notices... `;
}

function continuityCallback(
  previousVisits: number,
  memory: StarMemory,
  pattern: ReturnType<typeof analyzePath>,
  trajectory: EmotionalTrajectory,
  continuity: ContinuityMemory,
  title: string,
) {
  const lastSeen = formatTimeSince(memory.lastSeenAt);

  if (previousVisits > 0 && lastSeen) {
    return `last time you came here was ${lastSeen}. `;
  }

  if (trajectory.recoveryArc && continuity.callbackCount > 1) {
    return `this is becoming part of a longer recovery thread. `;
  }

  if (trajectory.strainArc && continuity.callbackCount > 1) {
    return `this chapter has been tightening across visits. `;
  }

  if (pattern.hasABAB) {
    return `this back-and-forth has appeared before. `;
  }

  if (continuity.chapter === "Return") {
    return `this return belongs to the same thread. `;
  }

  return "";
}

function updateMemory(cue: NarratorCue) {
  const id = cue.starId ?? cue.title ?? "unknown-star";
  const history = readHistory();
  const previous = history[id];
  const t = now();
  const tone = cue.tone ?? "neutral";
  const weight = cue.symbolicWeight ?? "light";

  const previousVisits = previous?.visits ?? 0;
  const previousLastSeenAt = previous?.lastSeenAt ?? null;

  const next: StarMemory = previous ?? {
    visits: 0,
    firstSeenAt: t,
    lastSeenAt: t,
    tones: {},
    weights: {},
  };

  next.visits += 1;
  next.lastSeenAt = t;
  next.tones[tone] = (next.tones[tone] ?? 0) + 1;
  next.weights[weight] = (next.weights[weight] ?? 0) + 1;

  history[id] = next;
  writeHistory(history);

  return {
    id,
    previousVisits,
    previousLastSeenAt,
    memory: {
      ...next,
      lastSeenAt: previousLastSeenAt ?? next.lastSeenAt,
    },
    updatedMemory: next,
  };
}

function updatePathMemory(cue: NarratorCue, starId: string, previousVisits: number, memory: StarMemory) {
  const t = now();
  const tone = cue.tone ?? "neutral";
  const weight = cue.symbolicWeight ?? "light";
  const history = readPathHistory();
  const last = history.recent[history.recent.length - 1];

  if (last && last.starId !== starId) {
    const transitionKey = `${last.starId}->${starId}`;
    const toneKey = `${last.tone}->${tone}`;

    history.transitions[transitionKey] = (history.transitions[transitionKey] ?? 0) + 1;
    history.toneTransitions[toneKey] = (history.toneTransitions[toneKey] ?? 0) + 1;
  }

  history.recent.push({ starId, tone, weight, seenAt: t });
  history.recent = history.recent.slice(-MAX_RECENT_PATH);
  writePathHistory(history);

  const pattern = analyzePath(history, starId, tone);
  const trajectory = analyzeTrajectory(history);
  const learning = updateLearning(tone, pattern, trajectory, previousVisits, memory);
  const baseIntervention = predictIntervention(history, pattern, trajectory, tone);
  const intervention = applyAdaptiveIntensity(baseIntervention, learning);
  const trust = calibrateTrust(intervention, learning, trajectory, pattern);

  return {
    pattern,
    trajectory,
    intervention,
    learning,
    trust,
  };
}

function analyzeTrajectory(history: PathHistory): EmotionalTrajectory {
  const recent = history.recent.slice(-6);

  if (recent.length < 3) {
    return {
      scoreDelta: 0,
      direction: "stable",
      startTone: recent[0]?.tone ?? null,
      endTone: recent[recent.length - 1]?.tone ?? null,
      stuckTone: null,
      recoveryArc: false,
      strainArc: false,
    };
  }

  const scores = recent.map((step) => toneScore(step.tone));
  const firstHalfLength = Math.ceil(scores.length / 2);
  const secondHalfLength = scores.length - Math.floor(scores.length / 2);
  const firstAvg = scores.slice(0, firstHalfLength).reduce((sum, score) => sum + score, 0) / firstHalfLength;
  const secondAvg = scores.slice(Math.floor(scores.length / 2)).reduce((sum, score) => sum + score, 0) / secondHalfLength;
  const scoreDelta = Number((secondAvg - firstAvg).toFixed(2));
  const toneCounts = recent.reduce<Record<string, number>>((acc, step) => {
    acc[step.tone] = (acc[step.tone] ?? 0) + 1;
    return acc;
  }, {});
  const stuckTone = Object.entries(toneCounts).find(([, count]) => count >= 4)?.[0] ?? null;
  const startTone = recent[0]?.tone ?? null;
  const endTone = recent[recent.length - 1]?.tone ?? null;
  const recoveryArc = scoreDelta >= 1.25 || (toneScore(startTone ?? "neutral") < 0 && toneScore(endTone ?? "neutral") > 0);
  const strainArc = scoreDelta <= -1.25 || (toneScore(startTone ?? "neutral") > 0 && toneScore(endTone ?? "neutral") < 0);

  return {
    scoreDelta,
    direction: recoveryArc ? "rising" : strainArc ? "falling" : stuckTone ? "stable" : "mixed",
    startTone,
    endTone,
    stuckTone,
    recoveryArc,
    strainArc,
  };
}

function analyzePath(history: PathHistory, currentStarId: string, currentTone: string) {
  const previous = history.recent[history.recent.length - 2];
  const transitionKey = previous ? `${previous.starId}->${currentStarId}` : null;
  const transitionCount = transitionKey ? history.transitions[transitionKey] ?? 0 : 0;
  const starFrequency = history.recent.filter((step) => step.starId === currentStarId).length;
  const toneFrequency = history.recent.filter((step) => step.tone === currentTone).length;
  const alternatingLoop = history.recent.length >= 4
    ? history.recent.slice(-4).map((step) => step.starId).join("|")
    : "";
  const hasABAB = history.recent.length >= 4
    ? (() => {
        const last4 = history.recent.slice(-4).map((step) => step.starId);
        return last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1];
      })()
    : false;

  return {
    previousStarId: previous?.starId ?? null,
    transitionKey,
    transitionCount,
    starFrequency,
    toneFrequency,
    hasABAB,
    alternatingLoop,
    recentLength: history.recent.length,
  };
}

function classifyOutcome(previousScore: number | null, currentTone: string, pattern: ReturnType<typeof analyzePath>, trajectory: EmotionalTrajectory) {
  if (previousScore == null) return "unknown" as const;

  const delta = toneScore(currentTone) - previousScore;
  if (trajectory.recoveryArc || delta >= 2) return "improved" as const;
  if (trajectory.strainArc || delta <= -2) return "worsened" as const;
  if (pattern.hasABAB || pattern.transitionCount >= 2) return "looped" as const;
  return "held" as const;
}

function updateLearning(
  currentTone: string,
  pattern: ReturnType<typeof analyzePath>,
  trajectory: EmotionalTrajectory,
  previousVisits: number,
  memory: StarMemory,
) {
  const state = readLearning();
  const currentScore = toneScore(currentTone);
  const outcome = classifyOutcome(state.lastScore, currentTone, pattern, trajectory);

  let intensity = state.intensity;
  let trustScore = state.trustScore ?? 0.62;
  if (outcome === "improved") {
    intensity -= 0.08;
    trustScore += 0.08;
  }
  if (outcome === "worsened") {
    intensity += 0.1;
    trustScore -= 0.06;
  }
  if (outcome === "looped") {
    intensity += 0.07;
    trustScore -= 0.03;
  }
  if (outcome === "held") intensity += 0.01;

  intensity = clamp(intensity, 0.22, 0.88);
  trustScore = clamp(trustScore, 0.18, 0.92);

  const quietUntil = outcome === "improved" && trustScore >= 0.72 ? now() + 45_000 : state.quietUntil;
  const companion = updateCompanion(state.companion, outcome, trajectory, intensity, trustScore);
  const continuity = updateContinuity(state.continuity, outcome, trajectory, pattern, previousVisits, memory);

  const next: InterventionLearningState = {
    intensity,
    trustScore,
    quietUntil,
    companion,
    continuity,
    exposures: state.exposures + 1,
    lastSuggestion: state.lastSuggestion,
    lastPredictedDirection: state.lastPredictedDirection,
    lastTone: currentTone,
    lastScore: currentScore,
    lastSeenAt: now(),
    lastSpokeAt: state.lastSpokeAt ?? null,
    outcomes: [
      ...state.outcomes,
      {
        seenAt: now(),
        suggestion: state.lastSuggestion ?? "notice",
        predictedDirection: state.lastPredictedDirection ?? "uncertain",
        tone: currentTone,
        score: currentScore,
        outcome,
        intensity,
      },
    ].slice(-MAX_OUTCOMES),
  };

  writeLearning(next);
  return next;
}

function predictIntervention(
  history: PathHistory,
  pattern: ReturnType<typeof analyzePath>,
  trajectory: EmotionalTrajectory,
  currentTone: string,
): PredictiveIntervention {
  const recent = history.recent.slice(-5);
  const recentScores = recent.map((step) => toneScore(step.tone));
  const averageRecentScore = recentScores.length
    ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length
    : 0;

  if (trajectory.recoveryArc) {
    return {
      predictedDirection: "recovery",
      confidence: 0.78,
      suggestion: "continue",
      phrase: "keep following the lighter thread.",
    };
  }

  if (trajectory.strainArc) {
    return {
      predictedDirection: "strain",
      confidence: 0.76,
      suggestion: "pause",
      phrase: "pause before the map gets heavier.",
    };
  }

  if (pattern.hasABAB || pattern.transitionCount >= 2) {
    return {
      predictedDirection: "loop",
      confidence: 0.72,
      suggestion: "notice",
      phrase: "notice the loop before choosing again.",
    };
  }

  if (trajectory.stuckTone || pattern.toneFrequency >= 4) {
    return {
      predictedDirection: "stable",
      confidence: 0.68,
      suggestion: "soften",
      phrase: `soften around the ${currentTone}.`,
    };
  }

  if (averageRecentScore < -1.25) {
    return {
      predictedDirection: "strain",
      confidence: 0.62,
      suggestion: "stay",
      phrase: "stay with one point instead of chasing the next one.",
    };
  }

  return {
    predictedDirection: "uncertain",
    confidence: 0.48,
    suggestion: "notice",
    phrase: "notice what pulls your attention next.",
  };
}

function applyAdaptiveIntensity(intervention: PredictiveIntervention, learning: InterventionLearningState): PredictiveIntervention {
  const intensity = learning.intensity;
  let phrase = intervention.phrase;

  if (intensity >= 0.72) {
    if (intervention.suggestion === "pause") phrase = "pause here. do not rush past this point.";
    if (intervention.suggestion === "stay") phrase = "stay with this one. stop chasing the next signal.";
    if (intervention.suggestion === "notice") phrase = "notice the loop clearly before choosing again.";
    if (intervention.suggestion === "soften") phrase = phrase.replace("soften", "soften more slowly");
  } else if (intensity <= 0.34) {
    if (intervention.suggestion === "continue") phrase = "keep going gently.";
    if (intervention.suggestion === "notice") phrase = "just notice the next pull.";
    if (intervention.suggestion === "pause") phrase = "take a small pause.";
  }

  const next = {
    ...intervention,
    confidence: clamp(intervention.confidence + (intensity - 0.42) * 0.18, 0.35, 0.92),
    phrase,
  };

  const state = readLearning();
  writeLearning({
    ...state,
    intensity,
    lastSuggestion: next.suggestion,
    lastPredictedDirection: next.predictedDirection,
  });

  return next;
}

function calibrateTrust(
  intervention: PredictiveIntervention,
  learning: InterventionLearningState,
  trajectory: EmotionalTrajectory,
  pattern: ReturnType<typeof analyzePath>,
): TrustDecision {
  const t = now();

  if (learning.quietUntil && learning.quietUntil > t && !trajectory.strainArc && !pattern.hasABAB) {
    return {
      shouldSpeak: false,
      reason: "quiet-mode",
      silenceMs: learning.quietUntil - t,
      trustScore: learning.trustScore,
    };
  }

  if (learning.lastSpokeAt && t - learning.lastSpokeAt < 18_000 && !trajectory.strainArc && !pattern.hasABAB) {
    return {
      shouldSpeak: false,
      reason: "recently-spoke",
      silenceMs: 18_000 - (t - learning.lastSpokeAt),
      trustScore: learning.trustScore,
    };
  }

  if (trajectory.recoveryArc && learning.trustScore >= 0.68 && intervention.confidence < 0.82) {
    return {
      shouldSpeak: false,
      reason: "user-improving",
      silenceMs: 30_000,
      trustScore: learning.trustScore,
    };
  }

  if (intervention.predictedDirection === "uncertain" && intervention.confidence < 0.55) {
    return {
      shouldSpeak: false,
      reason: "low-confidence",
      silenceMs: 12_000,
      trustScore: learning.trustScore,
    };
  }

  return {
    shouldSpeak: true,
    reason: "needed",
    silenceMs: 0,
    trustScore: learning.trustScore,
  };
}

function dominantKey(values: Record<string, number>) {
  return Object.entries(values).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function shouldWhisper(cue: NarratorCue) {
  return Boolean(
    cue.script &&
      (cue.event === "narrator.focus.arrive" ||
        cue.event === "narrator.replay.begin" ||
        cue.event === "narrator.replay.pulse"),
  );
}

function innerScript(
  cue: NarratorCue,
  previousVisits: number,
  memory: StarMemory,
  pattern: ReturnType<typeof analyzePath>,
  trajectory: EmotionalTrajectory,
  intervention: PredictiveIntervention,
  companion: CompanionIdentity,
  trust: TrustDecision,
  continuity: ContinuityMemory,
) {
  const tone = cue.tone ?? dominantKey(memory.tones) ?? "quiet";
  const weight = cue.symbolicWeight ?? dominantKey(memory.weights) ?? "subtle";
  const title = cue.title ?? "this point";
  const prefix = companionPrefix(companion, trust);
  const callback = continuityCallback(previousVisits, memory, pattern, trajectory, continuity, title);

  if (trajectory.recoveryArc) {
    return `${prefix}${callback}the feeling is lifting... from ${trajectory.startTone} toward ${trajectory.endTone}. ${intervention.phrase}`;
  }

  if (trajectory.strainArc) {
    return `${prefix}${callback}the map is getting heavier... from ${trajectory.startTone} toward ${trajectory.endTone}. ${intervention.phrase}`;
  }

  if (trajectory.stuckTone && trajectory.stuckTone === tone && pattern.toneFrequency >= 4) {
    return `${prefix}${callback}same ${tone} across different places... ${intervention.phrase}`;
  }

  if (pattern.hasABAB && pattern.previousStarId) {
    return `${prefix}${callback}you are moving between them again... ${pattern.previousStarId} and ${title}. ${intervention.phrase}`;
  }

  if (pattern.transitionCount >= 2 && pattern.previousStarId) {
    return `${prefix}${callback}this path repeats... from ${pattern.previousStarId} to ${title}. ${intervention.phrase}`;
  }

  if (pattern.toneFrequency >= 4) {
    return `${prefix}${callback}different stars... same ${tone}. ${intervention.phrase}`;
  }

  if (previousVisits === 0) {
    if (cue.event === "narrator.replay.begin") {
      return `${prefix}${callback}first time inside this one... ${tone}. ${weight}. ${intervention.phrase}`;
    }

    return `${prefix}${callback}new pull... ${title}. ${tone}. ${intervention.phrase}`;
  }

  if (previousVisits === 1) {
    return `${prefix}${callback}you came back... ${tone} again. ${intervention.phrase}`;
  }

  if (previousVisits >= 3) {
    return `${prefix}${callback}this pattern knows the way back to you... ${intervention.phrase}`;
  }

  if (cue.event === "narrator.replay.begin") {
    return `${prefix}${callback}beneath it... ${tone}. ${weight}. ${intervention.phrase}`;
  }

  return `${prefix}${callback}notice the return... ${tone}. ${intervention.phrase}`;
}

function voiceParams(
  cue: NarratorCue,
  previousVisits: number,
  trajectory: EmotionalTrajectory,
  intervention: PredictiveIntervention,
  learning: InterventionLearningState,
) {
  const tone = cue.tone ?? "neutral";
  const weight = cue.symbolicWeight ?? "light";
  const companion = learning.companion;

  let rate = 0.68;
  let pitch = 0.72;
  let volume = 0.24 + learning.intensity * 0.08 + companion.familiarity * 0.03;

  if (tone === "grief") {
    rate = 0.58;
    pitch = 0.66;
    volume = 0.2 + learning.intensity * 0.08 + companion.warmth * 0.03;
  } else if (tone === "hope" || tone === "recovery") {
    rate = 0.72;
    pitch = 0.82;
    volume = 0.22 + learning.intensity * 0.06 + companion.warmth * 0.02;
  } else if (tone === "tension" || tone === "charged") {
    rate = 0.76;
    pitch = 0.7;
    volume = 0.26 + learning.intensity * 0.08 + companion.directness * 0.02;
  }

  if (weight === "threshold" || weight === "heavy") {
    volume += 0.04;
    rate -= 0.04;
  }

  if (previousVisits >= 2) {
    rate -= 0.03;
    volume += 0.03;
  }

  if (trajectory.recoveryArc) {
    pitch += 0.05;
    volume += 0.02;
  }

  if (trajectory.strainArc || intervention.suggestion === "pause") {
    rate -= 0.05 + learning.intensity * 0.03;
    pitch -= 0.04;
  }

  if (companion.temperament === "quiet") volume -= 0.04;
  if (companion.temperament === "direct") rate += 0.03;
  if (companion.temperament === "warm") pitch += 0.03;

  return {
    rate: clamp(rate, 0.52, 0.96),
    pitch: clamp(pitch, 0.62, 0.96),
    volume: clamp(volume, 0.16, 0.44),
  };
}

export default function DualLayerNarratorBridge() {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const handleNarrator = (event: Event) => {
      const cue = (event as CustomEvent<NarratorCue>).detail;
      if (!shouldWhisper(cue)) return;

      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

      const { id, previousVisits, memory, updatedMemory } = updateMemory(cue);
      const { pattern, trajectory, intervention, learning, trust } = updatePathMemory(cue, id, previousVisits, memory);
      const script = innerScript(
        cue,
        previousVisits,
        memory,
        pattern,
        trajectory,
        intervention,
        learning.companion,
        trust,
        learning.continuity,
      );
      const delay = Math.max(0, (cue.timing?.delayMs ?? 0) + 720);

      window.dispatchEvent(
        new CustomEvent("urai:narrator-trust", {
          detail: {
            sourceEvent: cue.event,
            starId: id,
            trust,
            intervention,
            trajectory,
            pattern,
            learning,
            companion: learning.companion,
            continuity: learning.continuity,
          },
        }),
      );

      if (!trust.shouldSpeak) return;

      const updatedLearning = {
        ...learning,
        lastSpokeAt: now(),
      };
      writeLearning(updatedLearning);

      timeoutRef.current = window.setTimeout(() => {
        const whisper = new SpeechSynthesisUtterance(script);
        const params = voiceParams(cue, previousVisits, trajectory, intervention, updatedLearning);

        whisper.rate = params.rate;
        whisper.pitch = params.pitch;
        whisper.volume = params.volume;
        whisper.lang = "en-US";

        window.speechSynthesis.speak(whisper);

        window.dispatchEvent(
          new CustomEvent("urai:narrator-inner-voice", {
            detail: {
              sourceEvent: cue.event,
              starId: id,
              previousVisits,
              visits: updatedMemory.visits,
              tone: cue.tone ?? dominantKey(updatedMemory.tones),
              symbolicWeight: cue.symbolicWeight ?? dominantKey(updatedMemory.weights),
              pattern,
              trajectory,
              intervention,
              trust,
              companion: updatedLearning.companion,
              continuity: updatedLearning.continuity,
              learning: updatedLearning,
              script,
            },
          }),
        );
      }, delay);
    };

    window.addEventListener("urai:narrator", handleNarrator);

    return () => {
      window.removeEventListener("urai:narrator", handleNarrator);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return null;
}
