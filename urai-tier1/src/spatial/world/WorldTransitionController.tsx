'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { subscribeBrowserLocation } from '@/lib/browserLocationStore'
import { definitionForDestination } from './destinationRegistry'
import { useUraiWorldState } from './WorldStateProvider'
import {
  URAI_WORLD_RETURN_EVENT,
  URAI_WORLD_TRAVEL_EVENT,
  captureUraiWorldTravelCancellation,
  destinationSurfaceReady,
  worldTravelLocationMatches,
} from './worldEvents'
import { previousDestinationForReturn } from './worldTypes'
import { worldReturnCameraFrame } from './worldReturnCameraFrame'
import type { UraiDestination, UraiOriginRealm, UraiWorldTravelRequest } from './worldTypes'

const CONTEXT_KEYS = [
  'memoryId',
  'node',
  'thread',
  'personId',
  'placeId',
  'eraId',
  'era',
  'manifestId',
  'movieId',
  'chapterId',
  'privacyMode',
  'originRealm',
  'returnToken',
  'fidelity',
  'demo',
] as const

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function transitionDuration(destination: UraiDestination) {
  if (prefersReducedMotion()) return 260
  if (destination === 'replay' || destination === 'life-movie' || destination === 'location-map') return 1900
  return 1100
}

function buildTravelHref(request: UraiWorldTravelRequest) {
  const definition = definitionForDestination(request.destination)
  if (typeof window === 'undefined') return request.href ?? definition.href

  const target = new URL(request.href ?? definition.href, window.location.origin)
  const current = new URLSearchParams(window.location.search)
  const requestedMemoryId = request.context?.memoryId ?? target.searchParams.get('memoryId')
  const explicitNode = target.searchParams.has('node')

  for (const key of CONTEXT_KEYS) {
    if (!target.searchParams.has(key) && current.has(key)) {
      target.searchParams.set(key, current.get(key) ?? '')
    }
  }

  const context = request.context
  if (context?.memoryId) target.searchParams.set('memoryId', context.memoryId)
  if (context?.threadId) target.searchParams.set('thread', context.threadId)
  if (context?.personId) target.searchParams.set('personId', context.personId)
  if (context?.placeId) target.searchParams.set('placeId', context.placeId)
  if (context?.eraId) target.searchParams.set('eraId', context.eraId)
  if (context?.replayManifestId) target.searchParams.set('manifestId', context.replayManifestId)
  if (context?.movieId) target.searchParams.set('movieId', context.movieId)
  if (context?.chapterId) target.searchParams.set('chapterId', context.chapterId)
  if (context?.privacyMode) target.searchParams.set('privacyMode', context.privacyMode)
  if (context?.originRealm) target.searchParams.set('originRealm', context.originRealm)
  if (context?.returnToken) target.searchParams.set('returnToken', context.returnToken)
  if (context?.reconstructionFidelity) target.searchParams.set('fidelity', context.reconstructionFidelity)
  if (context?.scenarioId) target.searchParams.set('scenario', context.scenarioId)
  if (context?.scenarioBranchId) target.searchParams.set('branch', context.scenarioBranchId)
  if (context?.scenarioBasisRevision !== undefined) target.searchParams.set('basisRevision', String(context.scenarioBasisRevision))
  if (context?.truthMode) target.searchParams.set('truthMode', context.truthMode)
  if (context?.scenarioOrigin) target.searchParams.set('scenarioOrigin', context.scenarioOrigin)
  if (context?.demo) target.searchParams.set('demo', '1')
  if (request.entryPortal) target.searchParams.set('entryPortal', request.entryPortal)
  if (request.cameraCheckpoint) target.searchParams.set('cameraCheckpoint', request.cameraCheckpoint)
  if (requestedMemoryId && !explicitNode && requestedMemoryId !== (current.get('memoryId') ?? current.get('node'))) {
    target.searchParams.set('node', requestedMemoryId)
  }

  const memoryId = target.searchParams.get('memoryId')
  const nodeId = target.searchParams.get('node')
  if (request.destination === 'life-map') {
    if (!nodeId && memoryId) target.searchParams.set('node', memoryId)
  } else if (!memoryId && nodeId) {
    target.searchParams.set('memoryId', nodeId)
  }

  return `${target.pathname}${target.search}${target.hash}`
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]')
}

