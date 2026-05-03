export type PassiveEventType =
  | "call_start"
  | "call_end"
  | "app_switch"
  | "screen_unlock"
  | "screen_idle"
  | "notification_open"
  | "movement_sample"
  | "message_sent"
  | "message_received";

export type InsightType =
  | "post_call_energy_drop"
  | "digital_agitation_spike"
  | "focus_burst"
  | "social_drain_pattern"
  | "recovery_rebound";

export type InsightSeverity = "low" | "medium" | "high";
export type InsightFeedbackResponse = "accurate" | "not_quite" | "wrong" | "hide_type";

export type PassiveEvent = {
  id: string;
  userId: string;
  type: PassiveEventType;
  timestamp: number;
  contactId?: string;
  appId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
};

export type UserBaseline = {
  userId: string;
  appSwitchesPer20Min: number;
  unlocksPer20Min: number;
  movementPerHour: number;
  avgSessionLengthMin: number;
  avgReplyDelayMin: number;
  idleMinutesPer20Min: number;
  updatedAt: number;
  trustScore?: number;
};

export type StateWindow = {
  id: string;
  userId: string;
  start: number;
  end: number;
  appSwitchCount: number;
  unlockCount: number;
  notificationOpenCount: number;
  movementScore: number;
  idleMinutes: number;
  sessionDepthScore: number;
  contactId?: string;
  stateScore: number;
};

export type InsightEvidence = {
  signal: string;
  observed: number | string;
  baseline?: number | string;
  weight: number;
};

export type InsightCandidate = {
  id: string;
  userId: string;
  insightType: InsightType;
  title: string;
  sentence: string;
  confidence: number;
  severity: InsightSeverity;
  start: number;
  end: number;
  evidence: InsightEvidence[];
  relatedContactId?: string;
  suppressionReason?: string;
  lifeMapScore?: number;
};

export type ProofDrawer = {
  insightId: string;
  why: string;
  signalsUsed: string[];
  timeRange: { start: number; end: number };
  confidence: number;
  evidence: {
    label: string;
    observed: string;
    baseline?: string;
    impact: "low" | "medium" | "high";
  }[];
  privacy: {
    processed: "local" | "cloud";
    usedContactIdentity: boolean;
    storedRawAudio: boolean;
  };
};

export type UraiInsight = InsightCandidate & {
  createdAt: number;
  savedToLifeMap: boolean;
  lifeMapStarId?: string;
  proofDrawer: ProofDrawer;
  userFeedback?: InsightFeedbackResponse;
};

export type TodayInsightCache = {
  userId: string;
  dateKey: string;
  topInsight?: UraiInsight;
  insightQueue: UraiInsight[];
  updatedAt: number;
};
