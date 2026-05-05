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

type InterventionLearningState = {
  intensity: number;
  trustScore: number;
  quietUntil: number | null;
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
  return readJson<InterventionLearningState>(LEARNING_STORAGE_KEY, {
    intensity: 0.42,
    trustScore: 0.62,
    quietUntil: null,
    exposures: 0,
    lastSuggestion: null,
    lastPredictedDirection: null,
    lastTone: null,
    lastScore: null,
    lastSeenAt: null,
    lastSpokeAt: null,
    outcomes: [],
  });
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

function updateMemory(cue: NarratorCue) {
  const id = cue.starId ?? cue.title ?? "unknown-star";
  const history = readHistory();
  const previous = history[id];
  const t = now();
  const tone = cue.tone ?? "neutral";
  const weight = cue.symbolicWeight ?? "light";

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
    previousVisits: previous?.visits ?? 0,
    memory: next,
  };
}

function updatePathMemory(cue: NarratorCue, starId: string) {
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
  const learning = updateLearning(tone, pattern, trajectory);
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

function updateLearning(currentTone: string, pattern: ReturnType<typeof analyzePath>, trajectory: EmotionalTrajectory) {
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

  const next: InterventionLearningState = {
    intensity,
    trustScore,
    quietUntil,
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
) {
  const tone = cue.tone ?? dominantKey(memory.tones) ?? "quiet";
  const weight = cue.symbolicWeight ?? dominantKey(memory.weights) ?? "subtle";
  const title = cue.title ?? "this point";

  if (trajectory.recoveryArc) {
    return `the feeling is lifting... from ${trajectory.startTone} toward ${trajectory.endTone}. ${intervention.phrase}`;
  }

  if (trajectory.strainArc) {
    return `the map is getting heavier... from ${trajectory.startTone} toward ${trajectory.endTone}. ${intervention.phrase}`;
  }

  if (trajectory.stuckTone && trajectory.stuckTone === tone && pattern.toneFrequency >= 4) {
    return `same ${tone} across different places... ${intervention.phrase}`;
  }

  if (pattern.hasABAB && pattern.previousStarId) {
    return `you are moving between them again... ${pattern.previousStarId} and ${title}. ${intervention.phrase}`;
  }

  if (pattern.transitionCount >= 2 && pattern.previousStarId) {
    return `this path repeats... from ${pattern.previousStarId} to ${title}. ${intervention.phrase}`;
  }

  if (pattern.toneFrequency >= 4) {
    return `different stars... same ${tone}. ${intervention.phrase}`;
  }

  if (previousVisits === 0) {
    if (cue.event === "narrator.replay.begin") {
      return `first time inside this one... ${tone}. ${weight}. ${intervention.phrase}`;
    }

    return `new pull... ${title}. ${tone}. ${intervention.phrase}`;
  }

  if (previousVisits === 1) {
    return `you came back... ${tone} again. ${intervention.phrase}`;
  }

  if (previousVisits >= 3) {
    return `this pattern knows the way back to you... ${intervention.phrase}`;
  }

  if (cue.event === "narrator.replay.begin") {
    return `beneath it... ${tone}. ${weight}. ${intervention.phrase}`;
  }

  return `notice the return... ${tone}. ${intervention.phrase}`;
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

  let rate = 0.68;
  let pitch = 0.72;
  let volume = 0.24 + learning.intensity * 0.08;

  if (tone === "grief") {
    rate = 0.58;
    pitch = 0.66;
    volume = 0.2 + learning.intensity * 0.08;
  } else if (tone === "hope" || tone === "recovery") {
    rate = 0.72;
    pitch = 0.82;
    volume = 0.22 + learning.intensity * 0.06;
  } else if (tone === "tension" || tone === "charged") {
    rate = 0.76;
    pitch = 0.7;
    volume = 0.26 + learning.intensity * 0.08;
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

  return {
    rate: clamp(rate, 0.52, 0.94),
    pitch: clamp(pitch, 0.62, 0.92),
    volume: clamp(volume, 0.18, 0.42),
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

      const { id, previousVisits, memory } = updateMemory(cue);
      const { pattern, trajectory, intervention, learning, trust } = updatePathMemory(cue, id);
      const script = innerScript(cue, previousVisits, memory, pattern, trajectory, intervention);
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
              visits: memory.visits,
              tone: cue.tone ?? dominantKey(memory.tones),
              symbolicWeight: cue.symbolicWeight ?? dominantKey(memory.weights),
              pattern,
              trajectory,
              intervention,
              trust,
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
