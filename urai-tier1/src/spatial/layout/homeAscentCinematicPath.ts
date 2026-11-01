/**
 * Review-only original UrAi WebGL Ascent path. Keeps actual terrain in view
 * during takeoff and gradually turns to the cosmic sky before LifeMap arrival.
 * No screenshot animation, synthetic motion, or publication authority.
 */
export type AscentPoint = readonly [number, number, number]

// The original endpoint at z=-54 is beyond Home's authored terrain; z=-16 is within bounds.
export const HOME_ASCENT_CAMERA_DESTINATION: AscentPoint = [0, 38, -16]
export const HOME_ASCENT_GROUND_LOOK: AscentPoint = [0, 1, -9]
export const HOME_ASCENT_COSMIC_LOOK: AscentPoint = [0, 42, -52]
export const HOME_ASCENT_LOOK_SKY_START = 0.34
export const HOME_ASCENT_LOOK_SKY_END = 0.88

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}
function mixPoint(a: AscentPoint, b: AscentPoint, t: number): AscentPoint {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
/** Progress is provided by the existing R3F eased Ascent clock; do not fabricate it. */
export function homeAscentCameraPose(start: AscentPoint, progress: number) {
  const t = clamp01(progress)
  const skyWindow = clamp01((t - HOME_ASCENT_LOOK_SKY_START) / (HOME_ASCENT_LOOK_SKY_END - HOME_ASCENT_LOOK_SKY_START))
  const skyReveal = skyWindow * skyWindow * (3 - 2 * skyWindow)
  return {
    position: mixPoint(start, HOME_ASCENT_CAMERA_DESTINATION, t),
    lookAt: mixPoint(HOME_ASCENT_GROUND_LOOK, HOME_ASCENT_COSMIC_LOOK, skyReveal),
    skyReveal,
  }
}
