export type CameraPathKind = "none" | "skyToTimeline" | "timelineToSky" | "thresholdDive";

export type CameraPathKeyframe = {
  t: number;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
};

export type CameraPath = {
  kind: CameraPathKind;
  durationMs: number;
  keyframes: CameraPathKeyframe[];
  reason: string;
};

export const SKY_TO_TIMELINE_CAMERA_PATH: CameraPath = {
  kind: "skyToTimeline",
  durationMs: 5200,
  reason: "sky-to-life-map-zoom",
  keyframes: [
    { t: 0, position: [0, 1.4, 7.2], lookAt: [0, 1.2, 0], fov: 54 },
    { t: 0.24, position: [0, 2.1, 5.4], lookAt: [0, 2.2, -4], fov: 49 },
    { t: 0.58, position: [0.4, 3.2, 2.4], lookAt: [0, 3.3, -18], fov: 43 },
    { t: 1, position: [0, 4.2, -8.8], lookAt: [0, 3.4, -30], fov: 38 },
  ],
};

export const TIMELINE_TO_SKY_CAMERA_PATH: CameraPath = {
  kind: "timelineToSky",
  durationMs: 4200,
  reason: "life-map-return-to-sky",
  keyframes: [...SKY_TO_TIMELINE_CAMERA_PATH.keyframes].reverse().map((frame, index, frames) => ({
    ...frame,
    t: frames.length <= 1 ? 0 : index / (frames.length - 1),
  })),
};

export const THRESHOLD_DIVE_CAMERA_PATH: CameraPath = {
  kind: "thresholdDive",
  durationMs: 3600,
  reason: "threshold-memory-dive",
  keyframes: [
    { t: 0, position: [0, 1.6, 6.4], lookAt: [0, 1.4, 0], fov: 52 },
    { t: 0.46, position: [0.2, 2.6, 1.8], lookAt: [0, 2.4, -10], fov: 44 },
    { t: 1, position: [0, 2.9, -4.8], lookAt: [0, 2.8, -18], fov: 36 },
  ],
};

export function createCameraPath(kind: CameraPathKind): CameraPath {
  switch (kind) {
    case "skyToTimeline":
      return SKY_TO_TIMELINE_CAMERA_PATH;
    case "timelineToSky":
      return TIMELINE_TO_SKY_CAMERA_PATH;
    case "thresholdDive":
      return THRESHOLD_DIVE_CAMERA_PATH;
    default:
      return { kind: "none", durationMs: 0, keyframes: [], reason: "no-camera-path" };
  }
}
