import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { demoHomeWorldState, sparseHomeWorldState } from "@/spatial/home/homeWorldDefaults";
import { deriveHomeWorldStateFromSignals, type HomeWorldSignalInput } from "@/spatial/home/deriveHomeWorldStateFromSignals";
import { explainHomeWorldState } from "@/spatial/home/explainHomeWorldState";
import type {
  DerivedHomeWorldState,
  HomeMoodState,
  HomeRecoveryState,
  HomeWorldExplanation,
  HomeWorldState,
  HomeWorldTier,
} from "@/spatial/home/homeWorldTypes";

const HOME_WORLD_DOC_ID = "state";
const HOME_WORLD_EXPLAIN_DOC_ID = "latest";
const tierValues: HomeWorldTier[] = [1, 2, 3, 4, 5];
const moodValues: HomeMoodState[] = ["calm", "low", "recovery", "dream", "shadow", "focused", "joy"];
const recoveryValues: HomeRecoveryState[] = ["dormant", "recovering", "stable", "growing", "awakened"];

function homeWorldRef(userId: string) {
  return doc(getFirebaseDb(), "users", userId, "homeWorld", HOME_WORLD_DOC_ID);
}

function homeWorldExplainRef(userId: string) {
  return doc(getFirebaseDb(), "users", userId, "homeWorldExplainability", HOME_WORLD_EXPLAIN_DOC_ID);
}

function homeWorldExplainHistoryRef(userId: string) {
  return collection(getFirebaseDb(), "users", userId, "homeWorldExplainability", HOME_WORLD_EXPLAIN_DOC_ID, "history");
}

function validUser(userId: string) {
  return Boolean(userId && userId !== "demo-user");
}

function fallbackForUser(userId: string, demoMode = false) {
  return { ...(demoMode || userId === "demo-user" ? demoHomeWorldState : sparseHomeWorldState), userId };
}

function tier(value: unknown, fallback: HomeWorldTier): HomeWorldTier {
  return tierValues.includes(value as HomeWorldTier) ? (value as HomeWorldTier) : fallback;
}

function mood(value: unknown, fallback: HomeMoodState): HomeMoodState {
  return moodValues.includes(value as HomeMoodState) ? (value as HomeMoodState) : fallback;
}

function recovery(value: unknown, fallback: HomeRecoveryState): HomeRecoveryState {
  return recoveryValues.includes(value as HomeRecoveryState) ? (value as HomeRecoveryState) : fallback;
}

function numberValue(value: unknown, fallback: number, min = 0, max = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function stringDate(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return fallback;
}

function scoreSnapshot(value: unknown, fallback: NonNullable<HomeWorldState["rawScores"]>) {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    ground: numberValue(data.ground, fallback.ground, 0, 100),
    orb: numberValue(data.orb, fallback.orb, 0, 100),
    sky: numberValue(data.sky, fallback.sky, 0, 100),
  };
}

function confidenceSnapshot(value: unknown, fallback: NonNullable<HomeWorldState["confidence"]>) {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const label = data.label === "high" || data.label === "medium" || data.label === "low" ? data.label : fallback.label;
  return {
    overall: numberValue(data.overall, fallback.overall, 0, 1),
    ground: numberValue(data.ground, fallback.ground, 0, 1),
    orb: numberValue(data.orb, fallback.orb, 0, 1),
    sky: numberValue(data.sky, fallback.sky, 0, 1),
    label,
  };
}

function coverageSnapshot(value: unknown, fallback: NonNullable<HomeWorldState["sourceCoverage"]>) {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    ground: numberValue(data.ground, fallback.ground, 0, 1),
    orb: numberValue(data.orb, fallback.orb, 0, 1),
    sky: numberValue(data.sky, fallback.sky, 0, 1),
  };
}