function destinationFromOriginRealm(origin: UraiOriginRealm): UraiDestination {
  if (origin === 'ground') return 'infrastructure-hub'
  return origin
}

function fallbackReturnDestination(destination: UraiDestination): UraiDestination {
  if (destination === 'focus') return 'life-map'
  if (destination === 'replay') return 'focus'
  if (destination === 'life-movie') return 'replay'
  if (destination === 'life-map') return 'home'
  if (destination === 'infrastructure-hub') return 'home'
  return 'infrastructure-hub'
}

export function WorldTransitionController() {
  const router = useRouter()
  const { world, phase, pendingTravel, beginTravel, cancelTransition } = useUraiWorldState()
  const timer = useRef<number | null>(null)
  const navigationWatchdog = useRef<number | null>(null)
  const worldRef = useRef(world)
  const phaseRef = useRef(phase)
  const beginTravelRef = useRef(beginTravel)
  const cancelTransitionRef = useRef(cancelTransition)
  const activeTravel = useRef<{
    request: UraiWorldTravelRequest
    href: string
    startingLocation: string
    returning: boolean
    cancelRecovery: () => void
  } | null>(null)

  useLayoutEffect(() => {
    worldRef.current = world
    phaseRef.current = phase
    beginTravelRef.current = beginTravel
    cancelTransitionRef.current = cancelTransition
  }, [beginTravel, cancelTransition, phase, world])

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    if (navigationWatchdog.current !== null) {
      window.clearTimeout(navigationWatchdog.current)
      navigationWatchdog.current = null
    }
  }, [])

  const cancelActiveTravel = useCallback((restoreWorld = true) => {
    const trip = activeTravel.current
    activeTravel.current = null
    clearTimer()
    trip?.cancelRecovery()
    if (restoreWorld) cancelTransitionRef.current()
  }, [clearTimer])

  const executeTravel = useCallback((request: UraiWorldTravelRequest, returning = false) => {
    const previous = activeTravel.current
    previous?.cancelRecovery()
    clearTimer()
    const href = buildTravelHref(request)
    const trip = {
      request,
      href,
      startingLocation: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      returning,
      cancelRecovery: captureUraiWorldTravelCancellation(request),
    }
    activeTravel.current = trip
    // Lock synchronously, before React commits BEGIN_TRAVEL, so duplicate realm
    // and global Return handlers cannot start competing copies of one unwind.
    phaseRef.current = 'travelling'
    const currentWorld = worldRef.current
    beginTravelRef.current(request)

    if (currentWorld.destination === 'home') {
      try {
        window.sessionStorage.setItem('urai-world-home-checkpoint', JSON.stringify({
          destination: currentWorld.destination,
          entryPortal: request.entryPortal ?? 'ground-gateway',
          cameraCheckpoint: currentWorld.cameraCheckpoint ?? 'home-threshold',
          savedAt: Date.now(),
        }))
      } catch {
        // The route transaction remains usable when optional storage is blocked.
      }
    }

    timer.current = window.setTimeout(() => {
      if (activeTravel.current !== trip) return
      if (!worldTravelLocationMatches(trip.startingLocation)) { cancelActiveTravel(); return }
      // Use the governed client-router path for every realm transition, including
      // Mirror -> Replay. A prior Replay-only hard-document shortcut could stall
      // before navigation committed under the patched Next runtime.
      router.push(href)
      timer.current = null

      // Route ownership is not proven by pathname alone. If the router changes
      // the URL but the destination surface never mounts, force one deterministic
      // document handoff after the client-router grace period.
      navigationWatchdog.current = window.setTimeout(() => {
        if (activeTravel.current !== trip) return
        navigationWatchdog.current = null
        if (!worldTravelLocationMatches(trip.startingLocation) && !worldTravelLocationMatches(href)) {
          cancelActiveTravel()
          return
        }
        if (
          !worldTravelLocationMatches(href) ||
          !destinationSurfaceReady(request.destination)
        ) {
          if (worldTravelLocationMatches(href)) window.location.reload()
          else window.location.assign(href)
        }
      }, 2500)
    }, transitionDuration(request.destination))
  }, [cancelActiveTravel, clearTimer, router])

  useEffect(() => {
    const trip = activeTravel.current
    if (trip && phase === 'idle' && worldTravelLocationMatches(trip.href) && destinationSurfaceReady(trip.request.destination)) {
      cancelActiveTravel(false)
    }
  }, [cancelActiveTravel, phase, world])

  const reverseTravel = useCallback(() => {
    const trip = activeTravel.current
    if (trip) {
      // Repeated Escape/Return cannot restart or cancel the outward step it just
      // requested. A forward trip can be cancelled before its route commits.
      if (!trip.returning && worldTravelLocationMatches(trip.startingLocation)) cancelActiveTravel()
      return
    }
    const currentWorld = worldRef.current
    if (phaseRef.current !== 'idle') return
    if (currentWorld.destination === 'home') return
    const destination = currentWorld.destination === 'replay'
      ? 'focus'
      : currentWorld.destination === 'possible-futures' && currentWorld.scenarioOrigin
        ? destinationFromOriginRealm(currentWorld.scenarioOrigin)
        : previousDestinationForReturn(currentWorld) ?? fallbackReturnDestination(currentWorld.destination)
    const definition = definitionForDestination(destination)
    const returnFrame = worldReturnCameraFrame(destination, currentWorld, new URLSearchParams(window.location.search))
    executeTravel({
      destination,
      href: returnFrame.href,
      entryPortal: currentWorld.entryPortal ?? definition.entryPortal,
      cameraCheckpoint: returnFrame.cameraCheckpoint,
      context: {
        memoryId: currentWorld.memoryId,
        threadId: currentWorld.threadId,
        personId: currentWorld.personId,
        placeId: currentWorld.placeId,
        eraId: currentWorld.eraId,
        replayManifestId: currentWorld.replayManifestId,
        movieId: currentWorld.movieId,
        chapterId: currentWorld.chapterId,
        privacyMode: currentWorld.privacyMode,
        originRealm: currentWorld.originRealm,
        returnToken: currentWorld.returnToken,
        reconstructionFidelity: currentWorld.reconstructionFidelity,
        truthMode: destination === 'replay' || destination === 'life-movie' ? 'memory' : 'reality',
        demo: currentWorld.demo,
      },
    }, true)
  }, [cancelActiveTravel, executeTravel])

  useLayoutEffect(() => {
    const onTravel = (event: WindowEventMap[typeof URAI_WORLD_TRAVEL_EVENT]) => executeTravel(event.detail)
    const onReturn = () => reverseTravel()
    const onPopState = () => cancelActiveTravel()
    const stopLocationObservation = subscribeBrowserLocation(() => {
      const trip = activeTravel.current
      if (trip && !worldTravelLocationMatches(trip.startingLocation) && !worldTravelLocationMatches(trip.href)) cancelActiveTravel()
    })
    const onKeyDown = (event: KeyboardEvent) => {
      const currentWorld = worldRef.current
      if (event.defaultPrevented || event.key !== 'Escape' || isEditableTarget(event.target)) return
      if (currentWorld.destination === 'home' && phaseRef.current === 'idle') return
      // Life Map and Location Map own their realm-specific Escape contracts.
      // Consent Sanctuary owns audit/pending dismissal and its history/Passport return.
      // The global reverse-travel fallback must not race a realm-owned handler.
      if (currentWorld.destination === 'life-map' || currentWorld.destination === 'location-map' || currentWorld.destination === 'privacy-controls') return
      event.preventDefault()
      if (event.repeat) return
      reverseTravel()
    }

    window.addEventListener(URAI_WORLD_TRAVEL_EVENT, onTravel)
    window.addEventListener(URAI_WORLD_RETURN_EVENT, onReturn)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener(URAI_WORLD_TRAVEL_EVENT, onTravel)
      window.removeEventListener(URAI_WORLD_RETURN_EVENT, onReturn)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('popstate', onPopState)
      stopLocationObservation()
      cancelActiveTravel(false)
    }
  }, [cancelActiveTravel, executeTravel, reverseTravel])

  return (
    <div
      className="urai-world-transition"
      data-phase={phase}
      data-from={world.destination}
      data-to={pendingTravel?.destination ?? world.destination}
      aria-hidden="true"
    >
      <span className="urai-world-transition__surface" />
      <span className="urai-world-transition__aperture" />
      <span className="urai-world-transition__depth" />
    </div>
  )
}
