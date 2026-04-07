"use client";

export type Vec3 = [number, number, number];

export type SceneMode = "home" | "lifemap" | "replay" | "ground";

export type SpatialStar = {
  id: string;
  label: string;
  chapter: string;
  position: Vec3;
  color: string;
  size: number;
  glow: number;
};

export type XrInputSnapshot = {
  handedness: "left" | "right" | null;
  : boolean;
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
  selectedStarLabel: string | null;
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
  arPlacement: { active: boolean; anchored: boolean };
  locomotion: { mode: "static" | "teleport" | "smooth"; speed: number };
  starCount: number;
  headset: { supported: boolean; connected: boolean };
  metrics: { fpsHint: number; quality: "low" | "medium" | "high" };
};

export type SpatialAnalyticsPoint = {
  at: string;
  channel: "spatial";
  sceneMode: SceneMode;
  selectedStarId: string | null;
  snapshot: SpatialPersistenceSnapshot;
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
  arPlacement: { active: boolean; anchored: boolean };
  locomotion: { mode: "static" | "teleport" | "smooth"; speed: number };
  starCount: number;
  headset: { supported: boolean; connected: boolean };
  metrics: { fpsHint: number; quality: "low" | "medium" | "high" };
};

export type ReplayState = {
  active: boolean;
  starId: string | null;
  chapter: string | null;
};
