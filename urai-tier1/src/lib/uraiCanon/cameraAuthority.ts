export type CameraAuthorityPhase = 'home' | 'lifemap' | 'focus' | 'replay'

export function assertSingleCameraWriter(writer: string): string {
  if (!writer || typeof writer !== 'string') {
    throw new Error('[URAI/CAMERA] camera writer id is required')
  }
  return writer
}

export function assertCameraAuthorityPhase(value: unknown): asserts value is CameraAuthorityPhase {
  if (value !== 'home' && value !== 'lifemap' && value !== 'focus' && value !== 'replay') {
    throw new Error(`[URAI/CAMERA] illegal camera authority phase: ${String(value)}`)
  }
}

export function getCameraWriterId(phase: unknown): string {
  assertCameraAuthorityPhase(phase)
  return `cinematic-rig:${phase}`
}

export function assertCameraWriteAllowed(activeWriter: unknown, expectedPhase: unknown): void {
  const writer = assertSingleCameraWriter(String(activeWriter ?? ''))
  const expected = getCameraWriterId(expectedPhase)
  if (writer !== expected) {
    throw new Error(`[URAI/CAMERA] writer mismatch active=${writer} expected=${expected}`)
  }
}
