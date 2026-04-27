import type { EmotionalTone, SymbolicWeight } from "@/spatial/emotion/types";

export type NarratorMoment =
  | "home_idle"
  | "ascent_begin"
  | "lifemap_arrival"
  | "memory_selected"
  | "focus_arrival"
  | "replay_enter"
  | "replay_hold"
  | "replay_exit"
  | "return_home";

export interface NarratorLine {
  id: string;
  moment: NarratorMoment;
  text: string;
  tone: EmotionalTone;
  priority: number;
  delayMs: number;
  durationMs: number;
  voiceHint?: string;
}

export interface Insight {
  id: string;
  memoryId: string;
  title: string;
  meaning: string;
  emotionalTone: EmotionalTone;
  symbolicWeight: SymbolicWeight;
  generatedAt: string;
}
