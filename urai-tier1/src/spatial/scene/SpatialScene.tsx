"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from "@react-three/fiber"
import * as THREE from 'three'
import CinematicCameraRig from '@/spatial/components/CinematicCameraRig'
import HomeEnvironment from '@/spatial/scene/HomeEnvironment'
import Starfield from '@/spatial/components/Starfield'
import FocusSubject from '@/spatial/components/FocusSubject'
import ReplayScene from "@/spatial/components/ReplayScene"
import ReplayEnvironment from "@/spatial/components/ReplayEnvironment"
import useSceneAuthority from '@/spatial/hooks/useSceneAuthority'
import { useSpatialFeatureEnabled } from '@/lib/tier-locks/client'

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
type HomePhase = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'

type SpatialStar = {
  id: string
  position: [number, number, number]
  color?: string
  size?: number
}

const STARS: SpatialStar[] = [
  { id: 'star-1', position: [0.0, 1.15, -7.4], color: '#9fd3ff', size: 0.14 },
  { id: 'star-2', position: [-2.2, 1.85, -8.7], color: '#b8a6ff', size: 0.13 },
  { id: 'star-3', position: [2.3, 0.95, -9.5], color: '#7ce2ff', size: 0.13 },
  { id: 'star-4', position: [-3.1, 0.25, -10.8], color: '#ffd6a8', size: 0.125 },
  { id: 'star-5', position: [3.0, 2.2, -11.6], color: '#d9c2ff', size: 0.12 },
  { id: 'star-6', position: [-0.8, 2.75, -12.6], color: '#8fdcff', size: 0.115 },
  { id: 'star-7', position: [1.1, 3.35, -13.8], color: '#d9c8ff', size: 0.11 },
]

function clamp01(v: number) {
  if (v < 0) return 0
  if (v > 1) return 1
  return v
}

function toHomePhase(phase: Phase): HomePhase {
  switch (phase) {
    case 'HOME': return 'home'
    case 'ASCENT': return 'ascent'
    case 'LIFEMAP': return 'lifemap'
    case 'FOCUS': return 'focus'
    case 'REPLAY': return 'replay'
  }
}

