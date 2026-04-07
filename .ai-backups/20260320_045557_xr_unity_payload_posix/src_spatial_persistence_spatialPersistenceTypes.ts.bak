import type { ArPlacementPose } from "@/spatial/xr/arPlacementTypes";
import type { XrInputSnapshot } from "@/spatial/xr/xrInputTypes";
import type { XrLocomotionState } from "@/spatial/xr/xrLocomotionTypes";
import type { HeadsetCameraSyncState } from "@/spatial/lib/headsetCameraSync";

export type SpatialPersistenceSnapshot = {
  schema: "urai.spatial.persistence.v1";
  savedAt: string;
  sceneMode: string;
  selectedStarId: string | null;
  selectedStarLabel: string | null;
  headset: HeadsetCameraSyncState;
  xrInput: XrInputSnapshot;
  arPlacement: ArPlacementPose;
  locomotion: XrLocomotionState;
  metrics: {
    starCount: number;
  };
};

export const SPATIAL_PERSISTENCE_STORAGE_KEY = "urai.spatial.persistence.v1";

export function createEmptySpatialPersistenceSnapshot(): SpatialPersistenceSnapshot {
  return {
    schema: "urai.spatial.persistence.v1",
    savedAt: new Date(0).toISOString(),
    sceneMode: "home",
    selectedStarId: null,
    selectedStarLabel: null,
    headset: {
      presenting: false,
      hasHeadsetPose: false,
      selectedStarId: null,
      handoffMode: "idle",
    },
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
          jointsTracked: 0,
          trackingState: "idle",
        },
        right: {
          connected: false,
          jointsTracked: 0,
          trackingState: "idle",
        },
      },
    },
    arPlacement: {
      visible: false,
      x: 0,
      y: 0,
      z: 0,
      qx: 0,
      qy: 0,
      qz: 0,
      qw: 1,
      hasPlane: false,
    },
    locomotion: {
      active: false,
      mode: "idle",
      userX: 0,
      userY: 0,
      userZ: 0,
      yaw: 0,
      inputMoveX: 0,
      inputMoveY: 0,
      inputTurnX: 0,
    },
    metrics: {
      starCount: 0,
    },
  };
}
