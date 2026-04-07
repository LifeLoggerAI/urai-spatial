import type { CameraConvergenceSpec, CameraPose, PerformanceBudget, Vec3 } from "./types";

export const CANON_CAMERA = {
  clip: {
    near: 0.1,
    far: 2000,
  },
  fov: {
    home: 50,
    lifeMap: 48,
    focus: 44,
    replay: 46,
  },
  home: {
    pose: {
      position: { x: 0, y: 1.6, z: 6 },
      target: { x: 0, y: 1.2, z: 0 },
      fov: 50,
    } satisfies CameraPose,
    settle: {
      durationMs: 1600,
      maxDriftAmplitude: 0.02,
      idleFrequencyHz: 0.05,
    },
  },
  lifeMap: {
    pose: {
      position: { x: 0, y: 0.25, z: 11.5 },
      target: { x: 0, y: 0, z: -20 },
      fov: 48,
    } satisfies CameraPose,
    nearFieldDriftMax: 0.01,
    forbidGroundVisible: true,
    forbidHorizonVisible: true,
  },
  focus: {
    finalTargetOffset: { x: 0, y: 0, z: 0 } satisfies Vec3,
    finalDistanceFromStar: 2.2,
    isolationFieldRadius: 7.5,
  },
  replay: {
    perspectiveYawLimitDeg: 10,
    perspectivePitchLimitDeg: 6,
    forbidFreeTranslation: true,
  },
} as const;

export const FOCUS_CONVERGENCE: CameraConvergenceSpec = {
  durationMs: 2100,
  lockInPct: 0.2,
  convergePct: 0.6,
  compressPct: 0.2,
  minDistanceToTarget: 2.2,
  forbidOrbit: true,
  forbidOvershoot: true,
};

export const REPLAY_ENTRY = {
  durationMs: 1400,
  continueIntoStar: true,
  forbidCut: true,
  forbidFovJump: true,
} as const;

export const ESC_UNWIND = {
  replayToFocusMs: 1200,
  focusToLifeMapMs: 1600,
  lifeMapToHomeMs: 2000,
} as const;

export const PERFORMANCE_BUDGET: PerformanceBudget = {
  targetFps: 60,
  maxDrawCalls: 150,
  maxActiveParticles: 2000,
  maxBloomIntensity: 0.8,
  maxDynamicLights: 3,
};

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function canonConvergence(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  if (t < 0.2) {
    return 0.15 * easeInCubic(t / 0.2);
  }

  if (t < 0.8) {
    const local = (t - 0.2) / 0.6;
    return 0.15 + 0.65 * local;
  }

  const local = (t - 0.8) / 0.2;
  return 0.8 + 0.2 * easeOutCubic(local);
}