export function serializeState(state: HomeWorldState): DocumentData {
  return {
    version: state.version ?? 3,
    userId: state.userId,
    groundTier: state.groundTier,
    orbTier: state.orbTier,
    skyTier: state.skyTier,
    moodState: state.moodState,
    recoveryState: state.recoveryState,
    energyScore: state.energyScore,
    narratorSpeaking: state.narratorSpeaking,
    skyWeatherIntensity: state.skyWeatherIntensity,
    groundGrowthIntensity: state.groundGrowthIntensity,
    orbPulseIntensity: state.orbPulseIntensity,
    rawScores: state.rawScores,
    smoothedScores: state.smoothedScores,
    confidence: state.confidence,
    sourceCoverage: state.sourceCoverage,
    lastDerivedAt: state.lastDerivedAt,
    lastMoodShiftAt: state.lastMoodShiftAt,
    lastRecoveryBloomAt: state.lastRecoveryBloomAt,
    lastTierUpgradeAt: state.lastTierUpgradeAt,
    createdAt: state.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function compactExplanation(explanation: HomeWorldExplanation): DocumentData {
  return {
    version: 3,
    userId: explanation.userId,
    headline: explanation.headline,
    summary: explanation.summary,
    whyAmISeeingThis: explanation.whyAmISeeingThis,
    ground: explanation.ground,
    orb: explanation.orb,
    sky: explanation.sky,
    mood: explanation.mood,
    recovery: explanation.recovery,
    confidence: explanation.confidence,
    dataSources: explanation.dataSources,
    contributors: explanation.contributors,
    privacy: explanation.privacy,
    updatedAt: serverTimestamp(),
  };
}

export const serializeExplanation = compactExplanation;

export function fromFirestoreState(userId: string, data: DocumentData | undefined, demoMode = false): HomeWorldState {
  const fallback = fallbackForUser(userId, demoMode);
  if (!data) return fallback;
  return {
    ...fallback,
    version: data.version === 3 ? 3 : data.version === 2 ? 2 : fallback.version,
    userId,
    groundTier: tier(data.groundTier, fallback.groundTier),
    orbTier: tier(data.orbTier, fallback.orbTier),
    skyTier: tier(data.skyTier, fallback.skyTier),
    moodState: mood(data.moodState, fallback.moodState),
    recoveryState: recovery(data.recoveryState, fallback.recoveryState),
    energyScore: numberValue(data.energyScore, fallback.energyScore, 0, 100),
    narratorSpeaking: boolValue(data.narratorSpeaking, fallback.narratorSpeaking),
    skyWeatherIntensity: numberValue(data.skyWeatherIntensity, fallback.skyWeatherIntensity),
    groundGrowthIntensity: numberValue(data.groundGrowthIntensity, fallback.groundGrowthIntensity),
    orbPulseIntensity: numberValue(data.orbPulseIntensity, fallback.orbPulseIntensity),
    rawScores: scoreSnapshot(data.rawScores, fallback.rawScores ?? { ground: 32, orb: 24, sky: 34 }),
    smoothedScores: scoreSnapshot(data.smoothedScores, fallback.smoothedScores ?? { ground: 32, orb: 24, sky: 34 }),
    confidence: confidenceSnapshot(data.confidence, fallback.confidence ?? { overall: 0.25, ground: 0.25, orb: 0.25, sky: 0.25, label: "low" }),
    sourceCoverage: coverageSnapshot(data.sourceCoverage, fallback.sourceCoverage ?? { ground: 0.25, orb: 0.25, sky: 0.25 }),
    lastDerivedAt: stringDate(data.lastDerivedAt, fallback.lastDerivedAt ?? fallback.updatedAt),
    lastMoodShiftAt: typeof data.lastMoodShiftAt === "string" ? data.lastMoodShiftAt : undefined,
    lastRecoveryBloomAt: typeof data.lastRecoveryBloomAt === "string" ? data.lastRecoveryBloomAt : undefined,
    lastTierUpgradeAt: typeof data.lastTierUpgradeAt === "string" ? data.lastTierUpgradeAt : undefined,
    createdAt: stringDate(data.createdAt, fallback.createdAt),
    updatedAt: stringDate(data.updatedAt, fallback.updatedAt),
  };
}

export function fromFirestoreExplain(userId: string, data: DocumentData | undefined, state: HomeWorldState): HomeWorldExplanation {
  if (!data) return explainHomeWorldState(state);
  return {
    ...explainHomeWorldState(state),
    version: 3,
    userId,
    headline: typeof data.headline === "string" ? data.headline : explainHomeWorldState(state).headline,
    summary: typeof data.summary === "string" ? data.summary : explainHomeWorldState(state).summary,
    whyAmISeeingThis: Array.isArray(data.whyAmISeeingThis) ? data.whyAmISeeingThis.filter((x) => typeof x === "string") : explainHomeWorldState(state).whyAmISeeingThis,
    ground: typeof data.ground === "string" ? data.ground : explainHomeWorldState(state).ground,
    orb: typeof data.orb === "string" ? data.orb : explainHomeWorldState(state).orb,
    sky: typeof data.sky === "string" ? data.sky : explainHomeWorldState(state).sky,
    mood: typeof data.mood === "string" ? data.mood : explainHomeWorldState(state).mood,
    recovery: typeof data.recovery === "string" ? data.recovery : explainHomeWorldState(state).recovery,
    confidence: data.confidence && typeof data.confidence === "object" ? data.confidence : explainHomeWorldState(state).confidence,
    dataSources: data.dataSources && typeof data.dataSources === "object" ? data.dataSources : explainHomeWorldState(state).dataSources,
    contributors: data.contributors && typeof data.contributors === "object" ? data.contributors : { ground: [], orb: [], sky: [] },
    privacy: {
      rawSignalsStored: false,
      usedRawAudio: false,
      usedContactIdentity: false,
      note: "Derived only · no raw audio stored",
    },
    updatedAt: stringDate(data.updatedAt, state.updatedAt),
  } as HomeWorldExplanation;
}

function meaningfulChange(previous: HomeWorldState | null, next: HomeWorldState, opts?: { force?: boolean }) {
  if (opts?.force || !previous) return true;
  if (previous.groundTier !== next.groundTier || previous.orbTier !== next.orbTier || previous.skyTier !== next.skyTier) return true;
  if (previous.moodState !== next.moodState || previous.recoveryState !== next.recoveryState) return true;
  if (previous.confidence?.label !== next.confidence?.label) return true;
  const prevScores = previous.smoothedScores ?? previous.rawScores;
  const nextScores = next.smoothedScores ?? next.rawScores;
  if (!prevScores || !nextScores) return true;
  return Math.max(
    Math.abs(prevScores.ground - nextScores.ground),
    Math.abs(prevScores.orb - nextScores.orb),
    Math.abs(prevScores.sky - nextScores.sky),
  ) > 3;
}

export async function fetchHomeWorldBundle(userId: string, opts?: { demoMode?: boolean }) {
  if (!validUser(userId)) {
    const state = fallbackForUser(userId, true);
    return { state, explanation: explainHomeWorldState(state), source: "demo-fallback" as const };
  }

  try {
    const [stateSnapshot, explainSnapshot] = await Promise.all([getDoc(homeWorldRef(userId)), getDoc(homeWorldExplainRef(userId))]);
    const state = stateSnapshot.exists() ? fromFirestoreState(userId, stateSnapshot.data(), opts?.demoMode) : fallbackForUser(userId, opts?.demoMode);
    return {
      state,
      explanation: fromFirestoreExplain(userId, explainSnapshot.exists() ? explainSnapshot.data() : undefined, state),
      source: stateSnapshot.exists() ? ("firestore" as const) : opts?.demoMode ? ("demo-fallback" as const) : ("local" as const),
    };
  } catch (error) {
    console.warn("[HomeWorld] Falling back to local Home World bundle", error);
    const state = fallbackForUser(userId, opts?.demoMode);
    return { state, explanation: explainHomeWorldState(state), source: opts?.demoMode ? ("demo-fallback" as const) : ("local" as const) };
  }
}

export async function saveDerivedHomeWorld(
  userId: string,
  derived: DerivedHomeWorldState,
  explanation: HomeWorldExplanation,
  opts?: { previousState?: HomeWorldState | null; force?: boolean; writeHistory?: boolean },
) {
  if (!validUser(userId)) return { state: derived.state, explanation, source: "demo-fallback" as const, persisted: false };
  if (!meaningfulChange(opts?.previousState ?? null, derived.state, opts)) {
    return { state: derived.state, explanation, source: "firestore" as const, persisted: false };
  }

  const batch = writeBatch(getFirebaseDb());
  batch.set(homeWorldRef(userId), serializeState(derived.state), { merge: true });
  batch.set(homeWorldExplainRef(userId), compactExplanation(explanation), { merge: true });
  if (opts?.writeHistory !== false) {
    batch.set(doc(homeWorldExplainHistoryRef(userId)), compactExplanation(explanation));
  }
  await batch.commit();
  return { state: derived.state, explanation, source: "firestore" as const, persisted: true };
}

export async function fetchHomeWorldState(userId: string): Promise<HomeWorldState> {
  return (await fetchHomeWorldBundle(userId)).state;
}

export async function saveHomeWorldState(userId: string, state: Partial<HomeWorldState>) {
  const merged = {
    ...fallbackForUser(userId),
    ...state,
    userId,
    updatedAt: new Date().toISOString(),
  } satisfies HomeWorldState;
  const explanation = explainHomeWorldState(merged);
  const derived = { state: merged as DerivedHomeWorldState["state"], contributors: { ground: [], orb: [], sky: [] } };
  return saveDerivedHomeWorld(userId, derived, explanation, { force: true, writeHistory: false });
}

export async function deriveAndSaveHomeWorldState(input: HomeWorldSignalInput) {
  const previous = await fetchHomeWorldState(input.userId);
  const derived = deriveHomeWorldStateFromSignals({ ...input, previousState: input.previousState ?? previous });
  const explanation = explainHomeWorldState(derived.state, derived, input);
  const saved = await saveDerivedHomeWorld(input.userId, derived, explanation, { previousState: previous });
  return { ...derived, explanation, saved, source: saved.source };
}
