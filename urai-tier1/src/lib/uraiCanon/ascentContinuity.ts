export type Vec3Like = [number, number, number] | number[]
export type PoseLike = {
  position: Vec3Like
  target?: Vec3Like
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
}

function smooth01(v: number) {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}

function getZ(v?: Vec3Like) {
  return Array.isArray(v) && v.length >= 3 ? Number(v[2] ?? 0) : 0
}

export function getAscentCameraBias(progress: number, fromPose: PoseLike, nextPose: PoseLike) {
  const t = smooth01(progress)
  const travel = Math.max(0, getZ(fromPose.position) - getZ(nextPose.position))
  const gain = Math.min(1, travel / 80)

  return {
    forward: gain * (2.2 + 7.0 * t * t),
    lift: gain * (0.10 + 0.58 * t),
    lookForward: gain * (1.0 + 3.4 * t),
    lookLift: gain * (0.04 + 0.22 * t),
    continuityNear: 0.20 + 0.80 * t,
    continuityMid: 0.12 + 0.62 * t,
    continuityFar: 0.06 + 0.34 * t,
  }
}

export function getAscentContinuity(progress: number) {
  const t = smooth01(progress)
  return {
    skyFade: 1 - t,
    horizonFade: 1 - Math.min(1, t * 0.92),
    starReveal: clamp01((t - 0.08) / 0.92),
    nearAlpha: 0.22 + 0.98 * t,
    midAlpha: 0.14 + 0.72 * t,
    farAlpha: 0.08 + 0.46 * t,
    vignette: 0.02 + 0.22 * t,
  }
}
