import type { CanonMode } from '@/spatial/contracts/sceneAuthority'

export type Vec3 = [number, number, number]

export type CameraPose = {
  position: Vec3
  target: Vec3
  fov: number
}

export type CameraTransitionKey =
  | 'home_to_lifemap'
  | 'lifemap_to_focus'
  | 'focus_to_replay'
  | 'replay_to_focus'
  | 'focus_to_lifemap'
  | 'lifemap_to_home'
  | 'home_idle'
  | 'lifemap_idle'
  | 'focus_idle'
  | 'replay_idle'

export type CameraTransitionSpec = {
  key: CameraTransitionKey
  from: CanonMode
  to: CanonMode
  durationMs: number
  easing: 'easeInOutCubic'
  overshoot: 0
}

export const CAMERA_TRANSITIONS: Record<CameraTransitionKey, CameraTransitionSpec> = {
  home_to_lifemap: {
    key: 'home_to_lifemap',
    from: 'home',
    to: 'lifemap',
    durationMs: 2200,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  lifemap_to_focus: {
    key: 'lifemap_to_focus',
    from: 'lifemap',
    to: 'focus',
    durationMs: 1900,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  focus_to_replay: {
    key: 'focus_to_replay',
    from: 'focus',
    to: 'replay',
    durationMs: 2400,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  replay_to_focus: {
    key: 'replay_to_focus',
    from: 'replay',
    to: 'focus',
    durationMs: 1600,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  focus_to_lifemap: {
    key: 'focus_to_lifemap',
    from: 'focus',
    to: 'lifemap',
    durationMs: 1700,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  lifemap_to_home: {
    key: 'lifemap_to_home',
    from: 'lifemap',
    to: 'home',
    durationMs: 2100,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  home_idle: {
    key: 'home_idle',
    from: 'home',
    to: 'home',
    durationMs: 0,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  lifemap_idle: {
    key: 'lifemap_idle',
    from: 'lifemap',
    to: 'lifemap',
    durationMs: 0,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  focus_idle: {
    key: 'focus_idle',
    from: 'focus',
    to: 'focus',
    durationMs: 0,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
  replay_idle: {
    key: 'replay_idle',
    from: 'replay',
    to: 'replay',
    durationMs: 0,
    easing: 'easeInOutCubic',
    overshoot: 0,
  },
}

export function getCameraTransitionKey(
  prevMode: CanonMode | null,
  nextMode: CanonMode
): CameraTransitionKey {
  if (!prevMode || prevMode === nextMode) return `${nextMode}_idle` as CameraTransitionKey
  if (prevMode === 'home' && nextMode === 'lifemap') return 'home_to_lifemap'
  if (prevMode === 'lifemap' && nextMode === 'focus') return 'lifemap_to_focus'
  if (prevMode === 'focus' && nextMode === 'replay') return 'focus_to_replay'
  if (prevMode === 'replay' && nextMode === 'focus') return 'replay_to_focus'
  if (prevMode === 'focus' && nextMode === 'lifemap') return 'focus_to_lifemap'
  if (prevMode === 'lifemap' && nextMode === 'home') return 'lifemap_to_home'
  return `${nextMode}_idle` as CameraTransitionKey
}

export function easeInOutCubic(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ]
}

export function lerpPose(a: CameraPose, b: CameraPose, t: number): CameraPose {
  return {
    position: lerpVec3(a.position, b.position, t),
    target: lerpVec3(a.target, b.target, t),
    fov: lerp(a.fov, b.fov, t),
  }
}
