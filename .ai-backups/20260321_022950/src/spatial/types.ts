export type SceneMode = "home" | "lifemap" | "replay" | "ground" | "object";

export type Vec3 = [number, number, number];

export type SpatialStar = {
  id: string;
  position: Vec3;
  color: string;
  size: number;
  label: string;
  chapter?: string;
  timeband?: string;
  signature?: string;
};

export type SelectedStar = SpatialStar | null;

export type XrState = {
  active: boolean;
  xrInput?: {
    handedness?: string | null;
    selectActive?: boolean;
    squeezeActive?: boolean;
  };
};
