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

const STORAGE_KEY = "urai:lifemap:memory-history:v1";
const PATH_STORAGE_KEY = "urai:lifemap:path-history:v1";
const MAX_RECENT_PATH = 12;

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

  return analyzePath(history, starId, tone);
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
) {
  const tone = cue.tone ?? dominantKey(memory.tones) ?? "quiet";
  const weight = cue.symbolicWeight ?? dominantKey(memory.weights) ?? "subtle";
  const title = cue.title ?? "this point";

  if (pattern.hasABAB && pattern.previousStarId) {
    return `you are moving between them again... ${pattern.previousStarId} and ${title}. ${tone}. watch the loop.`;
  }

  if (pattern.transitionCount >= 2 && pattern.previousStarId) {
    return `this path repeats... from ${pattern.previousStarId} to ${title}. ${tone}. ${weight}.`;
  }

  if (pattern.toneFrequency >= 4) {
    return `different stars... same ${tone}. the map is circling one feeling.`;
  }

  if (previousVisits === 0) {
    if (cue.event === "narrator.replay.begin") {
      return `first time inside this one... ${tone}. ${weight}. stay close.`;
    }

    return `new pull... ${title}. ${tone}. ${weight}.`;
  }

  if (previousVisits === 1) {
    return `you came back... ${tone} again. ${weight}. listen differently.`;
  }

  if (previousVisits >= 3) {
    return `this pattern knows the way back to you... ${tone}. ${weight}.`;
  }

  if (cue.event === "narrator.replay.begin") {
    return `beneath it... ${tone}. ${weight}. this is not the first return.`;
  }

  return `notice the return... ${tone}. ${weight}.`;
}

function voiceParams(cue: NarratorCue, previousVisits: number) {
  const tone = cue.tone ?? "neutral";
  const weight = cue.symbolicWeight ?? "light";

  let rate = 0.68;
  let pitch = 0.72;
  let volume = 0.24;

  if (tone === "grief") {
    rate = 0.58;
    pitch = 0.66;
    volume = 0.2;
  } else if (tone === "hope" || tone === "recovery") {
    rate = 0.72;
    pitch = 0.82;
    volume = 0.22;
  } else if (tone === "tension" || tone === "charged") {
    rate = 0.76;
    pitch = 0.7;
    volume = 0.26;
  }

  if (weight === "threshold" || weight === "heavy") {
    volume += 0.04;
    rate -= 0.04;
  }

  if (previousVisits >= 2) {
    rate -= 0.03;
    volume += 0.03;
  }

  return { rate, pitch, volume };
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
      const pattern = updatePathMemory(cue, id);
      const script = innerScript(cue, previousVisits, memory, pattern);
      const delay = Math.max(0, (cue.timing?.delayMs ?? 0) + 720);

      timeoutRef.current = window.setTimeout(() => {
        const whisper = new SpeechSynthesisUtterance(script);
        const params = voiceParams(cue, previousVisits);

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
