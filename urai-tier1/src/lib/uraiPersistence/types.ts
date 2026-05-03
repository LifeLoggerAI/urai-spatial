export type UraiPersistedPhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type UraiPersistedMemory = {
  id: string;
  title: string;
  memoryType: string;
  emotionalTone: string;
  memoryWeight: number;
  auraIntensity: number;
  position: [number, number, number];
  updatedAt: number;
};

export type UraiPatternSnapshot = {
  dominantArc: string;
  relatedMemoryIds: string[];
  relatedTitles: string[];
  nextSuggestedFocusId: string | null;
  chainLine: string;
  systemInsight: string;
  updatedAt: number;
};

export type UraiCompanionSnapshot = {
  mode: string;
  presence: number;
  suggestedAction: string;
  confidence: number;
  whisper: string;
  updatedAt: number;
};

export type UraiSessionSnapshot = {
  sessionId: string;
  phase: UraiPersistedPhase;
  selectedStarId: string | null;
  lastPhase: UraiPersistedPhase;
  replayEnteredAt: number;
  updatedAt: number;
};

export type UraiPersistenceSnapshot = {
  version: 1;
  session: UraiSessionSnapshot;
  memories: UraiPersistedMemory[];
  pattern: UraiPatternSnapshot;
  companion: UraiCompanionSnapshot;
};
