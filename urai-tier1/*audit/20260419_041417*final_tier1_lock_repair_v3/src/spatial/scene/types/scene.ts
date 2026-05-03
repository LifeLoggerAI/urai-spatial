export type ScenePhase = "HOME" | "LIFEMAP" | "FOCUS" | "REPLAY";

export type SelectedStar = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
  title: string;
  chapter?: string;
  summary?: string;
};
