export type VoiceEngine = "elevenlabs" | "google" | "none";

export type SpatialAudioPhase =
  | "HOME"
  | "ASCENT"
  | "LIFEMAP"
  | "FOCUS"
  | "REPLAY";

export type AmbientTrack =
  | "home"
  | "ascent"
  | "lifemap"
  | "focus"
  | "replay";

export interface NarratorAudioLine {
  id: string;
  text: string;
  phase?: SpatialAudioPhase;
  tone?: string;
  voiceHint?: string;
}

export interface AudioState {
  activeEngine: VoiceEngine;
  isSpeaking: boolean;
  currentClipId?: string;
}

export interface AmbientState {
  track: AmbientTrack;
  intensity: number;
}
