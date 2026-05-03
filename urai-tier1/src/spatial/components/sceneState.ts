export type ScenePhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type StarPoint = {
  id: string;
  title?: string;
  position?: [number, number, number];
  x?: number;
  y?: number;
  z?: number;
  size?: number;
  radius?: number;
  intensity?: number;
  importance?: number;
  color?: string;
};
