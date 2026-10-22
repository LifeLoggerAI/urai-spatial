'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { subscribeBrowserLocation } from '@/lib/browserLocationStore'
import { definitionForDestination } from './destinationRegistry'
import { persistHomeWorldCheckpoint } from './homeWorldCheckpointPersistence'
import { useUraiWorldState } from './WorldStateProvider'
import {
  URAI_WORLD_RETURN_EVENT,
  URAI_WORLD_TRAVEL_EVENT,
  destinationSurfaceReady,
} from './worldEvents'
import { previousDestinationForReturn } from './worldTypes'
import type { UraiDestination, UraiOriginRealm, UraiWorldTravelRequest } from './worldTypes'

const CONTEXT_KEYS = [
  'memoryId',
  'node',
  'thread',
  'personId',
  'placeId',
  'manifestId',
  'movieId',
  'chapterId',
  'privacyMode',
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
  const context = request.context
  const selectedMemoryId = context?.memoryId ?? target.searchParams.get('memoryId')
  const currentMemoryId = current.get('memoryId')
  const sameMemory = Boolean(selectedMemoryId && currentMemoryId && selectedMemoryId === currentMemoryId)
  const memoryDestination = request.destination === 'life-map' || request.destination === 'focus'
    || request.destination === 'replay' || request.destination === 'council'
    || request.destination === 'life-movie'
  // Neutral realms must not carry a previously selected private relationship.
  const neutralDestination = request.destination === 'home' || request.destination === 'infrastructure-hub'

  for (const key of CONTEXT_KEYS) {
    // An old visual node is never an implicit private memory identity.
    // Reuse node/manifest metadata only when an explicit selected memory
    // matches the current memory. Cross-realm travel must not leak it.
    if (key === 'memoryId' && (!memoryDestination || !selectedMemoryId)) continue
    if ((key === 'node' || key === 'manifestId' || key === 'movieId' || key === 'chapterId' || key === 'demo') && (!memoryDestination || !sameMemory)) continue
    // Relationship hints from an old memory never scope a different selection.
    if ((key === 'thread' || key === 'personId' || key === 'placeId') && (neutralDestination || (selectedMemoryId && !sameMemory))) continue
    if (!target.searchParams.has(key) && current.has(key)) {
      target.searchParams.set(key, current.get(key) ?? '')
    }
  }

  if (!memoryDestination) {
    target.searchParams.delete('memoryId')
    target.searchParams.delete('node')
    target.searchParams.delete('manifestId')
    target.searchParams.delete('movieId')
    target.searchParams.delete('chapterId')
    target.searchParams.delete('demo')
  }
  if (neutralDestination) {
    target.searchParams.delete('thread')
    target.searchParams.delete('personId')
    target.searchParams.delete('placeId')
  }

  if (memoryDestination && context?.memoryId) target.searchParams.set('memoryId', context.memoryId)
  if (!neutralDestination && context?.threadId) target.searchParams.set('thread', context.threadId)
  if (!neutralDestination && context?.personId) target.searchParams.set('personId', context.personId)
  if (!neutralDestination && context?.placeId) target.searchParams.set('placeId', context.placeId)
  if (memoryDestination && context?.replayManifestId && selectedMemoryId) target.searchParams.set('manifestId', context.replayManifestId)
  if (memoryDestination && context?.movieId) target.searchParams.set('movieId', context.movieId)
  if (memoryDestination && context?.chapterId) target.searchParams.set('chapterId', context.chapterId)
  if (context?.privacyMode) target.searchParams.set('privacyMode', context.privacyMode)
  if (context?.originRealm) target.searchParams.set('originRealm', context.originRealm)
  if (context?.returnToken) target.searchParams.set('returnToken', context.returnToken)
  if (context?.reconstructionFidelity) target.searchParams.set('fidelity', context.reconstructionFidelity)
  if (context?.scenarioId) target.searchParams.set('scenario', context.scenarioId)
  if (context?.scenarioBranchId) target.searchParams.set('branch', context.scenarioBranchId)
  if (context?.scenarioBasisRevision !== undefined) target.searchParams.set('basisRevision', String(context.scenarioBasisRevision))
  if (context?.truthMode) target.searchParams.set('truthMode', context.truthMode)
  if (context?.scenarioOrigin) target.searchParams.set('scenarioOrigin', context.scenarioOrigin)
  if (memoryDestination && context?.demo && (!selectedMemoryId || !currentMemoryId || sameMemory)) target.searchParams.set('demo', '1')
  if (request.entryPortal) target.searchParams.set('entryPortal', request.entryPortal)
  if (request.cameraCheckpoint) target.searchParams.set('cameraCheckpoint', request.cameraCheckpoint)

  // No node-to-memory or memory-to-node inference: these are separate
  // identities, and each consumer must independently validate access.
  return `${target.pathname}${target.search}${target.hash}`
}

