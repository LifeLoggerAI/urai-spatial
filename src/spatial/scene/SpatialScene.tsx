'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Starfield3D from '@/spatial/components/Starfield3D'
import { getSpatialStarData, type SpatialStarNode } from '@/spatial/data/stars'
import { useSceneStore } from '../state/sceneStore'

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
type TransitionKind = 'homeToLifemap' | 'lifemapToHome' | null

const ASCENT_MS = 2200
const RETURN_HOME_MS = 1600
const FOCUS_ENTER_MS = 450
const REPLAY_ENTER_MS = 600

const STAR_DATA: SpatialStarNode[] = getSpatialStarData()

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function getCameraDirector(progress: number, phase: Phase, selectedStar: SpatialStarNode | null) {
  const p = clamp01(progress)
  const e = easeInOutCubic(p)

  if (phase === 'HOME') {
    return {
      scale: 1,
      translateY: 0,
      translateX: 0,
      background: '#020748',
      starOpacity: 0,
      vignette: 0.1,
      homeOpacity: 1,
      replayOpacity: 0,
      orbScale: 1,
      groundOpacity: 1,
    }
  }

  if (phase === 'ASCENT') {
    return {
      scale: 1 + e * 0.8,
      translateY: e * -25,
      translateX: 0,
      background: '#020748',
      starOpacity: e * 0.7,
      vignette: 0.1 + e * 0.1,
      homeOpacity: 1 - e,
      replayOpacity: 0,
      orbScale: 1 - e * 0.5,
      groundOpacity: 1 - e,
    }
  }

  if (phase === 'LIFEMAP') {
    return {
      scale: 1,
      translateY: 0,
      translateX: 0,
      background: '#01031a',
      starOpacity: 1,
      vignette: 0.2,
      homeOpacity: 0,
      replayOpacity: 0,
      orbScale: 0,
      groundOpacity: 0,
    }
  }

  if (phase === 'FOCUS') {
    const focusX = selectedStar ? 50 - selectedStar.x : 0
    const focusY = selectedStar ? 50 - selectedStar.y : 0

    return {
      scale: 2.5,
      translateY: focusY,
      translateX: focusX,
      background: '#010210',
      starOpacity: 0.1,
      vignette: 0.4,
      homeOpacity: 0,
      replayOpacity: 0,
      orbScale: 0,
      groundOpacity: 0,
    }
  }

  return {
    scale: 1,
    translateY: 0,
    translateX: 0,
    background: '#000000',
    starOpacity: 0,
    vignette: 1,
    homeOpacity: 0,
    replayOpacity: 1,
    orbScale: 0,
    groundOpacity: 0,
  }
}

