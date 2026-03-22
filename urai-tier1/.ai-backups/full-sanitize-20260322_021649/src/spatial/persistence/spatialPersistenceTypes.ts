import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { XrInputSnapshot } from "../xr/xrInputTypes";

export const SPATIAL_PERSISTENCE_STORAGE_KEY = "urai.spatial.persistence";
export const SPATIAL_PERSISTENCE_SCHEMA = "urai.spatial.persistence.v1";

export type SpatialArPlacement = {
  enabled: boolean;
  placed: boolean;
  planeTracked: boolean;
  anchors: number;
  visible: boolean;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
};

export type SpatialLocomotion = {
  active: boolean;
  mode: string;
  speed: number;
  turnStyle: string;
  userX: number;
  userY: number;
  userZ: number;
  moveX: number;
  moveY: number;
  moveZ: number;
  turnDelta: number;
  yaw: number;
};

export type SpatialHeadset = {
  connected: boolean;
  name: string | null;
  sessionMode: string;
  refreshRate: number | null;
  presenting: boolean;
};

export type SpatialPersistenceSnapshot = {
  schema: typeof SPATIAL_PERSISTENCE_SCHEMA;
  savedAt: string;
  sceneMode: string;
  selectedStarId: string | null;
  selectedStarLabel: string | null;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
  arPlacement: SpatialArPlacement;
  locomotion: SpatialLocomotion;
  starCount: number;
  headset: SpatialHeadset;
  metrics: {
    fps: number | null;
    frameTimeMs: number | null;
  };
};

export const spatialPersistenceSample: SpatialPersistenceSnapshot = {
  schema: SPATIAL_PERSISTENCE_SCHEMA,
  savedAt: new Date(0).toISOString(),
  sceneMode: "home",
  selectedStarId: null,
  selectedStarLabel: null,
  presenting: false,
  hasHeadsetPose: false,
  xrInput: {
    controllers: {
      left: {
        connected: false,
        profile: null,
        selecting: false,
        squeezing: false,
        hasGamepad: false,
      },
      right: {
        connected: false,
        profile: null,
        selecting: false,
        squeezing: false,
        hasGamepad: false,
      },
    },
    hands: {
      left: {
        connected: false,
        tracking: false,
        pinching: false,
        jointsTracked: 0,
        trackingState: "idle",
      },
      right: {
        connected: false,
        tracking: false,
        pinching: false,
        jointsTracked: 0,
        trackingState: "idle",
      },
    },
    handedness: null,
    trackingState: "idle",
    pointerActive: false,
    squeezeActive: false,
    selectActive: false,
  },
  arPlacement: {
    enabled: false,
    placed: false,
    planeTracked: false,
    anchors: 0,
    visible: false,
    x: 0,
    y: 0,
    z: 0,
    qx: 0,
    qy: 0,
    qz: 0,
    qw: 1,
  },
  locomotion: {
    active: false,
    mode: "none",
    speed: 0,
    turnStyle: "snap",
    userX: 0,
    userY: 0,
    userZ: 0,
    moveX: 0,
    moveY: 0,
    moveZ: 0,
    turnDelta: 0,
    yaw: 0,
  },
  starCount: 0,
  headset: {
    connected: false,
    name: null,
    sessionMode: "inline",
    refreshRate: null,
    presenting: false,
  },
  metrics: {
    fps: null,
    frameTimeMs: null,
  },
};

export default spatialPersistenceSample;
