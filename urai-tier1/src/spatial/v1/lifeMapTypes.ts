export type SpatialMode = 'home' | 'ascent' | 'lifeMap' | 'focus' | 'replay' | 'mirror' | 'returning';

export type AccessibilityMotionMode = 'full' | 'reduced' | 'crossfadeOnly';
export type PrivacyLevel = 'publicSafe' | 'privateSummary' | 'privateDetail' | 'hidden';

export type LifeMapNodeType =
  | 'memory'
  | 'insight'
  | 'ritual'
  | 'dream'
  | 'relationship'
  | 'recovery'
  | 'shadow'
  | 'milestone'
  | 'chapter'
  | 'voiceMoment'
  | 'locationMoment'
  | 'emotionalShift'
  | 'habitPattern'
  | 'socialPattern'
  | 'threshold'
  | 'rebirth'
  | 'legacy'
  | 'mirrorMoment';

export type LifeMapEdgeType =
  | 'recoveryPath'
  | 'relationshipArc'
  | 'shadowSeason'
  | 'purposeThread'
  | 'habitLoop'
  | 'dreamToMemory'
  | 'thresholdToRebirth'
  | 'chapterLine'
  | 'ritualLink';

export type MoodState = {
  primary: 'calm' | 'low' | 'recovery' | 'dream' | 'shadow' | 'focus' | 'joy';
  intensity: number;
  auraColor: string;
  skyTone: string;
  narratorTone: 'quiet' | 'warm' | 'clear' | 'protective' | 'wonder';
};

export type CognitiveState = {
  clarity: 'clear' | 'overloaded' | 'fatigued' | 'focused';
  fogDensity: number;
  particleTempo: number;
  portalSharpness: number;
};

export type RecoveryState = {
  phase: 'resting' | 'reopening' | 'repairing' | 'integrating' | 'rebirth';
  glow: number;
  groundRootDepth: number;
  smootherOrbPulse: boolean;
};

export type RhythmState = {
  label: 'stable' | 'offRhythm' | 'overstimulated' | 'recovering';
  score: number;
  horizonLevel: number;
};

export type RelationshipAtmosphere = {
  warmth: number;
  silenceDistance: number;
  repairGlow: number;
  tensionParticles: number;
};

export type PassiveSignalFreshness = {
  lastUpdatedAt: string;
  freshness: 'live' | 'recent' | 'stale' | 'demo';
  sourceCount: number;
  privacyNote: string;
};

export type HomeWorldState = {
  mode: 'home';
  mood: MoodState;
  cognitive: CognitiveState;
  recovery: RecoveryState;
  rhythm: RhythmState;
  relationshipAtmosphere: RelationshipAtmosphere;
  signalFreshness: PassiveSignalFreshness;
  orbWhisper?: string;
  skyPortalReady: boolean;
};

export type LifeMapPosition = {
  x: number;
  y: number;
  z: number;
};

export type LifeMapNode = {
  id: string;
  type: LifeMapNodeType;
  title: string;
  subtitle: string;
  timestamp: string;
  emotionalTone: string;
  emotionalIntensity: number;
  importance: number;
  unresolvedness: number;
  position: LifeMapPosition;
  color: string;
  auraColor: string;
  size: number;
  pulseSpeed: number;
  glyph: string;
  relatedNodeIds: string[];
  narratorLine: string;
  whyThis: string;
  privacyLevel: PrivacyLevel;
  sourceSignals: string[];
  chapterId?: string;
  seasonId?: string;
  createdAt: string;
  updatedAt: string;
};

export type LifeMapEdge = {
  id: string;
  type: LifeMapEdgeType;
  fromNodeId: string;
  toNodeId: string;
  title: string;
  color: string;
  strength: number;
  narratorLine: string;
  privacyLevel: PrivacyLevel;
  createdAt: string;
  updatedAt: string;
};

export type LifeMapChapter = {
  id: string;
  title: string;
  subtitle: string;
  startAt: string;
  endAt?: string;
  dominantTone: string;
  nodeIds: string[];
  narratorLine: string;
};

export type LifeMapSeason = {
  id: string;
  title: string;
  tone: 'spring' | 'summer' | 'autumn' | 'winter' | 'threshold';
  color: string;
  startAt: string;
  endAt?: string;
  nodeIds: string[];
  nebulaPosition: LifeMapPosition;
};

export type MemoryScroll = {
  nodeId: string;
  title: string;
  poeticSummary: string;
  contextLines: string[];
  whyThis: string;
  privacyLevel: PrivacyLevel;
};

export type NarratorInsight = {
  id: string;
  nodeId?: string;
  line: string;
  tone: 'gentle' | 'clear' | 'protective' | 'wonder' | 'grounding';
  safetyNote?: string;
  createdAt: string;
};

export type ReplayPath = {
  id: string;
  title: string;
  nodeIds: string[];
  edgeIds: string[];
  points: LifeMapPosition[];
  captionLines: string[];
  durationMs: number;
  privacyLevel: PrivacyLevel;
};

export type MirrorOfBecomingState = {
  id: string;
  activeNodeId?: string;
  activeReplayPathId?: string;
  patternTitle: string;
  symbolicGlyph: string;
  insight: string;
  safeLanguage: true;
  createdAt: string;
};

export type UserSpatialPreferences = {
  motionMode: AccessibilityMotionMode;
  highContrast: boolean;
  hiddenNodeTypes: LifeMapNodeType[];
  showNarratorCaptions: boolean;
  showWhyThis: boolean;
  allowHaptics: boolean;
  defaultPrivacyLevel: PrivacyLevel;
};

export type SpatialState = {
  mode: SpatialMode;
  selectedNodeId?: string;
  activeReplayPathId?: string;
  activeMirrorStateId?: string;
  previousMode?: SpatialMode;
  navigationStack: SpatialMode[];
  preferences: UserSpatialPreferences;
};
