export type ReplayCameraFrame = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

// Adopted Tier-2 settling tolerances (docs/spatial/TIER2_CANON.md). This gate
// measures the existing camera writer; it does not prescribe another path.
export const REPLAY_ARRIVAL_SETTLE = {
  positionError: 0.035,
  lookError: 0.030,
  velocityMagnitude: 0.012,
  framesRequired: 6,
  interactionReleaseDelayMs: 80,
} as const

function entryVector(value: string | null, bounds: readonly (readonly [number, number])[]): [number, number, number] | null {
  if (!value) return null
  const parts = value.split(',')
  if (parts.length !== 3 || parts.some((part) => !part.trim())) return null
  const vector = parts.map(Number)
  if (vector.some((number, index) => !Number.isFinite(number) || number < bounds[index][0] || number > bounds[index][1])) return null
  return [vector[0], vector[1], vector[2]]
}

/** A Focus frame is a view checkpoint, never authority to admit a memory world. */
export function replayEntryCameraFrame(params: URLSearchParams, selectedStarId: string): ReplayCameraFrame | null {
  if (params.get('cameraCheckpoint') !== `focus:${selectedStarId}`) return null
  // OrbitControls permits a wider pose than the keyboard exploration clamps.
  const position = entryVector(params.get('entryCamera'), [[-32, 32], [-32, 32], [-32, 32]])
  const target = entryVector(params.get('entryTarget'), [[-5.5, 5.5], [-1, 4], [-5.5, 1]])
  const rawFov = params.get('entryFov')
  const fov = rawFov?.trim() ? Number(rawFov) : NaN
  if (!position || !target || !Number.isFinite(fov) || fov < 36 || fov > 68) return null
  const distance = Math.hypot(...position.map((value, index) => value - target[index]))
  if (distance < 2.5 || distance > 24) return null
  return { position, target, fov }
}

/** Keep the adopted small replay arc, driven solely by memory time. */
export function replayCameraFrame(timeMs: number, durationMs: number, reducedMotion: boolean): ReplayCameraFrame {
  const time = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0
  const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0
  const progress = duration > 0 ? Math.min(1, time / duration) : 0
  return {
    position: reducedMotion ? [0, 0.28, 7.25] : [(progress - 0.5) * 0.22, 0.28 + Math.sin(time * 0.00022) * 0.028, 7.25 - progress * 0.48],
    target: [0, 0.16, -6.8],
    fov: 50,
  }
}
