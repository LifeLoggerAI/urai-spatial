export type Phase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type EmotionKey =
  | "calm"
  | "joy"
  | "grief"
  | "anger"
  | "fear"
  | "focus"
  | "awe"
  | "loneliness"
  | "hope"
  | "overload"
  | "neutral";

export type SymbolicArchetype =
  | "Builder"
  | "Survivor"
  | "Seeker"
  | "Guardian"
  | "Ghost"
  | "Phoenix"
  | "Oracle"
  | "Wanderer";

export interface EmotionBlend {
  key: EmotionKey;
  weight: number;
}

export interface CrossModalSignal {
  source:
    | "voice"
    | "text"
    | "gps"
    | "device"
    | "calendar"
    | "motion"
    | "ambient"
    | "manual"
    | "memory";
  emotion: EmotionKey;
  confidence: number;
  intensity: number;
  timestamp: number;
  decayHalfLifeMs: number;
  metadata?: Record<string, unknown>;
}

export interface EmotionalState {
  primary: EmotionKey;
  secondary?: EmotionKey;
  blends: EmotionBlend[];
  intensity: number;
  volatility: number;
  valence: number;
  arousal: number;
  clarity: number;
  symbolicWeight: number;
  archetype: SymbolicArchetype;
  updatedAt: number;
}
