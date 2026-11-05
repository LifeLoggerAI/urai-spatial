export type FocusCameraFrame = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

/** Fit the existing 1.15-radius Memory Star without moving its world-space center. */
export function getFocusFrame(viewportAspect: number): FocusCameraFrame {
  const aspect = Number.isFinite(viewportAspect) && viewportAspect > 0
    ? Math.min(3.2, Math.max(0.35, viewportAspect))
    : 16 / 9
  const portrait = aspect < 0.85
  const wideLandscape = aspect >= 2
  const fov = 46
  const tangent = Math.tan(fov * Math.PI / 360)

  // Portrait leaves space above the context and navigation dock. Short landscape
  // sits below the right-hand dock and to the right of the memory details.
  const diameter = portrait ? Math.min(0.32, aspect * 0.74) : wideLandscape ? 0.34 : 0.42
  const centerX = portrait ? 0 : wideLandscape ? 0.14 : 0.08
  const centerY = portrait ? 0.19 : wideLandscape ? -0.16 : 0.06
  const radius = 1.15
  const distance = radius * Math.sqrt(1 + 1 / (diameter * diameter * tangent * tangent))

  return {
    position: [0, 0.35 + distance * 0.065, -1.55 + distance],
    target: [-centerX * distance * tangent * aspect, 0.35 - centerY * distance * tangent, -1.55],
    fov,
  }
}

/** Move a Life Map arrival into Focus's coordinate system without changing its view. */
export function rebaseFocusEntryFrame(frame: FocusCameraFrame | null): FocusCameraFrame | null {
  if (!frame || !Array.isArray(frame.position) || !Array.isArray(frame.target)
    || frame.position.length !== 3 || frame.target.length !== 3
    || ![...frame.position, ...frame.target, frame.fov].every(Number.isFinite)) return null

  const offset: [number, number, number] = [
    frame.position[0] - frame.target[0],
    frame.position[1] - frame.target[1],
    frame.position[2] - frame.target[2],
  ]
  const distance = Math.hypot(...offset)
  if (!Number.isFinite(distance) || distance === 0) return null

  return {
    position: [offset[0], 0.35 + offset[1], -1.55 + offset[2]],
    target: [0, 0.35, -1.55],
    fov: Math.min(68, Math.max(36, frame.fov)),
  }
}
