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

export type NarratorTone =
  | "calm"
  | "tension"
  | "awe"
  | "grief"
  | "recovery"
  | "neutral";

export type SymbolicWeight = "light" | "medium" | "heavy" | "threshold";

export type EmotionalState = {
  tone: NarratorTone;
  symbolicWeight: SymbolicWeight;
  auraIntensity: number;
};

export type NarratorLine = {
  id: string;
  moment: NarratorMoment;
  text: string;
  tone: NarratorTone;
  priority: number;
  delayMs: number;
  durationMs: number;
  voiceId: string;
  interruptible: boolean;
};
