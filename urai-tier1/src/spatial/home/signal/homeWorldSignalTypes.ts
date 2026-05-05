import type { HomeMoodState, HomeRecoveryState, HomeWorldState, HomeWorldTier } from "../homeWorldTypes";

export type SignalSourceName =
  | "sleep"
  | "stress"
  | "movement"
  | "socialWarmth"
  | "rituals"
  | "memory"
  | "audioTone"
  | "location"
  | "streaks"
  | "manualOverride";

export type NormalizedSignalPoint = {
  source: SignalSourceName;
  value: number;
  confidence: number;
  timestamp: string;
  privacyLabel?: "local" | "private" | "shared-anonymous";
};

export type HomeWorldSignalWindow = {
  userId: string;
  now?: string;
  previousState?: HomeWorldState;
  points: NormalizedSignalPoint[];
  sevenDay?: Partial<Record<SignalSourceName, number>>;
  thirtyDay?: Partial<Record<SignalSourceName, number>>;
};

export type HomeWorldDerivationExplanation = {
  field: keyof HomeWorldState | "overall";
  value: unknown;
  confidence: number;
  reason: string;
  sourceSignals: SignalSourceName[];
  privacySafeSummary: string;
};

export type StableHomeWorldDerivation = {
  state: HomeWorldState;
  explanations: HomeWorldDerivationExplanation[];
  confidence: number;
  upgradeEligible: boolean;
  ceremonyType?: "first-sprout" | "root-awakening" | "bloom-path" | "ecosystem-awakening";
  shouldHoldTier: boolean;
  debugScores: {
    groundScore: number;
    orbScore: number;
    skyScore: number;
    moodScore: number;
    recoveryScore: number;
    confidence: number;
  };
};

export type SignalScoreBundle = {
  sleep: number;
  stress: number;
  movement: number;
  socialWarmth: number;
  rituals: number;
  memory: number;
  audioTone: number;
  location: number;
  streaks: number;
  confidence: number;
};

export type TierStabilityOptions = {
  upgradeMargin: number;
  downgradeMargin: number;
  minConfidenceForUpgrade: number;
  minConfidenceForDowngrade: number;
  maxTierStepPerRun: 1 | 2;
};

export type MoodRecoveryResult = {
  moodState: HomeMoodState;
  recoveryState: HomeRecoveryState;
  moodScore: number;
  recoveryScore: number;
};

export type { HomeWorldTier };
