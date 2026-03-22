export type SpatialVoicePlaybackStatus =
  | "idle"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export type SpatialVoicePlaybackState = {
  status: SpatialVoicePlaybackStatus;
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
  availableVoiceCount: number;
  lastError: string | null;
};

export function createDefaultSpatialVoicePlaybackState(): SpatialVoicePlaybackState {
  return {
    status: "idle",
    voiceURI: null,
    rate: 1,
    pitch: 1,
    volume: 1,
    availableVoiceCount: 0,
    lastError: null,
  };
}
