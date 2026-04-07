export type Vec3 = [number, number, number];

export type SceneMode = 'home' | 'ground' | 'lifemap' | 'focus' | 'replay';

export type SpatialStar = {
  id: string;
  label: string;
  chapter: string;
  position: Vec3;
  color: string;
  size: number;
};

export type XrInputSnapshot = {
  handedness: "left" | "right" | null;
  pointerActive: boolean;
  squeezeActive: boolean;
  selectActive: boolean;
};

export type XrState = {
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
};

export type SpatialPersistenceSnapshot = {
  schema: "urai.spatial.persistence.v1";
  savedAt: string;
  sceneMode: SceneMode;
  selectedStarId: string | null;
  selectedStar: string | null;
  selectedStarLabel: string | null;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
};

export type UnityRuntimePayload = {
  schema: "urai.spatial.unity.v1";
  sentAt: string;
  sceneMode: SceneMode;
  selectedStarId: string | null;
  selectedStarLabel: string | null;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
};

export type ReplayState = {
  active: boolean;
  starId: string | null;
  chapter: string | null;
};