export default function SpatialScene() {
  const mode = useSceneStore((s) => s.mode)
  const selectedStarId = useSceneStore((s) => s.selectedStarId)
  const applyTransition = useSceneStore((s) => s.applyTransition)
  const canTransition = useSceneStore((s) => s.canTransition)

  const [inputLocked, setInputLocked] = useState(false)
  const [transitionKind, setTransitionKind] = useState<TransitionKind>(null)
  const [transitionProgress, setTransitionProgress] = useState(0)
  const [replayVisible, setReplayVisible] = useState(false)
  const [focusVisible, setFocusVisible] = useState(false)

  const transitionFrameRef = useRef<number | null>(null)

  const selectedStar = useMemo(
    () => STAR_DATA.find((s) => s.id === selectedStarId) ?? null,
    [selectedStarId]
  )

  const phase: Phase =
    mode === 'home'
      ? 'HOME'
      : mode === 'ground'
        ? 'ASCENT'
        : mode === 'lifemap'
          ? 'LIFEMAP'
          : mode === 'focus'
            ? 'FOCUS'
            : 'REPLAY'

  const phaseForView: Phase = transitionKind === 'lifemapToHome' ? 'ASCENT' : phase

  const camera = getCameraDirector(
    transitionKind
      ? transitionKind === 'lifemapToHome'
        ? 1 - transitionProgress
        : transitionProgress
      : 0,
    phaseForView,
    selectedStar
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || inputLocked || !canTransition('ESC', { inputLocked })) return

      if (phase === 'REPLAY') {
        setReplayVisible(false)
        setInputLocked(false)
        applyTransition('ESC')
        return
      }

      if (phase === 'FOCUS') {
        setFocusVisible(false)
        setInputLocked(false)
        applyTransition('ESC')
        return
      }

      if (phase === 'LIFEMAP') {
        setInputLocked(true)
        setTransitionKind('lifemapToHome')

        const start = performance.now()

        const tick = (now: number) => {
          const t = clamp01((now - start) / RETURN_HOME_MS)
          setTransitionProgress(t)

          if (t < 1) {
            transitionFrameRef.current = requestAnimationFrame(tick)
          } else {
            setTransitionKind(null)
            setTransitionProgress(0)
            setInputLocked(false)
            applyTransition('ESC')
          }
        }

        if (transitionFrameRef.current) cancelAnimationFrame(transitionFrameRef.current)
        transitionFrameRef.current = requestAnimationFrame(tick)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (transitionFrameRef.current) cancelAnimationFrame(transitionFrameRef.current)
    }
  }, [inputLocked, phase, applyTransition, canTransition])

  const startAscent = () => {
    if (!canTransition('START_ASCENT', { inputLocked }) || transitionKind) return

    applyTransition('START_ASCENT', { inputLocked })
    setInputLocked(true)
    setTransitionKind('homeToLifemap')

    const start = performance.now()

    const tick = (now: number) => {
      const t = clamp01((now - start) / ASCENT_MS)
      setTransitionProgress(t)

      if (t < 1) {
        transitionFrameRef.current = requestAnimationFrame(tick)
      } else {
        setTransitionKind(null)
        setTransitionProgress(0)
        setInputLocked(false)
        applyTransition('COMPLETE_ASCENT')
      }
    }

    if (transitionFrameRef.current) cancelAnimationFrame(transitionFrameRef.current)
    transitionFrameRef.current = requestAnimationFrame(tick)
  }

  const openFocus = (star: SpatialStarNode) => {
    if (!canTransition('OPEN_FOCUS', { starId: star.id, inputLocked }) || transitionKind) return

    setFocusVisible(false)
    applyTransition('OPEN_FOCUS', { starId: star.id, inputLocked })
    setTimeout(() => setFocusVisible(true), FOCUS_ENTER_MS)
  }

  const openReplay = () => {
    if (!selectedStar || !canTransition('OPEN_REPLAY', { inputLocked })) return

    setInputLocked(true)
    applyTransition('OPEN_REPLAY', { inputLocked })
    setTimeout(() => {
      setReplayVisible(true)
      setInputLocked(false)
    }, REPLAY_ENTER_MS)
  }

  const showHome = phaseForView === 'HOME' || phaseForView === 'ASCENT'
  const showField = phaseForView === 'LIFEMAP' || phaseForView === 'FOCUS' || phaseForView === 'ASCENT'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: camera.background,
        color: '#fff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${camera.translateY}%) translateX(${camera.translateX}%) scale(${camera.scale})`,
          transformOrigin: '50% 50%',
          transition: transitionKind ? 'none' : 'transform 750ms ease-out, background 750ms ease-out',
        }}
      >
        {showHome && (
          <>
            <div
              aria-label="Enter spatial field via sky"
              onClick={startAscent}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '60%',
                cursor: phase === 'HOME' && !inputLocked ? 'pointer' : 'default',
                background: 'linear-gradient(to bottom, #010541 0%, #020748 100%)',
                opacity: camera.homeOpacity,
                transition: 'opacity 400ms linear',
              }}
            />

            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: '40%',
                background: 'linear-gradient(to top, #0a0a10, transparent)',
                opacity: camera.groundOpacity,
                transition: 'opacity 400ms linear',
              }}
            />

            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '50%',
                top: '85%',
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: '#dddddf',
                transform: `translate(-50%, -50%) scale(${camera.orbScale})`,
                opacity: camera.homeOpacity,
                transition: 'opacity 400ms linear, transform 400ms ease-out',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.02)',
              }}
            />
          </>
        )}

        {showField && (
          <div style={{ position: 'absolute', inset: 0, opacity: camera.starOpacity }}>
            <Starfield3D
              stars={STAR_DATA}
              phase={phase}
              selectedStarId={selectedStarId}
              onSelect={(id) => {
                const star = STAR_DATA.find((s) => s.id === id)
                if (star) openFocus(star)
              }}
            />
          </div>
        )}

        {phase === 'FOCUS' && selectedStar && (
          <>
            <div
              aria-hidden={!focusVisible}
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                opacity: focusVisible ? 1 : 0,
                transition: 'opacity 500ms ease-out',
                background:
                  'radial-gradient(circle at 50% 50%, rgba(137,177,255,0.2) 0%, rgba(66,98,177,0.1) 22%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.75) 100%)',
              }}
            />

            <button
              onClick={openReplay}
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '10%',
                transform: 'translateX(-50%)',
                padding: '0.75rem 1rem',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Replay gently
            </button>
          </>
        )}

        {phase === 'REPLAY' && (
          <div
            aria-hidden={!replayVisible}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: camera.replayOpacity,
              transition: 'opacity 600ms ease-in',
              background: 'radial-gradient(circle at 50% 50%, rgba(204,174,58,0.1) 0%, transparent 40%), #000',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#f8f3dc',
                fontFamily: 'ui-sans-serif, system-ui, -apple-system',
                opacity: replayVisible ? 1 : 0,
                transition: 'opacity 500ms ease-out',
              }}
            >
              <p
                style={{
                  letterSpacing: '0.16em',
                  fontSize: '0.8rem',
                  margin: 0,
                  textTransform: 'uppercase',
                  opacity: 0.65,
                }}
              >
                Memory Trace
              </p>

              <h2
                style={{
                  margin: '0.45rem 0 0',
                  fontWeight: 500,
                  fontSize: '2rem',
                  textShadow: '0 0 24px rgba(255,227,163,0.35)',
                }}
              >
                {selectedStar?.label}
              </h2>
            </div>
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 180px rgba(0,0,0,${camera.vignette})`,
          pointerEvents: 'none',
          transition: 'box-shadow 750ms ease-out',
        }}
      />
    </div>
  )
}