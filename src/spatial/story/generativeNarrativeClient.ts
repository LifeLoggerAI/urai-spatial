import type { StorySequence } from "./storySequences";
import type { GeneratedNarrativeResult, NarrativeGenerationRequest } from "./generativeNarrative";

export type NarrativeClientConfig = {
  endpoint?: string;
  cacheTtlMs?: number;
  dailyBudget?: number;
};

const CACHE_PREFIX = "urai.spatial.generativeNarrative.cache.";
const BUDGET_KEY = "urai.spatial.generativeNarrative.dailyBudget.v1";
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const DEFAULT_DAILY_BUDGET = 20;

type CacheEntry = {
  createdAt: number;
  sequence: StorySequence;
};

type BudgetState = {
  day: string;
  count: number;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hashRequest(request: NarrativeGenerationRequest) {
  const raw = `${request.schema}:${request.user}`;
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function readBudget(): BudgetState {
  if (typeof window === "undefined") return { day: todayKey(), count: 0 };
  try {
    const raw = window.localStorage.getItem(BUDGET_KEY);
    if (!raw) return { day: todayKey(), count: 0 };
    const parsed = JSON.parse(raw) as BudgetState;
    return parsed.day === todayKey() ? parsed : { day: todayKey(), count: 0 };
  } catch {
    return { day: todayKey(), count: 0 };
  }
}

function writeBudget(state: BudgetState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUDGET_KEY, JSON.stringify(state));
  } catch {
    // Budget persistence is best-effort only.
  }
}

function readCache(key: string, ttlMs: number): StorySequence | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.createdAt > ttlMs) return null;
    return entry.sequence;
  } catch {
    return null;
  }
}

function writeCache(key: string, sequence: StorySequence) {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { createdAt: Date.now(), sequence };
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Cache is optional.
  }
}

function canSpend(dailyBudget: number) {
  const state = readBudget();
  return state.count < dailyBudget;
}

function markSpend() {
  const state = readBudget();
  writeBudget({ day: todayKey(), count: state.count + 1 });
}

export async function requestGeneratedNarrative(
  fallback: GeneratedNarrativeResult,
  config: NarrativeClientConfig = {}
): Promise<GeneratedNarrativeResult> {
  const endpoint = config.endpoint ?? "/api/urai/generate-narrative";
  const ttlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const dailyBudget = config.dailyBudget ?? DEFAULT_DAILY_BUDGET;
  const cacheKey = hashRequest(fallback.request);
  const cached = readCache(cacheKey, ttlMs);

  if (cached) {
    return { ...fallback, sequence: cached, mode: "external-ready" };
  }

  if (!canSpend(dailyBudget)) {
    return fallback;
  }

  try {
    markSpend();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fallback.request),
    });

    if (!response.ok) return fallback;

    const payload = (await response.json()) as { sequence?: StorySequence };
    if (!payload.sequence?.beats?.length) return fallback;

    writeCache(cacheKey, payload.sequence);
    return { ...fallback, sequence: payload.sequence, mode: "external-ready" };
  } catch {
    return fallback;
  }
}
