import { collection, doc, getDoc, getDocs, limit, orderBy, query, type DocumentData } from "firebase/firestore";
import { db, firebaseReady } from "@/lib/firebase";
import {
  uraiV1DemoProfile,
  type UraiCompanionInsight,
  type UraiDemoProfile,
  type UraiMemoryStar,
  type UraiMoodState,
  type UraiMoodWeather,
  type UraiV1ProfileBundle,
} from "./urai-v1-demo-profile";

const weatherValues: UraiMoodWeather[] = ["clear", "cloudy", "storm", "fog", "dawn", "night", "aurora"];
const toneValues: NonNullable<UraiCompanionInsight["tone"]>[] = ["calm", "warm", "reflective", "encouraging", "grounding"];

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number, min = 0, max = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function dateString(value: unknown, fallback?: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return fallback;
}

function normalizeMood(data: DocumentData | undefined, fallback: UraiMoodState): UraiMoodState {
  if (!data) return fallback;
  const weather = weatherValues.includes(data.weather as UraiMoodWeather) ? (data.weather as UraiMoodWeather) : fallback.weather;

  return {
    ...fallback,
    id: stringValue(data.id, fallback.id),
    userId: typeof data.userId === "string" ? data.userId : fallback.userId,
    label: stringValue(data.label, fallback.label),
    intensity: numberValue(data.intensity, fallback.intensity, 0, 100),
    valence: numberValue(data.valence, fallback.valence ?? 0, -1, 1),
    energy: numberValue(data.energy, fallback.energy ?? 0, 0, 1),
    weather,
    auraColor: stringValue(data.auraColor, fallback.auraColor ?? "#9be7d8"),
    updatedAt: dateString(data.updatedAt, fallback.updatedAt),
  };
}

function normalizeInsight(data: DocumentData | undefined, fallback: UraiCompanionInsight): UraiCompanionInsight {
  if (!data) return fallback;
  const tone = toneValues.includes(data.tone as NonNullable<UraiCompanionInsight["tone"]>)
    ? (data.tone as NonNullable<UraiCompanionInsight["tone"]>)
    : fallback.tone;

  return {
    ...fallback,
    id: stringValue(data.id, fallback.id),
    userId: typeof data.userId === "string" ? data.userId : fallback.userId,
    title: stringValue(data.title, fallback.title),
    message: stringValue(data.message, fallback.message),
    tone,
    createdAt: dateString(data.createdAt, fallback.createdAt),
  };
}

function normalizeStar(id: string, data: DocumentData, fallback: UraiMemoryStar): UraiMemoryStar {
  return {
    ...fallback,
    id: stringValue(data.id, id || fallback.id),
    userId: typeof data.userId === "string" ? data.userId : fallback.userId,
    title: stringValue(data.title, fallback.title),
    summary: stringValue(data.summary, fallback.summary),
    moodLabel: typeof data.moodLabel === "string" ? data.moodLabel : fallback.moodLabel,
    emotionalWeight: numberValue(data.emotionalWeight, fallback.emotionalWeight ?? 0.5, 0, 1),
    timestamp: dateString(data.timestamp, fallback.timestamp),
  };
}

function demoBundle(source: UraiV1ProfileBundle["source"], error?: string): UraiV1ProfileBundle {
  return { profile: uraiV1DemoProfile, source, error };
}

export async function loadUraiV1Profile(userId = "demo-user"): Promise<UraiV1ProfileBundle> {
  const resolvedUserId = userId.trim() || "demo-user";

  if (!firebaseReady || !db || resolvedUserId === "demo-user") {
    return demoBundle("demo");
  }

  try {
    const moodRef = doc(db, "users", resolvedUserId, "moodStates", "current");
    const insightRef = doc(db, "users", resolvedUserId, "companionInsights", "latest");
    const starsRef = collection(db, "users", resolvedUserId, "memoryStars");
    const starsQuery = query(starsRef, orderBy("timestamp", "desc"), limit(8));

    const [moodSnapshot, insightSnapshot, starSnapshot] = await Promise.all([
      getDoc(moodRef),
      getDoc(insightRef),
      getDocs(starsQuery),
    ]);

    const fallback = { ...uraiV1DemoProfile, id: resolvedUserId };
    const memoryStars = starSnapshot.docs.map((starDoc, index) =>
      normalizeStar(starDoc.id, starDoc.data(), fallback.memoryStars[index % fallback.memoryStars.length]),
    );

    const profile: UraiDemoProfile = {
      ...fallback,
      displayName: stringValue(insightSnapshot.data()?.displayName, fallback.displayName),
      currentMood: normalizeMood(moodSnapshot.exists() ? moodSnapshot.data() : undefined, fallback.currentMood),
      companionInsight: normalizeInsight(insightSnapshot.exists() ? insightSnapshot.data() : undefined, fallback.companionInsight),
      memoryStars: memoryStars.length ? memoryStars : fallback.memoryStars,
    };

    return {
      profile,
      source: moodSnapshot.exists() || insightSnapshot.exists() || memoryStars.length ? "firestore" : "firestore-fallback",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Firestore unavailable";
    return demoBundle("error", message);
  }
}
