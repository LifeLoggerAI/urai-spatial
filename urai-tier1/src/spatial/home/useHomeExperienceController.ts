'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import * as THREE from 'three'
import { URAI_WORLD_ORB_CLOSE_EVENT } from '@/spatial/world/worldEvents'
import {
  HOME_PASSPORT_ORIGIN_CAPTURE_EVENT,
  consumeHomeReturnFrame,
  createInitialHomeExperienceState,
  homeExperienceReducer,
  makeHomeOriginSnapshot,
  persistHomeReturnFrame,
  type HomeCameraSnapshot,
  type HomeDestination,
  type HomeEnvironmentSnapshot,
  type HomeOriginSnapshot,
} from './homeExperienceState'

export type HomeRuntimeSnapshotSource = {
  stableMode: 'HOME_PRESENTATION' | 'AVATAR_HOME_FIRST_PERSON'
  cameraPosition: THREE.Vector3
  yaw: number
  pitch: number
  environment?: HomeEnvironmentSnapshot
  orbState?: string
}

export function snapshotHomeOrigin(source: HomeRuntimeSnapshotSource): HomeOriginSnapshot {
  const camera: HomeCameraSnapshot = {
    position: [source.cameraPosition.x, source.cameraPosition.y, source.cameraPosition.z],
    yaw: source.yaw,
    pitch: source.pitch,
  }
  return makeHomeOriginSnapshot(
    source.stableMode,
    camera,
    source.environment ?? {},
    source.orbState ?? 'idle',
  )
}

export function useHomeExperienceController({
  reducedMotion,
  readRuntimeSnapshot,
  onDestinationCommit,
  onStableRestore,
}: {
  reducedMotion: boolean
  readRuntimeSnapshot: () => HomeRuntimeSnapshotSource
  onDestinationCommit: (destination: HomeDestination, origin: HomeOriginSnapshot) => void
  onStableRestore?: (origin: HomeOriginSnapshot) => void
}) {
  const [state, dispatch] = useReducer(homeExperienceReducer, reducedMotion, createInitialHomeExperienceState)
  const transitionCommitted = useRef(false)

  useEffect(() => {
    dispatch({ type: 'SET_REDUCED_MOTION', value: reducedMotion })
  }, [reducedMotion])

  useEffect(() => {
    const returned = consumeHomeReturnFrame()
    if (!returned || returned.kind !== 'destination' || !returned.destination) return
    dispatch({ type: 'DESTINATION_RETURN', destination: returned.destination, snapshot: returned.origin })
  }, [])

  useEffect(() => {
    if (state.transition) return
    transitionCommitted.current = false
  }, [state.transition])

  const currentOrigin = useCallback(() => snapshotHomeOrigin(readRuntimeSnapshot()), [readRuntimeSnapshot])

  useEffect(() => {
    const capturePassportOrigin = () => {
      if (state.transition || state.inputLocked || state.stableState !== 'AVATAR_HOME_FIRST_PERSON') return
      persistHomeReturnFrame({ kind: 'destination', destination: 'PASSPORT', origin: currentOrigin() })
    }
    window.addEventListener(HOME_PASSPORT_ORIGIN_CAPTURE_EVENT, capturePassportOrigin)
    return () => window.removeEventListener(HOME_PASSPORT_ORIGIN_CAPTURE_EVENT, capturePassportOrigin)
  }, [currentOrigin, state.inputLocked, state.stableState, state.transition])

  const completeEmbodiment = useCallback(() => {
    const runtime = readRuntimeSnapshot()
    const position = runtime.cameraPosition.clone()
    dispatch({
      type: 'EMBODIMENT_COMPLETE',
      snapshot: snapshotHomeOrigin({ ...runtime, stableMode: 'AVATAR_HOME_FIRST_PERSON', cameraPosition: position }),
    })
  }, [readRuntimeSnapshot])

  const openSelfView = useCallback(() => dispatch({ type: 'SELF_VIEW_OPEN' }), [])
  const closeSelfView = useCallback(() => dispatch({ type: 'SELF_VIEW_CLOSE' }), [])

  const activateGround = useCallback(() => {
    dispatch({ type: 'GROUND_ACTIVATE', snapshot: currentOrigin() })
  }, [currentOrigin])

  const activateSky = useCallback(() => {
    dispatch({ type: 'SKY_ACTIVATE', snapshot: currentOrigin() })
  }, [currentOrigin])

  const activateOrb = useCallback(() => {
    dispatch({ type: 'ORB_ACTIVATE', snapshot: currentOrigin() })
  }, [currentOrigin])

  const completeOrbTransformation = useCallback(() => dispatch({ type: 'TRANSITION_COMPLETE' }), [])
  const escape = useCallback(() => dispatch({ type: 'ESCAPE' }), [])
  const completeRestore = useCallback(() => dispatch({ type: 'HOME_RESTORE_COMPLETE' }), [])

  const commitDestination = useCallback((destination: HomeDestination) => {
    if (transitionCommitted.current || state.pendingDestination !== destination) return
    const frame = state.returnStack[state.returnStack.length - 1]
    if (!frame || frame.kind !== 'destination' || frame.destination !== destination) return
    transitionCommitted.current = true
    persistHomeReturnFrame(frame)
    onDestinationCommit(destination, frame.origin)
  }, [onDestinationCommit, state.pendingDestination, state.returnStack])

  useEffect(() => {
    if (
      state.transition !== 'GROUND_UNWIND'
      && state.transition !== 'LIFE_MAP_UNWIND'
      && state.transition !== 'ORB_COLLAPSE'
      && state.transition !== 'HOME_RESTORE'
      && state.transition !== 'EMBODIMENT_UNWIND'
    ) return
    onStableRestore?.(state.origin)
  }, [onStableRestore, state.origin, state.transition])

  useEffect(() => {
    const onOrbClose = () => {
      if (state.stableState !== 'IMMERSIVE_CONVERSATION' || state.transition) return
      dispatch({ type: 'ESCAPE' })
    }
    window.addEventListener(URAI_WORLD_ORB_CLOSE_EVENT, onOrbClose)
    return () => window.removeEventListener(URAI_WORLD_ORB_CLOSE_EVENT, onOrbClose)
  }, [state.stableState, state.transition])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (event.defaultPrevented) return
      if (document.querySelector('[data-home-layer="AVATAR_SELF_VIEW"]')) return
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) return
      event.preventDefault()
      escape()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [escape])

  useEffect(() => {
    const onPopState = () => {
      if (document.querySelector('[data-home-layer="AVATAR_SELF_VIEW"]')) {
        closeSelfView()
        return
      }
      escape()
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [closeSelfView, escape])

  const api = useMemo(() => ({
    completeEmbodiment,
    openSelfView,
    closeSelfView,
    activateGround,
    activateSky,
    activateOrb,
    completeOrbTransformation,
    commitDestination,
    escape,
    completeRestore,
  }), [
    activateGround,
    activateOrb,
    activateSky,
    closeSelfView,
    commitDestination,
    completeEmbodiment,
    completeOrbTransformation,
    completeRestore,
    escape,
    openSelfView,
  ])

  return { state, api }
}
