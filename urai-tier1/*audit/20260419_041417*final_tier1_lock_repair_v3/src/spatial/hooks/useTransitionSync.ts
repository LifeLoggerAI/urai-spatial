'use client'

export function useTransitionSync(authority: any) {
  const mode = authority?.mode ?? authority?.sceneMode ?? authority?.viewMode ?? 'HOME'
  const phase = authority?.transitionPhase ?? null
  const transitionLock = Boolean(authority?.transitionLock ?? authority?.isTransitioning ?? authority?.inputLocked ?? false)

  const isReplayPhase = phase === 'open_replay' || phase === 'close_replay'
  const isFocusPhase = phase === 'open_focus' || phase === 'close_focus'
  const isLifeMapArrival = phase === 'arrive_lifemap'
  const isHomeReturn = phase === 'go_home'

  const showHomeLayer =
    mode === 'HOME' ||
    mode === 'ascent' ||
    isHomeReturn

  const showLifeMapLayer =
    mode === 'LIFEMAP' ||
    mode === 'FOCUS' ||
    mode === 'REPLAY' ||
    isLifeMapArrival ||
    isFocusPhase ||
    isReplayPhase

  const showFocusLayer =
    mode === 'FOCUS' ||
    mode === 'REPLAY' ||
    phase === 'open_focus' ||
    isReplayPhase

  const showReplayLayer =
    mode === 'REPLAY' ||
    isReplayPhase

  return {
    mode,
    phase,
    transitionLock,
    lockEnvelope: transitionLock,
    inputLocked: transitionLock || mode === 'ascent',
    canInteract: !(transitionLock || mode === 'ascent'),
    showHomeLayer,
    showLifeMapLayer,
    showFocusLayer,
    showReplayLayer,
    isolation: {
      showHomeLayer,
      showLifeMapLayer,
      showFocusLayer,
      showReplayLayer,
    },
  }
}

export default useTransitionSync
