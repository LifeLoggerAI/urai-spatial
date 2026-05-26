export type UraiMoodWeather = "clear" | "cloudy" | "storm" | "fog" | "dawn" | "night" | "aurora";

export type UraiMoodState = {
  id: string;
  userId?: string;
  label: string;
  intensity: number;
  valence?: number;
  energy?: number;
  weather: UraiMoodWeather;
  auraColor?: string;
  updatedAt?: string;
};

export type UraiCompanionInsight = {
  id: string;
  userId?: string;
  title: string;
  message: string;
  tone?: "calm" | "warm" | "reflective" | "encouraging" | "grounding";
  createdAt?: string;
};

export type UraiMemoryStar = {
  id: string;
  userId?: string;
  title: string;
  summary: string;
  moodLabel?: string;
  emotionalWeight?: number;
  timestamp?: string;
};

export type UraiDemoProfile = {
  id: string;
  displayName: string;
  currentMood: UraiMoodState;
  companionInsight: UraiCompanionInsight;
  memoryStars: UraiMemoryStar[];
};

export type UraiV1ProfileSource = "demo" | "firestore" | "firestore-fallback" | "error";

export type UraiV1ProfileBundle = {
  profile: UraiDemoProfile;
  source: UraiV1ProfileSource;
  error?: string;
};

export const URAI_V1_FIRESTORE_PATHS = {
  moodState: "users/{userId}/moodStates/current",
  companionInsight: "users/{userId}/companionInsights/latest",
  memoryStars: "users/{userId}/memoryStars/{starId}",
} as const;

const demoTimestamp = "2026-05-26T12:00:00.000Z";

export const uraiV1DemoProfile: UraiDemoProfile = {
  id: "demo-user",
  displayName: "Demo Field",
  currentMood: {
    id: "quiet-momentum",
    userId: "demo-user",
    label: "quiet momentum",
    intensity: 72,
    valence: 0.62,
    energy: 0.58,
    weather: "dawn",
    auraColor: "#9be7d8",
    updatedAt: demoTimestamp,
  },
  companionInsight: {
    id: "clean-path",
    userId: "demo-user",
    title: "The path is becoming simple.",
    message: "You are closer than it feels. Today is about turning the system into one clean path and letting the rest wait.",
    tone: "grounding",
    createdAt: demoTimestamp,
  },
  memoryStars: [
    {
      id: "first-signal",
      userId: "demo-user",
      title: "First Signal",
      summary: "The first passive pattern appears as a small light in the home field.",
      moodLabel: "beginning",
      emotionalWeight: 0.62,
      timestamp: "2026-05-20T08:15:00.000Z",
    },
    {
      id: "mood-weather",
      userId: "demo-user",
      title: "Mood Weather",
      summary: "A dawn state gathers from recent recovery, focus, and low-friction signals.",
      moodLabel: "quiet momentum",
      emotionalWeight: 0.74,
      timestamp: "2026-05-22T10:30:00.000Z",
    },
    {
      id: "companion-reflection",
      userId: "demo-user",
      title: "Companion Reflection",
      summary: "The orb reflects the pattern without turning it into a task list.",
      moodLabel: "grounding",
      emotionalWeight: 0.68,
      timestamp: "2026-05-24T18:40:00.000Z",
    },
    {
      id: "spatial-memory-map",
      userId: "demo-user",
      title: "Spatial Memory Map",
      summary: "The home field opens into a simple constellation of meaningful moments.",
      moodLabel: "integration",
      emotionalWeight: 0.79,
      timestamp: demoTimestamp,
    },
  ],
};