function normalizedPathname(value: string) {
  return value.replace(/\/+$/, '') || '/'
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
  if (destination === 'infrastructure-hub') return 'home'
  return 'infrastructure-hub'
}

export function WorldTransitionController() {
  const router = useRouter()
  const { world, phase, beginTravel } = useUraiWorldState()
  const timer = useRef<number | null>(null)
  const navigationWatchdog = useRef<number | null>(null)
  const navigationGeneration = useRef(0)
  const stopNavigationObservation = useRef<(() => void) | null>(null)
  const worldRef = useRef(world)
  const phaseRef = useRef(phase)
  const beginTravelRef = useRef(beginTravel)

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { beginTravelRef.current = beginTravel }, [beginTravel])

  const clearTimer = useCallback(() => {
    // Also invalidate callbacks already queued before their timer was cleared.
    navigationGeneration.current += 1
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    if (navigationWatchdog.current !== null) {
      window.clearTimeout(navigationWatchdog.current)
      navigationWatchdog.current = null
    }
    stopNavigationObservation.current?.()
    stopNavigationObservation.current = null
  }, [])

  const executeTravel = useCallback((request: UraiWorldTravelRequest) => {
    clearTimer()
    const currentWorld = worldRef.current
    beginTravelRef.current(request)

    if (currentWorld.destination === 'home') {
      // This checkpoint is optional continuity, not authorization to travel.
      // Browsers may deny access to sessionStorage in strict privacy contexts.
      persistHomeWorldCheckpoint({
        destination: currentWorld.destination,
        entryPortal: request.entryPortal ?? 'ground-gateway',
        cameraCheckpoint: currentWorld.cameraCheckpoint ?? 'home-threshold',
        savedAt: Date.now(),
      })
    }

    const href = buildTravelHref(request)
    const target = new URL(href, window.location.origin)
    const targetPathname = normalizedPathname(target.pathname)
    const targetLocation = `${targetPathname}${target.search}${target.hash}`
    const locationKey = () => `${normalizedPathname(window.location.pathname)}${window.location.search}${window.location.hash}`
    const startingLocation = locationKey()
    const generation = navigationGeneration.current
    let navigationStarted = false
    let reachedTarget = false

    const observeNavigation = () => {
      if (generation !== navigationGeneration.current) return
      const currentLocation = locationKey()
      if (navigationStarted && currentLocation === targetLocation) {
        reachedTarget = true
        if (destinationSurfaceReady(request.destination)) clearTimer()
        return
      }
      // A later route (including returning to the origin after reaching the
      // target) owns navigation now. This attempt may no longer recover it.
      if (currentLocation !== startingLocation || reachedTarget) clearTimer()
    }
    const unsubscribeLocation = subscribeBrowserLocation(observeNavigation)
    const surfaceObserver = new MutationObserver(observeNavigation)
    surfaceObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-testid', 'data-route-owner'],
    })
    stopNavigationObservation.current = () => {
      unsubscribeLocation()
      surfaceObserver.disconnect()
    }

    timer.current = window.setTimeout(() => {
      if (generation !== navigationGeneration.current) return
      timer.current = null
      navigationStarted = true
      // Use the governed client-router path for every realm transition, including
      // Mirror -> Replay. A prior Replay-only hard-document shortcut could stall
      // before navigation committed under the patched Next runtime.
      router.push(href)
      if (generation !== navigationGeneration.current) return

      // Route ownership is not proven by pathname alone. If the router changes
      // the URL but the destination surface never mounts, force one deterministic
      // document handoff after the client-router grace period.
      navigationWatchdog.current = window.setTimeout(() => {
        if (generation !== navigationGeneration.current) return
        observeNavigation()
        if (generation !== navigationGeneration.current) return
        clearTimer()
        if (
          locationKey() !== targetLocation ||
          !destinationSurfaceReady(request.destination)
        ) {
          window.location.assign(href)
        }
      }, 2500)
      observeNavigation()
    }, transitionDuration(request.destination))
  }, [clearTimer, router])

  const reverseTravel = useCallback(() => {
    const currentWorld = worldRef.current
    if (phaseRef.current !== 'idle') return
    const destination = currentWorld.destination === 'possible-futures' && currentWorld.scenarioOrigin
      ? destinationFromOriginRealm(currentWorld.scenarioOrigin)
      : previousDestinationForReturn(currentWorld) ?? fallbackReturnDestination(currentWorld.destination)
    const definition = definitionForDestination(destination)
    executeTravel({
      destination,
      // Unwind from Focus returns to the Life Map *overview*. Retaining the
      // authorized memory identity in buildTravelHref is safe, but leaving a
      // star selected would consume the next Escape clearing that selection
      // instead of making the requested Life Map -> Home return.
      // A fresh Life Map selection still owns its normal Escape-to-overview.
      href: currentWorld.destination === 'focus' && destination === 'life-map'
        ? `${definition.href}?overview=1`
        : definition.href,
      entryPortal: currentWorld.entryPortal ?? definition.entryPortal,
      cameraCheckpoint: destination === 'home' ? 'home-threshold' : definition.cameraCheckpoint,
      context: {
        memoryId: currentWorld.memoryId,
        threadId: currentWorld.threadId,
        personId: currentWorld.personId,
        placeId: currentWorld.placeId,
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
    })
  }, [executeTravel])

  useLayoutEffect(() => {
    const onTravel = (event: WindowEventMap[typeof URAI_WORLD_TRAVEL_EVENT]) => executeTravel(event.detail)
    const onReturn = () => reverseTravel()
    const onKeyDown = (event: KeyboardEvent) => {
      const currentWorld = worldRef.current
      if (event.defaultPrevented || event.key !== 'Escape' || isEditableTarget(event.target)) return
      if (currentWorld.destination === 'home' && phaseRef.current === 'idle') return
      // Life Map and Location Map own their realm-specific Escape contracts.
      // Consent Sanctuary owns audit/pending dismissal and its history/Passport return.
      // The global reverse-travel fallback must not race a realm-owned handler.
      // Replay has its own Escape handler that pauses media and dispatches one
      // URAI_WORLD_RETURN_EVENT. Handling the same key here as well can issue
      // two reverse travels against the same transition state and leave the
      // client URL on Replay while the Focus surface is already changing.
      if (currentWorld.destination === 'replay' || currentWorld.destination === 'focus' || currentWorld.destination === 'life-map' || currentWorld.destination === 'location-map' || currentWorld.destination === 'privacy-controls') return
      event.preventDefault()
      reverseTravel()
    }

    window.addEventListener(URAI_WORLD_TRAVEL_EVENT, onTravel)
    window.addEventListener(URAI_WORLD_RETURN_EVENT, onReturn)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener(URAI_WORLD_TRAVEL_EVENT, onTravel)
      window.removeEventListener(URAI_WORLD_RETURN_EVENT, onReturn)
      window.removeEventListener('keydown', onKeyDown)
      clearTimer()
    }
  }, [clearTimer, executeTravel, reverseTravel])

  return (
    <div
      className="urai-world-transition"
      data-phase={phase}
      data-from={world.destination}
      data-to={world.destination}
      aria-hidden="true"
    >
      <span className="urai-world-transition__surface" />
      <span className="urai-world-transition__aperture" />
      <span className="urai-world-transition__depth" />
    </div>
  )
}
