'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import HomeEnvironment from '@/spatial/components/HomeEnvironment'
import LifeMapStarfield, { type LifeMapStar } from '@/spatial/components/LifeMapStarfield'
import FocusSubject from '@/spatial/components/FocusSubject'
import ReplayScene from '@/spatial/components/ReplayScene'
import CinematicCameraRig from '@/spatial/components/CinematicCameraRig'

const STARS: LifeMapStar[] = [
  { id: 's1', label: 'North Archive', color: '#9cc9ff', position: [-4.8, 2.2, -7.2], size: 0.22, intensity: 1.35, depthBand: 'foreground' },
  { id: 's2', label: 'Signal Gate', color: '#b9d7ff', position: [-2.3, 1.0, -9.1], size: 0.14, intensity: 0.55, depthBand: 'midground' },
  { id: 's3', label: 'Atlas Node', color: '#a7cfff', position: [-0.2, 2.6, -8.1], size: 0.18, intensity: 1.05, depthBand: 'foreground' },
  { id: 's4', label: 'Quiet Well', color: '#9bbcff', position: [1.6, 0.6, -10.1], size: 0.16, intensity: 0.62, depthBand: 'midground' },
  { id: 's5', label: 'Memory Coast', color: '#bddcff', position: [4.7, 1.2, -8.5], size: 0.20, intensity: 1.15, depthBand: 'foreground' },
  { id: 's6', label: 'Outer Reach', color: '#c8e3ff', position: [3.5, 3.1, -11.8], size: 0.18, intensity: 1.05, depthBand: 'background' },
]

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

const ASCENT_MS = 1600

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function SpatialScene() {
  const [phase, setPhase] = useState<Phase>('HOME')
  const [selectedStarId, setSelectedStarId] = useState<string>(STARS[0].id)
  const [ascentStart, setAscentStart] = useState<number | null>(null)

  const selectedStar = useMemo(
    () => STARS.find((star) => star.id === selectedStarId) ?? STARS[0],
    [selectedStarId]
  )

  useEffect(() => {
    if (phase !== 'ASCENT' || ascentStart === null) return
    const timer = window.setTimeout(() => {
      setPhase('LIFEMAP')
      setAscentStart(null)
    }, ASCENT_MS)
    return () => window.clearTimeout(timer)
  }, [phase, ascentStart])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPhase((current) => {
        if (current === 'REPLAY') return 'FOCUS'
        if (current === 'FOCUS') return 'LIFEMAP'
        if (current === 'LIFEMAP') return 'HOME'
        return current
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const beginAscent = () => {
    if (phase !== 'HOME') return
    setPhase('ASCENT')
    setAscentStart(window.performance.now())
  }

  const openFocus = (starId: string) => {
    if (phase !== 'LIFEMAP') return
    setSelectedStarId(starId)
    setPhase('FOCUS')
  }

  const openReplay = () => {
    if (phase !== 'FOCUS') return
    setPhase('REPLAY')
  }

  const departure = phase === 'ASCENT' && ascentStart !== null
    ? clamp((window.performance.now() - ascentStart) / ASCENT_MS, 0, 1)
    : 0

  const lifeMapOpacity = phase === 'LIFEMAP' ? 1 : phase === 'FOCUS' ? 0.88 : phase === 'REPLAY' ? 0.42 : 0
  const focusSuppression = phase === 'FOCUS' ? 0.16 : phase === 'REPLAY' ? 0.54 : 0

  const statusText =
    phase === 'HOME'
      ? 'HOME — CLICK THE ORB TO BEGIN ASCENT'
      : phase === 'ASCENT'
      ? 'ASCENT — COMMITTED TRAVEL'
      : phase === 'LIFEMAP'
      ? 'LIFEMAP — SELECT A STAR'
      : phase === 'FOCUS'
      ? 'FOCUS — CLICK THE SUBJECT TO ENTER REPLAY • ESC BACKS OUT'
      : 'REPLAY — ENTERED MEMORY PLACE • ESC BACKS OUT'

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#020714',
        overflow: 'hidden',
      }}
    >
      <Canvas camera={{ position: [4.8, 1.55, 8.9], fov: 42 }}>
        <color attach="background" args={['#020714']} />
        <fog attach="fog" args={['#020714', 18, 96]} />

        <ambientLight intensity={0.08} />

        <CinematicCameraRig phase={phase} selected={selectedStar.position} />

        <HomeEnvironment
          visible={phase === 'HOME' || phase === 'ASCENT'}
          interactive={phase === 'HOME'}
          departure={departure}
          onBeginAscent={beginAscent}
        />

        <LifeMapStarfield
          visible={phase === 'LIFEMAP' || phase === 'FOCUS' || phase === 'REPLAY'}
          stars={STARS}
          selectedStarId={selectedStarId}
          onSelectStar={openFocus}
          interactive={phase === 'LIFEMAP'}
          opacity={lifeMapOpacity}
          focusSuppression={focusSuppression}
        />

        <FocusSubject
          visible={phase === 'FOCUS' || phase === 'REPLAY'}
          star={selectedStar}
          interactive={phase === 'FOCUS'}
          opacity={phase === 'FOCUS' ? 1 : phase === 'REPLAY' ? 0.28 : 0}
          onEnterReplay={openReplay}
        />

        <ReplayScene
          visible={phase === 'REPLAY'}
          starId={selectedStar.id}
          opacity={phase === 'REPLAY' ? 1 : 0}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          left: 18,
          bottom: 14,
          color: 'rgba(214,228,255,0.82)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: 12,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        {statusText}
      </div>
    </div>
  )
}
