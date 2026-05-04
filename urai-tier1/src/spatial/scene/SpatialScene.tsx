'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

import CinematicCameraRig from '@/spatial/components/CinematicCameraRig'
import FocusSubject from '@/spatial/components/FocusSubject'
import HomeEnvironment from '@/spatial/scene/HomeEnvironment'
import ReplayEnvironment from '@/spatial/components/ReplayEnvironment'
import ReplayScene from '@/spatial/components/ReplayScene'
import Starfield from '@/spatial/components/Starfield'
import { useSpatialFeatureEnabled } from '@/lib/tier-locks/client'
import useSceneAuthority from '@/spatial/hooks/useSceneAuthority'
import { getLifeMapStars } from '@/spatial/scene/getLifeMapStars'
import SpatialHUD from '@/spatial/scene/SpatialHUD'
import { useSpatialMemoryNodes } from '@/spatial/scene/useSpatialMemoryNodes'

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
type HomePhase = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay'

type SpatialStar = {
  id: string
  position: [number, number, number]
  color?: string
  size?: number
  title?: string
  tone?: string
}

const STARS: SpatialStar[] = [
  { id: 'star-1', position: [0.0, 1.15, -7.4], color: '#9fd3ff', size: 0.14, title: 'First signal', tone: 'focus' },
  { id: 'star-2', position: [-2.2, 1.85, -8.7], color: '#b8a6ff', size: 0.13, title: 'A quiet recovery', tone: 'recovery' },
  { id: 'star-3', position: [2.3, 0.95, -9.5], color: '#7ce2ff', size: 0.13, title: 'Threshold night', tone: 'tense' },
  { id: 'star-4', position: [-3.1, 0.25, -10.8], color: '#ffd6a8', size: 0.125, title: 'Dream fragment', tone: 'awe' },
  { id: 'star-5', position: [3.0, 2.2, -11.6], color: '#d9c2ff', size: 0.12, title: 'The pattern returned', tone: 'grief' },
  { id: 'star-6', position: [-0.8, 2.75, -12.6], color: '#8fdcff', size: 0.115, title: 'A relationship echo', tone: 'neutral' },
  { id: 'star-7', position: [1.1, 3.35, -13.8], color: '#d9c8ff', size: 0.11, title: 'A new chapter opened', tone: 'joy' },
]

const rootStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100dvh',
  overflow: 'hidden',
  background: '#05010d',
  color: '#fff',
  margin: 0,
  padding: 0,
}

const canvasWrapStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  zIndex: 0,
}

