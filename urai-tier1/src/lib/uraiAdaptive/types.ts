export type UraiAdaptivePhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type UraiAdaptiveSignal = {
  phase: UraiAdaptivePhase;
  selectedMemoryType: string | null;
  selectedTone: string | null;
  dominantArc: string;
  companionMode: string;
  companionAction: string;
  memoryWeight: number;
  auraIntensity: number;
  timestamp: number;
};

export type UraiAdaptiveProfile = {
  version: 1;
  totalSignals: number;
  phaseCounts: Record<string, number>;
  toneCounts: Record<string, number>;
  arcCounts: Record<string, number>;
  memoryTypeCounts: Record<string, number>;
  companionModeCounts: Record<string, number>;
  preferredNarratorTempo: "slow" | "balanced" | "direct";
  preferredCompanionMode: "idle" | "witness" | "guide" | "guardian" | "reflector";
  dominantTone: string;
  dominantArc: string;
  updatedAt: number;
};

export type UraiAdaptiveOutput = {
  profile: UraiAdaptiveProfile;
  narratorTempoMultiplier: number;
  companionPresenceMultiplier: number;
  visualSensitivityMultiplier: number;
  adaptiveLine: string;
};