export default function SpatialScene() {
  const authority = useSceneAuthority()
  const phase = authority.phase as Phase
  const actions = authority.actions

  const canUsePersonalLifeMap = useSpatialFeatureEnabled('spatial.lifeMap.personal')
  const canUsePersonalMemoryStars = useSpatialFeatureEnabled('spatial.memoryStars.personal')
  const canUseAdvancedReplay = useSpatialFeatureEnabled('spatial.ritual.interactive')

  const [selectedStarId, setSelectedStarId] = useState<string | null>(null)
  const [selectedStarPosition, setSelectedStarPosition] = useState<[number, number, number] | undefined>(undefined)
  const [focusReady, setFocusReady] = useState(false)
  const [ascentProgress, setAscentProgress] = useState(0)
  const [homeReturnProgress, setHomeReturnProgress] = useState(0)

  const fogRef = useRef<THREE.Fog | null>(null)
  const ascentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ascentRafRef = useRef<number | null>(null)
  const returnRafRef = useRef<number | null>(null)
    const focusEnteredAtRef = useRef<number>(0)

  const stopAscentAnimation = useCallback(() => {
    if (ascentRafRef.current !== null) {
      cancelAnimationFrame(ascentRafRef.current)
      ascentRafRef.current = null
    }
  }, [])

  const stopReturnAnimation = useCallback(() => {
    if (returnRafRef.current !== null) {
      cancelAnimationFrame(returnRafRef.current)
      returnRafRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (ascentTimerRef.current) clearTimeout(ascentTimerRef.current)
      stopAscentAnimation()
      stopReturnAnimation()
    }
  }, [stopAscentAnimation, stopReturnAnimation])

  const clearFocusState = useCallback(() => {
    setFocusReady(false)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStarId(null)
    setSelectedStarPosition(undefined)
  }, [])

  const startAscentAnimation = useCallback(() => {
    stopAscentAnimation()
    const startedAt = performance.now()
    const durationMs = 820

    const tick = (now: number) => {
      const t = clamp01((now - startedAt) / durationMs)
      setAscentProgress(t)
      if (t < 1) {
        ascentRafRef.current = requestAnimationFrame(tick)
      } else {
        ascentRafRef.current = null
      }
    }

    setAscentProgress(0)
    ascentRafRef.current = requestAnimationFrame(tick)
  }, [stopAscentAnimation])

  const startHomeReturnAnimation = useCallback(() => {
    stopReturnAnimation()
    const startedAt = performance.now()
    const durationMs = 1050

    const tick = (now: number) => {
      const t = clamp01((now - startedAt) / durationMs)
      setHomeReturnProgress(1 - t)
      if (t < 1) {
        returnRafRef.current = requestAnimationFrame(tick)
      } else {
        setHomeReturnProgress(0)
        returnRafRef.current = null
      }
    }

    setHomeReturnProgress(1)
    returnRafRef.current = requestAnimationFrame(tick)
  }, [stopReturnAnimation])

  const openAscent = useCallback(() => {
    if (phase !== 'HOME') return
    clearFocusState()
    stopReturnAnimation()
    setHomeReturnProgress(0)
    actions.beginAscent()
    startAscentAnimation()
    if (ascentTimerRef.current) clearTimeout(ascentTimerRef.current)
    ascentTimerRef.current = setTimeout(() => {
      setAscentProgress(1)
    }, 820)
  }, [actions, clearFocusState, phase, startAscentAnimation, stopReturnAnimation])

  const openFocus = useCallback((starId: string, position: [number, number, number]) => {
    if (phase !== 'LIFEMAP') return
    if (!canUsePersonalLifeMap || !canUsePersonalMemoryStars) return
    setSelectedStarId(starId)
    setSelectedStarPosition(position)
    clearFocusState()
    actions.openFocus(starId)
  }, [actions, canUsePersonalLifeMap, canUsePersonalMemoryStars, clearFocusState, phase])

  const openReplay = useCallback(() => {
    if (phase !== 'FOCUS') return
    if (!focusReady) return
    if (!canUseAdvancedReplay) return
    if (!selectedStarId) return
      if (focusEnteredAtRef.current > 0 && performance.now() - focusEnteredAtRef.current < 700) return
    actions.openReplay()
  }, [actions, canUseAdvancedReplay, focusReady, phase, selectedStarId])

  const esc = useCallback(() => {
    if (phase === 'REPLAY') {
      actions.closeReplay()
      return
    }

    if (phase === 'FOCUS') {
      clearFocusState()
      actions.closeFocus()
      return
    }

    if (phase === 'ASCENT') {
      if (ascentTimerRef.current) clearTimeout(ascentTimerRef.current)
      stopAscentAnimation()
      setAscentProgress(0)
      clearFocusState()
      clearSelection()
      actions.goHome()
      startHomeReturnAnimation()
      return
    }

    if (phase === 'LIFEMAP') {
      clearFocusState()
      clearSelection()
      actions.goHome()
      startHomeReturnAnimation()
    }
  }, [actions, clearFocusState, clearSelection, phase, startHomeReturnAnimation, stopAscentAnimation])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') esc()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [esc])

  useEffect(() => {
    if (phase !== 'FOCUS') {
      setFocusReady(false)
    }
  }, [phase])

    useEffect(() => {
      if (phase === 'FOCUS') {
        focusEnteredAtRef.current = performance.now()
      } else {
        focusEnteredAtRef.current = 0
      }
    }, [phase])

  const handleCameraSettled = useCallback((settledPhase: Phase) => {
    if (settledPhase === 'FOCUS') {
      setFocusReady(true)
      return
    }
    if (settledPhase === 'LIFEMAP' || settledPhase === 'HOME') {
      setFocusReady(false)
    }
  }, [])

  useEffect(() => {
    if (!fogRef.current) return

    if (phase === 'HOME') {
      fogRef.current.color = new THREE.Color('#0c1726')
      fogRef.current.near = 10
      fogRef.current.far = 52
      } else if (phase === 'ASCENT') {
        fogRef.current.color = new THREE.Color('#0f1d31')
        fogRef.current.near = 18
        fogRef.current.far = 120
    } else if (phase === 'LIFEMAP') {
      fogRef.current.color = new THREE.Color('#102238')
      fogRef.current.near = 10
      fogRef.current.far = 82
    } else if (phase === 'REPLAY') {
      fogRef.current.color = new THREE.Color('#05030b')
      fogRef.current.near = 1
      fogRef.current.far = 14
    }
  }, [phase])

  const showHome = phase === 'HOME' || phase === 'ASCENT' || homeReturnProgress > 0.001
  const starfieldVisible =
    phase === 'ASCENT' ||
    phase === 'LIFEMAP' ||
    phase === 'FOCUS' ||
    phase === 'REPLAY' ||
    homeReturnProgress > 0.001

  const isReplay = phase === 'REPLAY'

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.NoToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ fov: 60, position: [0, 1.5, 6] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 2.05
      }}
    >
      <color attach="background" args={["#091521"]} />
      <fog attach="fog" args={['#0c1726', 10, 52]} ref={fogRef} />

      <ambientLight intensity={0.72} color="#d5e6ff" />
      <directionalLight position={[2.4, 6.4, 3.6]} intensity={2.35} color="#ffffff" castShadow />
      <directionalLight position={[-2.2, 1.4, -7.5]} intensity={0.38} color="#5daeff" />
      <pointLight position={[0, -1.4, -5.0]} intensity={1.35} distance={18} color="#9fd1ff" />

      <CinematicCameraRig
        phase={phase}
        selected={selectedStarPosition}
        onSettled={handleCameraSettled}
      />

      <ReplayEnvironment active={phase === 'REPLAY'} />

      {!isReplay && (
        <HomeEnvironment
            visible={true}
          interactive={phase === 'HOME'}
          dim={0}
          phase={toHomePhase(phase)}
          opacity={1}
          worldScale={1}
          yOffset={0}
          zOffset={0}
          onSkySelect={openAscent}
        />
      )}

      <Starfield
        visible={starfieldVisible && !isReplay}
        stars={STARS}
        selectedStarId={phase === 'FOCUS' || phase === 'REPLAY' ? selectedStarId : null}
        onStarClick={(id: string, position: [number, number, number]) => {
          if (phase !== 'LIFEMAP') return
    if (!canUsePersonalLifeMap || !canUsePersonalMemoryStars) return
          openFocus(id, position)
        }}
        interactive={phase === 'LIFEMAP' && canUsePersonalLifeMap && canUsePersonalMemoryStars}
        collapseToSelected={phase === 'REPLAY'}
        focusSuppression={phase === 'FOCUS' || phase === 'REPLAY' ? 1 : 0}
        opacity={1}
      />

      <FocusSubject
        visible={phase === 'FOCUS' && canUsePersonalLifeMap}
        starId={selectedStarId ?? undefined}
        position={selectedStarPosition ?? [0, 0, -18]}
        onEnterReplay={openReplay}
        interactive={phase === 'FOCUS' && focusReady}
      />

      <ReplayScene
        visible={phase === 'REPLAY' && canUseAdvancedReplay}
        opacity={1}
        driftZ={0.4}
        replayGroupScale={1.35}
      />
    </Canvas>
  )
}