const panelButtonStyle: CSSProperties = {
  border: '1px solid rgba(190,210,255,.28)',
  borderRadius: 999,
  padding: '8px 12px',
  background: 'rgba(100,130,255,.18)',
  color: '#fff',
  cursor: 'pointer',
}

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function toHomePhase(phase: Phase): HomePhase {
  switch (phase) {
    case 'HOME':
      return 'home'
    case 'ASCENT':
      return 'ascent'
    case 'LIFEMAP':
      return 'lifemap'
    case 'FOCUS':
      return 'focus'
    case 'REPLAY':
      return 'replay'
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
  const [debugOpen, setDebugOpen] = useState(false)

  const fogRef = useRef<THREE.Fog | null>(null)
  const ascentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ascentRafRef = useRef<number | null>(null)
  const returnRafRef = useRef<number | null>(null)
  const focusEnteredAtRef = useRef<number>(0)

  const lifeMap = useMemo(() => getLifeMapStars(), [])
  const { nodes, source } = useSpatialMemoryNodes()

  const selectedMeta =
    nodes.find((node) => node.id === selectedStarId) ??
    lifeMap.stars.find((star) => star.id === selectedStarId)

  const selectedTone =
    (selectedMeta as { emotionalTone?: string; tone?: string } | undefined)?.emotionalTone ??
    (selectedMeta as { emotionalTone?: string; tone?: string } | undefined)?.tone ??
    'neutral'

  const selectedTime =
    (selectedMeta as { timestamp?: string; era?: string; date?: string } | undefined)?.timestamp ??
    (selectedMeta as { timestamp?: string; era?: string; date?: string } | undefined)?.date ??
    (selectedMeta as { timestamp?: string; era?: string; date?: string } | undefined)?.era ??
    ''

  const selectedNarrator =
    (selectedMeta as { narratorLine?: string; narrator?: string } | undefined)?.narratorLine ??
    (selectedMeta as { narratorLine?: string; narrator?: string } | undefined)?.narrator ??
    'This memory forms a stable emotional signal.'

  const clearFocusState = useCallback(() => {
    setFocusReady(false)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStarId(null)
    setSelectedStarPosition(undefined)
  }, [])

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

  const startAscentAnimation = useCallback(() => {
    stopAscentAnimation()

    const startedAt = performance.now()
    const durationMs = 900

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
    clearSelection()
    stopReturnAnimation()
    setHomeReturnProgress(0)

    actions.beginAscent()
    startAscentAnimation()

    if (ascentTimerRef.current) clearTimeout(ascentTimerRef.current)

    ascentTimerRef.current = setTimeout(() => {
      setAscentProgress(1)
      actions.openLifeMap()
    }, 820)
  }, [
    actions,
    clearFocusState,
    clearSelection,
    phase,
    startAscentAnimation,
    stopReturnAnimation,
  ])

  const openFocus = useCallback(
    (starId: string, position: [number, number, number]) => {
      if (phase !== 'LIFEMAP') return

      setSelectedStarId(starId)
      setSelectedStarPosition(position)
      clearFocusState()
      actions.openFocus(starId)
    },
    [actions, clearFocusState, phase],
  )

  const openReplay = useCallback(() => {
    if (phase !== 'FOCUS') return
    if (!focusReady) return
    if (!selectedStarId) return
    if (focusEnteredAtRef.current > 0 && performance.now() - focusEnteredAtRef.current < 700) return
    if (!canUseAdvancedReplay) return

    actions.openReplay(selectedStarId)
  }, [actions, canUseAdvancedReplay, focusReady, phase, selectedStarId])

  const returnToLifeMap = useCallback(() => {
    if (phase !== 'FOCUS' && phase !== 'REPLAY') return

    if (phase === 'REPLAY') {
      actions.closeReplay()
      return
    }

    clearFocusState()
    actions.closeFocus()
  }, [actions, clearFocusState, phase])

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
  }, [
    actions,
    clearFocusState,
    clearSelection,
    phase,
    startHomeReturnAnimation,
    stopAscentAnimation,
  ])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') esc()

      if (event.key.toLowerCase() === 'd' || event.key === '`') {
        setDebugOpen((value) => !value)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [esc])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const queryParams = new URLSearchParams(window.location.search)

    if (queryParams.get('debug') === 'true') {
      setDebugOpen(true)
    }

    const phaseParam = queryParams.get('phase')

    if (phaseParam === 'lifemap') {
      actions.openLifeMap()
    }
  }, [actions])

  useEffect(() => {
    if (phase === 'FOCUS') {
      focusEnteredAtRef.current = performance.now()

      const timer = window.setTimeout(() => {
        setFocusReady(true)
      }, 380)

      return () => window.clearTimeout(timer)
    }

    focusEnteredAtRef.current = 0
    setFocusReady(false)
  }, [phase])

  useEffect(() => {
    return () => {
      if (ascentTimerRef.current) clearTimeout(ascentTimerRef.current)
      stopAscentAnimation()
      stopReturnAnimation()
    }
  }, [stopAscentAnimation, stopReturnAnimation])

  useEffect(() => {
    if (!fogRef.current) return

    if (phase === 'HOME') {
      fogRef.current.color = new THREE.Color('#0c1726')
      fogRef.current.near = 10
      fogRef.current.far = 60
    } else if (phase === 'ASCENT') {
      fogRef.current.color = new THREE.Color('#0f1d31')
      fogRef.current.near = 18
      fogRef.current.far = 150
    } else if (phase === 'LIFEMAP' || phase === 'FOCUS') {
      fogRef.current.color = new THREE.Color('#102238')
      fogRef.current.near = 40
      fogRef.current.far = 360
    } else if (phase === 'REPLAY') {
      fogRef.current.color = new THREE.Color('#05030b')
      fogRef.current.near = 1
      fogRef.current.far = 80
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
  const starfieldOpacity = phase === 'ASCENT' ? ascentProgress : 1
  const canBack = phase !== 'HOME'
  const isBusy = phase === 'ASCENT'

  return (
    <main style={rootStyle}>
      <SpatialHUD
        phaseLabel={phase}
        starCount={lifeMap.stars.length}
        memoryTitle={selectedMeta?.title ?? 'No node selected'}
        source={source}
        canReplay={phase === 'FOCUS' && focusReady && canUseAdvancedReplay}
        canBack={canBack}
        isBusy={isBusy}
        onOpen={openAscent}
        onBack={esc}
        onReplay={openReplay}
      />

      {selectedMeta && (phase === 'FOCUS' || phase === 'REPLAY') && (
        <div
          className="urai-hud-panel"
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            zIndex: 24,
            width: 'min(90vw, 360px)',
            padding: 14,
            borderRadius: 16,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontWeight: 700 }}>{selectedMeta.title}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>Tone: {selectedTone}</div>
          <div style={{ fontSize: 12, opacity: 0.86 }}>{selectedTime}</div>
          <div style={{ fontSize: 12, opacity: 0.82, marginTop: 6, lineHeight: 1.45 }}>
            {selectedNarrator}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              style={{
                ...panelButtonStyle,
                opacity: focusReady && canUseAdvancedReplay ? 1 : 0.62,
                cursor: focusReady && canUseAdvancedReplay ? 'pointer' : 'not-allowed',
              }}
              onClick={openReplay}
              disabled={!focusReady || !canUseAdvancedReplay}
            >
              Replay
            </button>

            <button type="button" style={panelButtonStyle} onClick={returnToLifeMap}>
              Return to LifeMap
            </button>
          </div>
        </div>
      )}

      {debugOpen && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            zIndex: 30,
            padding: 10,
            borderRadius: 12,
            background: 'rgba(0,0,0,.65)',
            fontSize: 12,
            color: '#d2e8ff',
            pointerEvents: 'auto',
          }}
        >
          phase={phase}
          <br />
          selected={selectedStarId ?? 'none'}
          <br />
          starCount={lifeMap.stars.length}
          <br />
          camera={phase}
          <br />
          source={source}
          <br />
          gates={String(canUsePersonalLifeMap)}/{String(canUsePersonalMemoryStars)}/
          {String(canUseAdvancedReplay)}
        </div>
      )}

      <div style={canvasWrapStyle}>
        <Canvas
          camera={{ position: [0, 1.4, 7.5], fov: 42, near: 0.1, far: 1200 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={['#05010d']} />
          <fog ref={fogRef} attach="fog" args={['#0c1726', 10, 52]} />

          <ambientLight intensity={0.62} />
          <directionalLight position={[4, 7, 5]} intensity={1.05} />
          <pointLight position={[0, 2.5, -4]} intensity={2.1} color="#8fdcff" />

          <CinematicCameraRig
            phase={phase}
            selectedStarPosition={selectedStarPosition}
            ascentProgress={ascentProgress}
          />

          <ReplayEnvironment active={phase === 'REPLAY'} />

          {!isReplay && (
            <HomeEnvironment
              visible={showHome}
              interactive={phase === 'HOME'}
              dim={phase === 'LIFEMAP' || phase === 'FOCUS' ? 0.45 : 0}
              phase={toHomePhase(phase)}
              onSkySelect={openAscent}
              onOrbSelect={openAscent}
            />
          )}

          <Starfield
            visible={starfieldVisible && !isReplay}
            stars={STARS}
            lifeMapStars={lifeMap.stars}
            selectedStarId={phase === 'FOCUS' || phase === 'REPLAY' ? selectedStarId : null}
            onStarClick={openFocus}
            interactive={phase === 'LIFEMAP' && canUsePersonalLifeMap && canUsePersonalMemoryStars}
            collapseToSelected={phase === 'REPLAY'}
            focusSuppression={phase === 'FOCUS' || phase === 'REPLAY' ? 1 : 0}
            opacity={starfieldOpacity}
            worldScale={phase === 'LIFEMAP' || phase === 'FOCUS' ? 1.2 : 1}
          />

          {process.env.NODE_ENV !== 'production' && phase === 'LIFEMAP' && (
            <group>
              <mesh position={[0, 12, -45]}>
                <sphereGeometry args={[1.1, 16, 16]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} depthWrite={false} depthTest={false} />
              </mesh>

              <mesh position={[-8, 16, -55]}>
                <sphereGeometry args={[1.1, 16, 16]} />
                <meshBasicMaterial color="#6de3ff" toneMapped={false} depthWrite={false} depthTest={false} />
              </mesh>

              <mesh position={[8, 18, -65]}>
                <sphereGeometry args={[1.1, 16, 16]} />
                <meshBasicMaterial color="#ff9ee5" toneMapped={false} depthWrite={false} depthTest={false} />
              </mesh>
            </group>
          )}

          <FocusSubject
            visible={phase === 'FOCUS'}
            starId={selectedStarId ?? undefined}
            position={selectedStarPosition ?? [0, 0, -18]}
            onEnterReplay={openReplay}
            interactive={phase === 'FOCUS' && focusReady}
          />

          <ReplayScene
            visible={phase === 'REPLAY'}
            opacity={1}
            driftZ={0.4}
            replayGroupScale={1.35}
          />
        </Canvas>
      </div>
    </main>
  )
}