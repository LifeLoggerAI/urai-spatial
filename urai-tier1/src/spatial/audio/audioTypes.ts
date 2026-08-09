export type VoiceEngine = "elevenlabs" | "google" | "none";

export type SpatialAudioPhase =
  | "HOME"
  | "GROUND"
  | "ASCENT"
  | "LIFEMAP"
  | "FOCUS"
  | "REPLAY";

export type AmbientTrack =
  | "home"
  | "ground"
  | "lifemap"
  | "focus"
  | "replay";

export type SpatialAudioCue = "transition" | "orb-confirm" | "error";

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
