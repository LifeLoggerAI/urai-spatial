'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { Tier1Phase } from '@/canon/tier1'

export type CanonPhase = Tier1Phase

type SceneAuthority = {
  phase: CanonPhase
  selectedStarId: string | null
  focusLockedUntil: number
  actions: {
    beginAscent: () => void
    openLifeMap: () => void
    openFocus: (starId: string) => void
    closeFocus: () => void
    openReplay: (starId?: string | null) => void
    closeReplay: () => void
    goHome: () => void
  }
}

const ASCENT_HOLD_MS = 1600
const FOCUS_MIN_HOLD_MS = 900

export default function useSceneAuthority(): SceneAuthority {
  const [phase, setPhase] = useState<CanonPhase>('HOME')
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null)
  const [focusLockedUntil, setFocusLockedUntil] = useState<number>(0)
  const ascentTimerRef = useRef<number | null>(null)

  const clearAscentTimer = useCallback(() => {
    if (ascentTimerRef.current !== null) {
      window.clearTimeout(ascentTimerRef.current)
      ascentTimerRef.current = null
    }
  }, [])

  const beginAscent = useCallback(() => {
    clearAscentTimer()
    setPhase('ASCENT')
    ascentTimerRef.current = window.setTimeout(() => {
      setPhase('LIFEMAP')
    }, ASCENT_HOLD_MS)
  }, [clearAscentTimer])

  const openLifeMap = useCallback(() => {
    clearAscentTimer()
    setPhase('LIFEMAP')
  }, [clearAscentTimer])

  const openFocus = useCallback((starId: string) => {
    clearAscentTimer()
    setSelectedStarId(starId)
    setPhase('FOCUS')
    setFocusLockedUntil(Date.now() + FOCUS_MIN_HOLD_MS)
  }, [clearAscentTimer])

  const closeFocus = useCallback(() => {
    if (phase !== 'FOCUS') return
    setPhase('LIFEMAP')
  }, [phase])

  const openReplay = useCallback((starId?: string | null) => {
    const now = Date.now()
    const nextStarId = starId ?? selectedStarId ?? null
    if (!nextStarId) return
    if (phase !== 'FOCUS') return
    if (now < focusLockedUntil) return

    setSelectedStarId(nextStarId)
    setPhase('REPLAY')
  }, [phase, selectedStarId, focusLockedUntil])

  const closeReplay = useCallback(() => {
    if (phase !== 'REPLAY') return
    setPhase('FOCUS')
    setFocusLockedUntil(Date.now() + 350)
  }, [phase])

  const goHome = useCallback(() => {
    clearAscentTimer()
    setSelectedStarId(null)
    setFocusLockedUntil(0)
    setPhase('HOME')
  }, [clearAscentTimer])

  const actions = useMemo(() => ({
    beginAscent,
    openLifeMap,
    openFocus,
    closeFocus,
    openReplay,
    closeReplay,
    goHome,
  }), [
    beginAscent,
    openLifeMap,
    openFocus,
    closeFocus,
    openReplay,
    closeReplay,
    goHome,
  ])

  return {
    phase,
    selectedStarId,
    focusLockedUntil,
    actions,
  }
}
