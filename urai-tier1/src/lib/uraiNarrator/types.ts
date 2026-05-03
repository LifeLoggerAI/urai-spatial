import type { Phase } from "@/lib/uraiEmotion/types";

export type NarratorTone =
  | "calm"
  | "reflective"
  | "analytical"
  | "protective"
  | "encouraging"
  | "somber"
  | "awe"
  | "silent";

export type NarratorPerspective =
  | "companion"
  | "coach"
  | "therapist"
  | "analyst"
  | "witness";

export interface NarratorLine {
  id: string;
  text: string;
  tone: NarratorTone;
  perspective: NarratorPerspective;
  phase: Phase;
  priority: number;
  createdAt: number;
  speakAfterMs: number;
  minVisibleMs: number;
  canSpeak: boolean;
  source: "phase" | "memory" | "pattern" | "agent" | "shadow" | "system";
}
