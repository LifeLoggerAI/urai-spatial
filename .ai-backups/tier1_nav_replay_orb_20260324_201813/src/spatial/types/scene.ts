export type ScenePhase = "home" | "ascent" | "lifemap" | "focus" | "replay" | "return";

export type StarDepthBand = "near" | "mid" | "far";

export type SelectedStar = {
  id: string;
  title: string;
  chapter: string;
  summary: string;
  dateLabel: string;
  position: [number, number, number];
  color: string;
  size: number;
  depthBand: StarDepthBand;
  memoryTone: string;
};
