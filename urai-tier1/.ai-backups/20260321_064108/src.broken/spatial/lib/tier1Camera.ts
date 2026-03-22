export type Vec3 = [number, number, number];

export type Tier1Mode =
  | "home"
  | "ground"
  | "object"
  | "transitionToLifemap"
  | "lifemap"
  | "focus"
  | "replay"
  | "transitionHome";

export type CameraPreset = {
  position: Vec3;
  target: Vec3;
  fov?: number;
};

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  home: {
    position: [0, 2.4, 9.6],
    target: [0, 1.35, 0],
    fov: 42,
  },
  ground: {
    position: [0, 1.15, 5.1],
    target: [0, 0.9, -0.9],
    fov: 46,
  },
  object: {
    position: [1.9, 1.35, 3.55],
    target: [0, 0.95, -1.1],
    fov: 40,
  },
  transitionToLifemap: {
    position: [0, 3.8, 7.8],
    target: [0, 1.6, -6],
    fov: 44,
  },
  lifemap: {
    position: [0, 0.4, 12.5],
    target: [0, 0.1, -12],
    fov: 48,
  },
  focus: {
    position: [0, 0.2, 5.2],
    target: [0, 0, -3.2],
    fov: 34,
  },
  replay: {
    position: [0, 0.25, 4.8],
    target: [0, 0, -2.8],
    fov: 34,
  },
  transitionHome: {
    position: [0, 2.5, 9.4],
    target: [0, 1.3, 0],
    fov: 42,
  },
};

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function easeCubic(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

export function snapCameraToPreset(camera: any, controls: any, preset: CameraPreset) {
  camera.position.set(...preset.position);
  if (typeof camera.fov === "number" && typeof preset.fov === "number") {
    camera.fov = preset.fov;
    camera.updateProjectionMatrix?.();
  }
  if (controls?.target?.set) {
    controls.target.set(...preset.target);
    controls.update?.();
  } else if (camera?.lookAt) {
    camera.lookAt(...preset.target);
  }
}
