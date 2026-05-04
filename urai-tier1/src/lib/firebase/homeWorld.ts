import { doc, getDoc, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { defaultHomeWorldState } from "@/spatial/home/homeWorldDefaults";
import type { HomeMoodState, HomeRecoveryState, HomeWorldState, HomeWorldTier } from "@/spatial/home/homeWorldTypes";

const HOME_WORLD_DOC_ID = "state";
const tierValues: HomeWorldTier[] = [1, 2, 3, 4, 5];
const moodValues: HomeMoodState[] = ["calm", "low", "recovery", "dream", "shadow", "focused", "joy"];
const recoveryValues: HomeRecoveryState[] = ["dormant", "recovering", "stable", "growing", "awakened"];

function homeWorldRef(userId: string) {
  return doc(getFirebaseDb(), "users", userId, "homeWorld", HOME_WORLD_DOC_ID);
}

function validUser(userId: string) {
  return Boolean(userId && userId !== "demo-user");
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

function fromFirestore(userId: string, data: DocumentData): HomeWorldState {
  return {
    ...defaultHomeWorldState,
    userId,
    groundTier: tier(data.groundTier, defaultHomeWorldState.groundTier),
    orbTier: tier(data.orbTier, defaultHomeWorldState.orbTier),
    skyTier: tier(data.skyTier, defaultHomeWorldState.skyTier),
    moodState: mood(data.moodState, defaultHomeWorldState.moodState),
    recoveryState: recovery(data.recoveryState, defaultHomeWorldState.recoveryState),
    energyScore: numberValue(data.energyScore, defaultHomeWorldState.energyScore, 0, 100),
    narratorSpeaking: boolValue(data.narratorSpeaking, defaultHomeWorldState.narratorSpeaking),
    skyWeatherIntensity: numberValue(data.skyWeatherIntensity, defaultHomeWorldState.skyWeatherIntensity),
    groundGrowthIntensity: numberValue(data.groundGrowthIntensity, defaultHomeWorldState.groundGrowthIntensity),
    orbPulseIntensity: numberValue(data.orbPulseIntensity, defaultHomeWorldState.orbPulseIntensity),
    lastMoodShiftAt: typeof data.lastMoodShiftAt === "string" ? data.lastMoodShiftAt : undefined,
    lastRecoveryBloomAt: typeof data.lastRecoveryBloomAt === "string" ? data.lastRecoveryBloomAt : undefined,
    lastTierUpgradeAt: typeof data.lastTierUpgradeAt === "string" ? data.lastTierUpgradeAt : undefined,
    createdAt: stringDate(data.createdAt, defaultHomeWorldState.createdAt),
    updatedAt: stringDate(data.updatedAt, defaultHomeWorldState.updatedAt),
  };
}

export async function fetchHomeWorldState(userId: string): Promise<HomeWorldState> {
  if (!validUser(userId)) return { ...defaultHomeWorldState, userId };

  try {
    const snapshot = await getDoc(homeWorldRef(userId));
    if (!snapshot.exists()) {
      const seeded = { ...defaultHomeWorldState, userId, updatedAt: new Date().toISOString() };
      await saveHomeWorldState(userId, seeded);
      return seeded;
    }
    return fromFirestore(userId, snapshot.data());
  } catch (error) {
    console.warn("[HomeWorld] Falling back to demo Home World state", error);
    return { ...defaultHomeWorldState, userId };
  }
}

export async function saveHomeWorldState(userId: string, state: Partial<HomeWorldState>) {
  const merged = {
    ...defaultHomeWorldState,
    ...state,
    userId,
    updatedAt: new Date().toISOString(),
  } satisfies HomeWorldState;

  if (!validUser(userId)) return { ...merged, source: "demo-fallback" as const };

  try {
    await setDoc(
      homeWorldRef(userId),
      {
        ...merged,
        updatedAt: serverTimestamp(),
        createdAt: merged.createdAt || serverTimestamp(),
      },
      { merge: true },
    );
    return { ...merged, source: "firestore" as const };
  } catch (error) {
    console.warn("[HomeWorld] Failed to save Home World state", error);
    return { ...merged, source: "demo-fallback" as const };
  }
}
