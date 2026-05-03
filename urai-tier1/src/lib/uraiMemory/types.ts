import type { CrossModalSignal } from "@/lib/uraiEmotion/types";

export interface UraiMemoryEvent {
  id: string;
  userId?: string;
  title?: string;
  timestamp: number;
  source?: "passive" | "voice" | "text" | "gps" | "calendar" | "system";
  emotionSignals?: CrossModalSignal[];
  tags?: string[];
  people?: string[];
  locationHash?: string;
  baseWeight?: number;
  recencyWeight?: number;
  emotionalWeight?: number;
  recurrenceWeight?: number;
  interactionWeight?: number;
  shadowWeight?: number;
  finalWeight?: number;
  memoryWeight?: number;
}
