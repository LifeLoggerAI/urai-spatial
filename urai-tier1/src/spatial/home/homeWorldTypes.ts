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

export type HomeWorldSignalKey =
  | "moodScore"
  | "recoveryScore"
  | "energyScore"
  | "recentStress"
  | "sleepScore"
  | "movementScore"
  | "socialWarmthScore"
  | "ritualCount"
  | "memoryCount"
  | "lifeEventIntensity"
  | "focusScore"
  | "calmScore"
  | "shadowScore";

export type HomeWorldSignalMeta = {
  confidence?: number;
  updatedAt?: string | number | Date;
  enabled?: boolean;
};

export type HomeWorldSignals = {
  userId: string;
  values?: Partial<Record<HomeWorldSignalKey, number>>;
  confidence?: Partial<Record<HomeWorldSignalKey, number>> & { overall?: number };
  updatedAt?: Partial<Record<HomeWorldSignalKey, string | number | Date>>;
  enabledSources?: Partial<Record<HomeWorldSignalKey, boolean>>;
  previousState?: HomeWorldState | null;
  now?: string | number | Date;
  narratorSpeaking?: boolean;

  // V2 compatibility names.
  moodScore?: number;
  recoveryScore?: number;
  energyScore?: number;
  ritualCount?: number;
  memoryCount?: number;
  recentStress?: number;
  sleepQuality?: number;
  sleepScore?: number;
  motionStability?: number;
  movementScore?: number;
  socialWarmth?: number;
  socialWarmthScore?: number;
  lifeEventIntensity?: number;
  focusScore?: number;
  calmScore?: number;
  shadowScore?: number;
};

export type HomeWorldScoreSnapshot = {
  ground: number;
  orb: number;
  sky: number;
};

export type HomeWorldConfidenceSnapshot = {
  overall: number;
  ground: number;
  orb: number;
  sky: number;
  label: "low" | "medium" | "high";
};

export type HomeWorldStateV3Snapshot = {
  version: 3;
  rawScores: HomeWorldScoreSnapshot;
  smoothedScores: HomeWorldScoreSnapshot;
  confidence: HomeWorldConfidenceSnapshot;
  sourceCoverage: Record<"ground" | "orb" | "sky", number>;
  lastDerivedAt: string;
};

export type HomeWorldState = {
  version?: 2 | 3;
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
  rawScores?: HomeWorldScoreSnapshot;
  smoothedScores?: HomeWorldScoreSnapshot;
  confidence?: HomeWorldConfidenceSnapshot;
  sourceCoverage?: Record<"ground" | "orb" | "sky", number>;
  lastDerivedAt?: string;
  lastMoodShiftAt?: string;
  lastRecoveryBloomAt?: string;
  lastTierUpgradeAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExplainableContribution = {
  signal: HomeWorldSignalKey;
  channel: "ground" | "orb" | "sky";
  direction: "lifts" | "steadies" | "softens";
  weight: number;
  scoreBucket: "low" | "medium" | "high";
  confidenceBucket: "low" | "medium" | "high";
  freshnessBucket: "fresh" | "recent" | "fading" | "stale";
  summary: string;
};

export type HomeWorldExplanation = {
  version: 3;
  userId: string;
  headline: string;
  summary: string;
  whyAmISeeingThis: string[];
  ground: string;
  orb: string;
  sky: string;
  mood: string;
  recovery: string;
  confidence: {
    label: HomeWorldConfidenceSnapshot["label"];
    reasons: string[];
  };
  dataSources: {
    enabled: string[];
    coverage: Record<"ground" | "orb" | "sky", number>;
    summary: string;
  };
  contributors: Record<"ground" | "orb" | "sky", ExplainableContribution[]>;
  privacy: {
    rawSignalsStored: false;
    usedRawAudio: false;
    usedContactIdentity: false;
    note: string;
  };
  updatedAt: string;
};

export type DerivedHomeWorldState = {
  state: HomeWorldState & HomeWorldStateV3Snapshot;
  contributors: Record<"ground" | "orb" | "sky", ExplainableContribution[]>;
};

export type HomeWorldAssetGroup = {
  sky: string;
  horizon: string;
  ground: string;
  orb: string;
  avatar: string;
};
