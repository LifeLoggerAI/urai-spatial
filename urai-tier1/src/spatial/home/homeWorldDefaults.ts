import type { HomeWorldState } from "./homeWorldTypes";

const isoNow = "2026-05-04T12:00:00.000Z";

export const sparseHomeWorldState: HomeWorldState = {
  version: 3,
  userId: "local-user",
  groundTier: 2,
  orbTier: 1,
  skyTier: 2,
  moodState: "calm",
  recoveryState: "dormant",
  energyScore: 38,
  narratorSpeaking: false,
  skyWeatherIntensity: 0.28,
  groundGrowthIntensity: 0.32,
  orbPulseIntensity: 0.24,
  rawScores: { ground: 32, orb: 24, sky: 34 },
  smoothedScores: { ground: 32, orb: 24, sky: 34 },
  confidence: { overall: 0.25, ground: 0.25, orb: 0.25, sky: 0.25, label: "low" },
  sourceCoverage: { ground: 0.25, orb: 0.25, sky: 0.25 },
  lastDerivedAt: isoNow,
  createdAt: isoNow,
  updatedAt: isoNow,
};

export const demoHomeWorldState: HomeWorldState = {
  ...sparseHomeWorldState,
  userId: "demo-user",
  groundTier: 3,
  orbTier: 3,
  skyTier: 3,
  moodState: "recovery",
  recoveryState: "growing",
  energyScore: 64,
  skyWeatherIntensity: 0.56,
  groundGrowthIntensity: 0.62,
  orbPulseIntensity: 0.68,
  rawScores: { ground: 62, orb: 68, sky: 56 },
  smoothedScores: { ground: 62, orb: 68, sky: 56 },
  confidence: { overall: 0.74, ground: 0.74, orb: 0.74, sky: 0.74, label: "high" },
  sourceCoverage: { ground: 0.8, orb: 0.8, sky: 0.8 },
};

export const defaultHomeWorldState = sparseHomeWorldState;

export const homeWorldTierLabels = {
  1: "Dormant",
  2: "Early Recovery",
  3: "Active Growth",
  4: "Symbolic Bloom",
  5: "Awakened Ecosystem",
} as const;
