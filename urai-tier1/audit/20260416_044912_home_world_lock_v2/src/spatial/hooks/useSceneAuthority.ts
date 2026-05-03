'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type SpatialPhase =
  | 'HOME'
  | 'ASCENT'
  | 'ENTER_LIFEMAP'
  | 'LIFEMAP'
  | 'OPEN_FOCUS'
  | 'FOCUS'
  | 'OPEN_REPLAY'
  | 'REPLAY'
  | 'CLOSE_REPLAY'
  | 'CLOSE_FOCUS'

type Actions = {
  beginAscent: () => void
  openFocus: (starId?: string | null) => void
  openReplay: (starId?: string | null) => void
  closeReplay: () => void
  leaveFocus: () => void
  goHome: () => void
}

type Authority = {
  phase: SpatialPhase
  selectedStarId: string | null
  actions: Actions
}

const TIMING = {
  ASCENT_TO_ENTER_LIFEMAP: 1100,
  ENTER_LIFEMAP_TO_LIFEMAP: 650,
  OPEN_FOCUS_TO_FOCUS: 360,
  OPEN_REPLAY_TO_REPLAY: 360,
  CLOSE_REPLAY_TO_FOCUS: 320,
  CLOSE_FOCUS_TO_LIFEMAP: 320,
} as const

export default function useSceneAuthority(): Authority {
  const [phase, setPhase] = useState<SpatialPhase>('HOME')
  const [selectedStarId, setSelectedStarId] = useState<string | null>('star-4')
  const timersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
  }, [])

  const schedule = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms)
    timersRef.current.push(id)
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const beginAscent = useCallback(() => {
    if (phase !== 'HOME') return
    clearTimers()
    setPhase('ASCENT')
    schedule(TIMING.ASCENT_TO_ENTER_LIFEMAP, () => setPhase('ENTER_LIFEMAP'))
    schedule(TIMING.ASCENT_TO_ENTER_LIFEMAP + TIMING.ENTER_LIFEMAP_TO_LIFEMAP, () => setPhase('LIFEMAP'))
  }, [phase, clearTimers, schedule])

  const openFocus = useCallback((starId?: string | null) => {
    if (!(phase === 'LIFEMAP' || phase === 'ENTER_LIFEMAP' || phase === 'CLOSE_FOCUS')) return
    clearTimers()
    if (starId) setSelectedStarId(starId)
    setPhase('OPEN_FOCUS')
    schedule(TIMING.OPEN_FOCUS_TO_FOCUS, () => setPhase('FOCUS'))
  }, [phase, clearTimers, schedule])

  const openReplay = useCallback((starId?: string | null) => {
    if (!(phase === 'FOCUS' || phase === 'OPEN_FOCUS' || phase === 'CLOSE_REPLAY')) return
    clearTimers()
    if (starId) setSelectedStarId(starId)
    setPhase('OPEN_REPLAY')
    schedule(TIMING.OPEN_REPLAY_TO_REPLAY, () => setPhase('REPLAY'))
  }, [phase, clearTimers, schedule])

  const closeReplay = useCallback(() => {
    if (!(phase === 'REPLAY' || phase === 'OPEN_REPLAY')) return
    clearTimers()
    setPhase('CLOSE_REPLAY')
    schedule(TIMING.CLOSE_REPLAY_TO_FOCUS, () => setPhase('FOCUS'))
  }, [phase, clearTimers, schedule])

  const leaveFocus = useCallback(() => {
    if (!(phase === 'FOCUS' || phase === 'OPEN_FOCUS' || phase === 'CLOSE_REPLAY')) return
    clearTimers()
    setPhase('CLOSE_FOCUS')
    schedule(TIMING.CLOSE_FOCUS_TO_LIFEMAP, () => setPhase('LIFEMAP'))
  }, [phase, clearTimers, schedule])

  const goHome = useCallback(() => {
    if (!(phase === 'LIFEMAP' || phase === 'ENTER_LIFEMAP' || phase === 'CLOSE_FOCUS')) return
    clearTimers()
    setPhase('HOME')
  }, [phase, clearTimers])

  return {
    phase,
    selectedStarId,
    actions: {
      beginAscent,
      openFocus,
      openReplay,
      closeReplay,
      leaveFocus,
      goHome,
    },
  }
}
