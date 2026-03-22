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
};

export type GroundObject = {
  id: string;
  position: Vec3;
  scale: number;
  kind: "cube" | "cone" | "capsule";
};
