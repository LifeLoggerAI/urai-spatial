import type { HomeWorldState } from "./homeWorldTypes";

const isoNow = "2026-05-04T12:00:00.000Z";

export const defaultHomeWorldState: HomeWorldState = {
  userId: "demo-user",
  groundTier: 3,
  orbTier: 3,
  skyTier: 3,
  moodState: "recovery",
  recoveryState: "growing",
  energyScore: 64,
  narratorSpeaking: false,
  skyWeatherIntensity: 0.56,
  groundGrowthIntensity: 0.62,
  orbPulseIntensity: 0.68,
  createdAt: isoNow,
  updatedAt: isoNow,
};

export const homeWorldTierLabels = {
  1: "Dormant",
  2: "Early Recovery",
  3: "Active Growth",
  4: "Symbolic Bloom",
  5: "Awakened Ecosystem",
} as const;
