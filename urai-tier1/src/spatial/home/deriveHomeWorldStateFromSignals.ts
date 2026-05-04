import { defaultHomeWorldState } from "./homeWorldDefaults";
import type { HomeMoodState, HomeRecoveryState, HomeWorldState, HomeWorldTier } from "./homeWorldTypes";

export type HomeWorldSignalInput = {
  userId: string;
  moodScore?: number;
  recoveryScore?: number;
  energyScore?: number;
  ritualCount?: number;
  memoryCount?: number;
  recentStress?: number;
  sleepQuality?: number;
  motionStability?: number;
  socialWarmth?: number;
  lifeEventIntensity?: number;
  narratorSpeaking?: boolean;
};

export type HomeWorldDerivationReason = {
  field: keyof HomeWorldState;
  value: HomeWorldState[keyof HomeWorldState];
  reason: string;
  sourceSignals: Array<keyof HomeWorldSignalInput>;
};

export type DerivedHomeWorldState = {
  state: HomeWorldState;
  reasons: HomeWorldDerivationReason[];
};

function clamp(value: number | undefined, fallback: number, min = 0, max = 100) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function tierFromScore(score: number): HomeWorldTier {
  if (score >= 84) return 5;
  if (score >= 66) return 4;
  if (score >= 42) return 3;
  if (score >= 22) return 2;
  return 1;
}

function moodFromSignals(input: HomeWorldSignalInput): HomeMoodState {
  const stress = clamp(input.recentStress, 20);
  const mood = clamp(input.moodScore, 52);
  const recovery = clamp(input.recoveryScore, 45);
  const sleep = clamp(input.sleepQuality, 55);
  const lifeEvent = clamp(input.lifeEventIntensity, 20);

  if (lifeEvent > 78 && stress > 62) return "shadow";
  if (recovery > 68 && stress < 58) return "recovery";
  if (sleep < 35 && mood < 42) return "low";
  if (mood > 78 && recovery > 62) return "joy";
  if (mood > 58 && stress < 38) return "focused";
  if (sleep > 72 && lifeEvent > 48) return "dream";
  return "calm";
}

function recoveryFromScore(score: number): HomeRecoveryState {
  if (score >= 84) return "awakened";
  if (score >= 64) return "growing";
  if (score >= 44) return "stable";
  if (score >= 22) return "recovering";
  return "dormant";
}

export function deriveHomeWorldStateFromSignals(input: HomeWorldSignalInput): DerivedHomeWorldState {
  const moodScore = clamp(input.moodScore, 52);
  const recoveryScore = clamp(input.recoveryScore, 45);
  const energyScore = clamp(input.energyScore, Math.round((moodScore + recoveryScore) / 2));
  const ritualScore = Math.min(100, clamp(input.ritualCount, 0, 0, 30) * 4);
  const memoryScore = Math.min(100, clamp(input.memoryCount, 0, 0, 80) * 1.25);
  const stress = clamp(input.recentStress, 20);
  const sleep = clamp(input.sleepQuality, 55);
  const motion = clamp(input.motionStability, 55);
  const social = clamp(input.socialWarmth, 50);
  const moodState = moodFromSignals(input);
  const recoveryState = recoveryFromScore(recoveryScore);

  const groundScore = recoveryScore * 0.42 + ritualScore * 0.24 + memoryScore * 0.18 + motion * 0.16;
  const orbScore = energyScore * 0.38 + moodScore * 0.3 + social * 0.18 + recoveryScore * 0.14;
  const skyScore = moodScore * 0.34 + sleep * 0.22 + energyScore * 0.22 + (100 - stress) * 0.22;
  const timestamp = new Date().toISOString();

  const state: HomeWorldState = {
    ...defaultHomeWorldState,
    userId: input.userId,
    groundTier: tierFromScore(groundScore),
    orbTier: tierFromScore(orbScore),
    skyTier: tierFromScore(skyScore),
    moodState,
    recoveryState,
    energyScore,
    narratorSpeaking: Boolean(input.narratorSpeaking),
    skyWeatherIntensity: skyScore / 100,
    groundGrowthIntensity: groundScore / 100,
    orbPulseIntensity: orbScore / 100,
    updatedAt: timestamp,
  };

  return {
    state,
    reasons: [
      {
        field: "groundTier",
        value: state.groundTier,
        reason: "Ground tier is derived from recovery, rituals, memory density, and motion stability.",
        sourceSignals: ["recoveryScore", "ritualCount", "memoryCount", "motionStability"],
      },
      {
        field: "orbTier",
        value: state.orbTier,
        reason: "Orb tier is derived from energy, mood, social warmth, and recovery strength.",
        sourceSignals: ["energyScore", "moodScore", "socialWarmth", "recoveryScore"],
      },
      {
        field: "skyTier",
        value: state.skyTier,
        reason: "Sky tier is derived from mood, sleep quality, energy, and lower recent stress.",
        sourceSignals: ["moodScore", "sleepQuality", "energyScore", "recentStress"],
      },
      {
        field: "moodState",
        value: state.moodState,
        reason: "Mood state is selected from mood, recovery, stress, sleep, and life-event intensity.",
        sourceSignals: ["moodScore", "recoveryScore", "recentStress", "sleepQuality", "lifeEventIntensity"],
      },
    ],
  };
}
