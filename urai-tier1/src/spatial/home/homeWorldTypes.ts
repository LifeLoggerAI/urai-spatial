export type HomeWorldTier = 1 | 2 | 3 | 4 | 5;

export type HomeMoodState =
  | "calm"
  | "low"
  | "recovery"
  | "dream"
  | "shadow"
  | "focused"
  | "joy";

export type HomeRecoveryState =
  | "dormant"
  | "recovering"
  | "stable"
  | "growing"
  | "awakened";

export type HomeWorldState = {
  userId: string;
  groundTier: HomeWorldTier;
  orbTier: HomeWorldTier;
  skyTier: HomeWorldTier;
  moodState: HomeMoodState;
  recoveryState: HomeRecoveryState;
  energyScore: number;
  narratorSpeaking: boolean;
  skyWeatherIntensity: number;
  groundGrowthIntensity: number;
  orbPulseIntensity: number;
  lastMoodShiftAt?: string;
  lastRecoveryBloomAt?: string;
  lastTierUpgradeAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type HomeWorldAssetGroup = {
  sky: string;
  horizon: string;
  ground: string;
  orb: string;
  avatar: string;
};
