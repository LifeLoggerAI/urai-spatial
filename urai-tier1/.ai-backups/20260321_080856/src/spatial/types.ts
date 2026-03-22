export type Vec3 = [number, number, number];

export type SceneMode =
  | "home"
  | "lifemap"
  | "replay"
  | "ground";

export interface StarData {
  id: string;
  position: Vec3;
  color?: string;
  size?: number;
}
