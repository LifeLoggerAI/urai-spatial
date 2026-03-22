export type SceneMode = "home" | "lifemap" | "replay" | "ground" | "object";

export type TransitionPhase =
  | "idle"
  | "to-lifemap"
  | "lifemap"
  | "star-focus"
  | "to-replay"
  | "replay"
  | "from-replay"
  | "to-home"
  | "to-ground"
  | "ground"
  | "object-focus";

export type Vec3 = [number, number, number];

export type StarData = {
  id: string;
  label: string;
  position: Vec3;
  color: string;
  size: number;
  glow: number;
  chapter?: string | null;
  timeband?: string | null;
  signature?: string | null;
  title?: string | null;
  tags?: string[];
};

export type SpatialStar = StarData;

export type GroundObject = {
  id: string;
  position: Vec3;
  scale: number;
  kind: "cube" | "cone" | "capsule";
};

export type ObjectNodeData = {
  id: string;
  position: Vec3;
  scale?: number;
  kind?: "cube" | "cone" | "capsule";
};

export type XrInputState = {
  handedness: "left" | "right" | "none" | null;
  pointerActive: boolean;
  squeezeActive: boolean;
  selectActive: boolean;
};

export type XrState = {
  presenting: boolean;
  xrInput: XrInputState;
};

export type SpatialRuntimePayload = {
  schema: "urai.spatial.runtime.v1";
  mode: SceneMode;
  phase: TransitionPhase;
  selectedStarId: string | null;
  selectedObjectId: string | null;
  presenting: boolean;
  xrInput: XrInputState;
  starCount: number;
};

export type UnityRuntimePayloadInput = {
  mode?: SceneMode;
  phase?: TransitionPhase;
  selectedStarId?: string | null;
  selectedObjectId?: string | null;
  presenting?: boolean;
  xrInput?: Partial<XrInputState>;
  starCount?: number;
};

export type SpatialPersistenceSnapshot = {
  schema: "urai.spatial.persistence.v1";
  sceneMode: SceneMode;
  phase?: TransitionPhase;
  selectedStarId: string | null;
  selectedObjectId?: string | null;
  presenting: boolean;
  starCount: number;
};

export type RollbackPoint = {
  createdAt: string;
  channel: string;
  sceneMode: SceneMode;
  selectedStarId: string | null;
  snapshot: SpatialPersistenceSnapshot | null;
};
