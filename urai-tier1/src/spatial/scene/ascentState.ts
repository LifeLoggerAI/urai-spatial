export type AscentPhase =
  | 'idle'
  | 'ascentPreparing'
  | 'ascentEntering'
  | 'ascentTunneling'
  | 'ascentRevealing'
  | 'lifemapHydrating'
  | 'lifemapReady'
  | 'ascentError'
  | 'reducedMotionAscent'

export type LifeMapDataStatus =
  | 'notRequested'
  | 'preloading'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'

export const ASCENT_TOTAL_DURATION_MS = 2240

export const ASCENT_TIMING_MS = {
  preparing: { start: 0, end: 300 },
  entering: { start: 300, end: 900 },
  tunneling: { start: 900, end: 1550 },
  revealing: { start: 1550, end: 2050 },
  ready: { start: 2050, end: ASCENT_TOTAL_DURATION_MS },
} as const

export const ASCENT_EASING = {
  commit: 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
  lift: 'easeInOutCubic',
  reveal: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

export function resolveAscentPhase({
  elapsedMs,
  reducedMotion,
  dataStatus,
}: {
  elapsedMs: number
  reducedMotion: boolean
  dataStatus: LifeMapDataStatus
}): AscentPhase {
  if (dataStatus === 'error') return 'ascentError'
  if (reducedMotion) return dataStatus === 'ready' || dataStatus === 'empty' ? 'lifemapReady' : 'reducedMotionAscent'
  if (elapsedMs < ASCENT_TIMING_MS.preparing.end) return 'ascentPreparing'
  if (elapsedMs < ASCENT_TIMING_MS.entering.end) return 'ascentEntering'
  if (elapsedMs < ASCENT_TIMING_MS.tunneling.end) return 'ascentTunneling'
  if (elapsedMs < ASCENT_TIMING_MS.revealing.end) return 'ascentRevealing'
  if (dataStatus === 'ready' || dataStatus === 'empty') return 'lifemapReady'
  return 'lifemapHydrating'
}

export function canInteractWithLifeMap(phase: AscentPhase, dataStatus: LifeMapDataStatus) {
  return phase === 'lifemapReady' && (dataStatus === 'ready' || dataStatus === 'empty')
}

export function shouldAdvanceToLifeMap(phase: AscentPhase) {
  return phase === 'lifemapReady'
}
