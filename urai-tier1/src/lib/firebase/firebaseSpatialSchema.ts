import type { Timestamp } from "firebase/firestore";

export type SpatialWorldMode = "private" | "publicPreview" | "demo";
export type SpatialRealm = "home" | "lifeMap" | "biome" | "dream" | "shadow" | "legacy" | "arVr";
export type SkyTheme = "calm" | "storm" | "dawn" | "night" | "aurora" | "shadow";
export type LifeMapNodeType = "memory" | "mood" | "ritual" | "relationship" | "recovery" | "dream" | "forecast" | "legacy" | "shadow";
export type PrivacyLevel = "private" | "publicSafe" | "demo";
export type ConstellationRelationType = "sameMood" | "samePerson" | "sameSeason" | "recoveryArc" | "ritualChain" | "forecastLink" | "legacyThread";
export type BiomePeriod = "day" | "week" | "month" | "season";
export type TerrainType = "ocean" | "forest" | "desert" | "storm" | "garden" | "void" | "aurora";
export type CompanionMood = "quiet" | "curious" | "protective" | "joyful" | "shadow" | "reflective";
export type CompanionVoiceTone = "soft" | "warm" | "clear" | "ritual" | "silent";
export type RitualType = "reflection" | "release" | "recovery" | "gratitude" | "legacy" | "shadow";
export type RitualStatus = "suggested" | "started" | "completed" | "dismissed";
export type SpatialDeviceType = "mobile" | "desktop" | "vr" | "ar";
export type VisualIntensity = "low" | "medium" | "high";
export type ArVrAnchorType = "memory" | "portal" | "companion" | "ritual" | "legacy";
export type ArVrMode = "webxr" | "mobileAr" | "vr";
export type LegacyExportStatus = "draft" | "ready" | "exported";

export interface SpatialVector3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialWorld {
  userId: string;
  mode: SpatialWorldMode;
  activeRealm: SpatialRealm;
  skyTheme: SkyTheme;
  emotionalWeather: {
    mood: string;
    intensity: number;
    valence: number;
    arousal: number;
  };
  companionStateId: string;
  activeBiomeId?: string;
  lastGeneratedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LifeMapNode {
  userId: string;
  type: LifeMapNodeType;
  title: string;
  summary: string;
  timestamp: Timestamp;
  position: SpatialVector3;
  visual: {
    color: string;
    size: number;
    glow: number;
    glyph?: string;
    aura?: string;
  };
  sourceRefs: {
    collection: string;
    id: string;
  }[];
  emotionalTags: string[];
  privacyLevel: PrivacyLevel;
  createdAt: Timestamp;
}

export interface MemoryStar {
  userId: string;
  nodeId: string;
  brightness: number;
  pulseRate: number;
  constellationGroupId?: string;
  position: SpatialVector3;
  label?: string;
  unlocked: boolean;
  previewSafe: boolean;
}

export interface ConstellationEdge {
  userId: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: ConstellationRelationType;
  strength: number;
  visible: boolean;
  createdAt: Timestamp;
}

export interface EmotionalBiome {
  userId: string;
  period: BiomePeriod;
  dominantMood: string;
  terrainType: TerrainType;
  intensityMap: {
    stress: number;
    recovery: number;
    joy: number;
    fatigue: number;
    connection: number;
  };
  visualParams: {
    fogDensity: number;
    particleDensity: number;
    horizonGlow: number;
    skyMotion: number;
  };
  generatedAt: Timestamp;
}

export interface CompanionState {
  userId: string;
  mood: CompanionMood;
  message: string;
  voiceTone: CompanionVoiceTone;
  orb: {
    color: string;
    glow: number;
    pulseRate: number;
    scale: number;
  };
  suggestedAction?: {
    label: string;
    route: string;
    type: "reflection" | "ritual" | "lifeMap" | "forecast";
  };
  updatedAt: Timestamp;
}

export interface RitualEvent {
  userId: string;
  nodeId?: string;
  title: string;
  type: RitualType;
  prompt: string;
  status: RitualStatus;
  visualGlyph: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface MoodForecast {
  userId: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  forecastMood: string;
  confidence: number;
  riskSignals: string[];
  supportiveSignals: string[];
  visual: {
    skyShift: string;
    cloudSpeed: number;
    glowColor: string;
  };
  generatedAt: Timestamp;
}

export interface SpatialSession {
  userId: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  deviceType: SpatialDeviceType;
  interactions: {
    type: string;
    targetId?: string;
    timestamp: Timestamp;
  }[];
  enteredRealms: string[];
}

export interface UserWorldSettings {
  reducedMotion: boolean;
  audioEnabled: boolean;
  hapticsEnabled: boolean;
  visualIntensity: VisualIntensity;
  defaultRealm: "home" | "lifeMap";
  accessibilityLabels: boolean;
  updatedAt: Timestamp;
}

export interface ArVrAnchor {
  userId: string;
  nodeId?: string;
  anchorType: ArVrAnchorType;
  worldPosition: SpatialVector3;
  realWorldAnchor?: {
    latitude?: number;
    longitude?: number;
    planeId?: string;
  };
  supportedModes: ArVrMode[];
  createdAt: Timestamp;
}

export interface LegacyScroll {
  userId: string;
  title: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  nodeIds: string[];
  narrative: string;
  visualTheme: string;
  exportStatus: LegacyExportStatus;
  createdAt: Timestamp;
}

export interface ShadowRealmEvent {
  userId: string;
  title: string;
  summary: string;
  severity: number;
  sourceSignals: string[];
  nodeId?: string;
  suggestedRitualId?: string;
  privacyLevel: "private";
  createdAt: Timestamp;
}

export interface DreamMapNode {
  userId: string;
  title: string;
  symbols: string[];
  emotionalTone: string;
  linkedMemoryNodeIds: string[];
  position: SpatialVector3;
  createdAt: Timestamp;
}

export const SPATIAL_COLLECTIONS = {
  spatialWorlds: "spatialWorlds",
  lifeMapNodes: "lifeMapNodes",
  memoryStars: "memoryStars",
  constellationEdges: "constellationEdges",
  emotionalBiomes: "emotionalBiomes",
  companionStates: "companionStates",
  ritualEvents: "ritualEvents",
  moodForecasts: "moodForecasts",
  spatialSessions: "spatialSessions",
  userWorldSettings: "userWorldSettings",
  arVrAnchors: "arVrAnchors",
  legacyScrolls: "legacyScrolls",
  shadowRealmEvents: "shadowRealmEvents",
  dreamMapNodes: "dreamMapNodes",
} as const;
