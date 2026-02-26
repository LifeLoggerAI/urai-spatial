
// As per user spec, with a placeholder for EmotionType
export type EmotionType = "calm" | "heavy" | "elevated" | "neutral";

export enum SpatialTransitionState {
  IDLE = 'IDLE',
  HOVER = 'HOVER',
  LOCKED = 'LOCKED',
  COMMITTING = 'COMMITTING',
  PRELOADING = 'PRELOADING',
  TRANSITIONING = 'TRANSITIONING',
  ROUTING = 'ROUTING',
  REPLAY_ACTIVE = 'REPLAY_ACTIVE',
  ERROR = 'ERROR'
}

export interface SpatialState {
  system: {
    version: string;
    mode: "dev" | "demo" | "prod";
    deterministic: boolean;
  };

  identity: {
    userId: string;
    sessionId: string;
    identityHash: string;
  };

  scene: {
    active: "home" | "lifemap" | "replay";
    transitionState: SpatialTransitionState;
  };

  camera: {
    presetId: string;
    locked: boolean;
  };

  emotion: {
    primary: EmotionType;
    intensity: number;
  };

  replay: {
    activeReplayId?: string;
    starId?: string;
    progress: number;
    immutableHash?: string;
  };
}

// Generic action for reducers
export interface Action {
  type: string;
  payload?: any;
}
