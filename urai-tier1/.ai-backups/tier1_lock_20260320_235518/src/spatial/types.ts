export type SceneMode = "home" | "lifemap" | "replay" | "ground" | "object";

export type Vec3 = [number, number, number];

export type StarData = {
  id: string;
  label: string;
  position: Vec3;
  color: string;
  size: number;
  glow: number;
  chapter?: string;
};

export type XrInputSnapshot = {
  handedness: "left" | "right" | "none" | null;
  pointerActive: boolean;
  squeezeActive: boolean;
  selectActive: boolean;
};

export type XrStateSnapshot = {
  presenting: boolean;
  headsetPose: Vec3 | null;
  xrInput: XrInputSnapshot;
};

export type SpatialRuntimePayload = {
  schema: "urai.spatial.runtime.v1";
  generatedAt: string;
  mode: SceneMode;
  selectedStarId: string | null;
  selectedObjectId: string | null;
  presenting: boolean;
  starCount: number;
  xrInput: XrInputSnapshot;
};

export type SpatialPersistenceSnapshot = {
  schema: "urai.spatial.persistence.v1";
  savedAt: string;
  sceneMode: SceneMode;
  selectedStarId: string | null;
  selectedStarLabel: string | null;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
  arPlacement: {
    anchored: boolean;
    position: Vec3 | null;
  };
  locomotion: {
    velocity: number;
    active: boolean;
  };
  starCount: number;
  headset: {
    pose: Vec3 | null;
  };
  metrics: {
    frameBudget: number;
    motionState: "idle" | "moving";
  };
};

export type RollbackPoint = {
  createdAt: string;
  channel: string;
  sceneMode: SceneMode;
  selectedStarId: string | null;
  snapshot: SpatialPersistenceSnapshot | null;
};

export type ObjectNodeData = {
  id: string;
  position: Vec3;
  scale?: number;
  kind?: "cube" | "capsule" | "cone";
};
