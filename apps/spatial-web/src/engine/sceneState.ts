
export type SceneMode =
  | "HOME"
  | "SKY"
  | "LIFEMAP"
  | "REPLAY";

export interface SceneContext {
  mode: SceneMode;
  rhythmState: "stable" | "off" | "overstimulated";
  mentalLoad: number; // 0 → 1
}
