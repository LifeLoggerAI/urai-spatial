'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TierOneExperience } from '@/spatial/layout/TierOneExperience'
import AscentOverlay, { type AscentPhase, type LifeMapDataStatus } from './AscentOverlay'

const NORMAL_PHASE_MS: Record<AscentPhase, number> = {
  idle: 0,
  homeExiting: 180,
  ascentOpening: 520,
  ascentRevealing: 760,
  waitingForLifeMap: 300,
  lifemapReady: 0,
  error: 0,
}

const REDUCED_PHASE_MS: Record<AscentPhase, number> = {
  idle: 0,
  homeExiting: 40,
  ascentOpening: 80,
  ascentRevealing: 100,
  waitingForLifeMap: 60,
  lifemapReady: 0,
  error: 0,
}

function useReducedMotionPreference() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

function dataIsReady(dataStatus: LifeMapDataStatus) {
  return dataStatus === 'ready' || dataStatus === 'empty'
}

function nextPhase(phase: AscentPhase, dataStatus: LifeMapDataStatus): AscentPhase {
  if (phase === 'idle') return 'homeExiting'
  if (phase === 'homeExiting') return 'ascentOpening'
  if (phase === 'ascentOpening') return 'ascentRevealing'
  if (phase === 'ascentRevealing') return dataIsReady(dataStatus) ? 'lifemapReady' : 'waitingForLifeMap'
  if (phase === 'waitingForLifeMap') return dataIsReady(dataStatus) ? 'lifemapReady' : 'waitingForLifeMap'
  return phase
}

export default function LifeMapAscentGate() {
  const reducedMotion = useReducedMotionPreference()
  const [ascentPhase, setAscentPhase] = useState<AscentPhase>('idle')
  const [lifeMapDataStatus, setLifeMapDataStatus] = useState<LifeMapDataStatus>('loading')
  const timers = useRef<number[]>([])

  const phaseDurations = reducedMotion ? REDUCED_PHASE_MS : NORMAL_PHASE_MS
  const lifeMapInteractive = ascentPhase === 'lifemapReady' && dataIsReady(lifeMapDataStatus)

  useEffect(() => {
    const dataTimer = window.setTimeout(() => setLifeMapDataStatus('ready'), reducedMotion ? 60 : 220)
    timers.current.push(dataTimer)
    return () => window.clearTimeout(dataTimer)
  }, [reducedMotion])

  useEffect(() => {
    if (ascentPhase === 'lifemapReady' || ascentPhase === 'error') return

    const delay = phaseDurations[ascentPhase]
    const timer = window.setTimeout(() => {
      setAscentPhase((current) => nextPhase(current, lifeMapDataStatus))
    }, delay)
    timers.current.push(timer)

    return () => window.clearTimeout(timer)
  }, [ascentPhase, lifeMapDataStatus, phaseDurations])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  const gateMode = useMemo(() => {
    if (ascentPhase === 'error' || lifeMapDataStatus === 'error') return 'error'
    return lifeMapInteractive ? 'ready' : 'opening'
  }, [ascentPhase, lifeMapDataStatus, lifeMapInteractive])

  return (
    <main
      data-testid="urai-spatial-stage"
      data-urai-spatial-stage="life-map"
      data-ascent-phase={ascentPhase}
      data-lifemap-data-status={lifeMapDataStatus}
      data-lifemap-interactive={lifeMapInteractive ? 'true' : 'false'}
      data-lifemap-gate-mode={gateMode}
      aria-busy={lifeMapInteractive ? 'false' : 'true'}
    >
      <TierOneExperience mode="life-map" />
      <AscentOverlay phase={ascentPhase} dataStatus={lifeMapDataStatus} reducedMotion={reducedMotion} />
    </main>
  )
}

export { nextPhase }
