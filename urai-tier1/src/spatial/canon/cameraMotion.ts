// Shared numerical primitives for the existing, sole camera writer in each
// canvas. These do not own a camera, choose a pose, or prescribe transition time.
export function cameraFrameDelta(deltaSeconds: number, maxSeconds = 0.1): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0
  const limit = Number.isFinite(maxSeconds) ? Math.max(0, maxSeconds) : 0.1
  return Math.min(deltaSeconds, limit)
}

export function cameraDampingAlpha(lambdaPerSecond: number, deltaSeconds: number): number {
  if (!Number.isFinite(lambdaPerSecond) || lambdaPerSecond <= 0) return 0
  return -Math.expm1(-lambdaPerSecond * cameraFrameDelta(deltaSeconds))
}

// Convert an existing 60 Hz lerp coefficient without changing its authored feel.
export function cameraLerpAlpha(alphaAt60Hz: number, deltaSeconds: number): number {
  const delta = cameraFrameDelta(deltaSeconds)
  if (!Number.isFinite(alphaAt60Hz) || alphaAt60Hz <= 0 || delta === 0) return 0
  if (alphaAt60Hz >= 1) return 1
  return -Math.expm1(Math.log1p(-alphaAt60Hz) * delta * 60)
}

export function dampCameraAngle(current: number, target: number, lambdaPerSecond: number, deltaSeconds: number): number {
  const finiteTarget = Number.isFinite(target) ? target : Number.isFinite(current) ? current : 0
  if (!Number.isFinite(current)) return finiteTarget
  const fullTurn = Math.PI * 2
  const difference = (finiteTarget % fullTurn) - (current % fullTurn)
  const shortest = Math.atan2(Math.sin(difference), Math.cos(difference))
  return current + shortest * cameraDampingAlpha(lambdaPerSecond, deltaSeconds)
}
