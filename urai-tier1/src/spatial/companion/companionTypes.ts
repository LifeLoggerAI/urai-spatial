import type { LifeMapMode, LifeMapNode, LifeMapPhase } from "../scene/lifeMapModel";

export type CompanionMood =
  | "quiet"
  | "curious"
  | "protective"
  | "celebratory"
  | "reflective"
  | "concerned"
  | "grounding";

export type CompanionContext =
  | "home"
  | "lifemap"
  | "focus"
  | "replay"
  | "mirror"
  | "recovery"
  | "shadow"
  | "dream"
  | "relationship"
  | "threshold";

export type CompanionMemorySignal = {
  id: string;
  timestamp: string;
  source: string;
  emotionalTone: string;
  intensity: number;
  relatedNodeId?: string | null;
  summary: string;
  privacyLevel: "private" | "circle" | "shareable";
};

export type CompanionLine = {
  id: string;
  context: CompanionContext;
  mood: CompanionMood;
  text: string;
  triggerReason: string;
  priority: number;
  cooldownMinutes: number;
};

export type CompanionState = {
  userId?: string;
  currentMood: CompanionMood;
  currentContext: CompanionContext;
  lastSpokenAt?: string | null;
  lastLineId?: string | null;
  trustLevel: number;
  familiarityLevel: number;
  silencePreference: number;
  recentThemes: string[];
  activeConcern?: string | null;
  activeCelebration?: string | null;
  voiceEnabled?: boolean;
  updatedAt?: string;
};

export type CompanionFeedback = "tell_more" | "not_now" | "helped";

export type CompanionSceneInput = {
  phase: LifeMapPhase | "ascent";
  mode: LifeMapMode;
  selectedNode?: LifeMapNode | null;
  showReplay?: boolean;
  visibleNodes?: LifeMapNode[];
  now?: Date;
  tapped?: boolean;
};

export type CompanionDecision = {
  line: CompanionLine;
  context: CompanionContext;
  mood: CompanionMood;
  shouldSpeak: boolean;
  reason: string;
};
