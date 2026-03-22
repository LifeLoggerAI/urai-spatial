export type Vec3 = [number, number, number];

export type SceneMode =
  | "home"
  | "ground"
  | "object"
  | "lifemap"
  | "focus"
  | "replay";

export type GroundObjectId = "anchor" | "car" | "totem";

export interface GroundObject {
  id: GroundObjectId;
  label: string;
  description: string;
  position: Vec3;
  color: string;
  shape: "box" | "car" | "capsule";
}

export interface MemoryStar {
  id: string;
  position: Vec3;
  color: string;
  baseScale: number;
  category: "memory" | "signal" | "milestone";
}
