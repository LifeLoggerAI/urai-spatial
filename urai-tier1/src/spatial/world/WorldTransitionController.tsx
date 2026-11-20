'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { definitionForDestination } from './destinationRegistry'
import { useUraiWorldState } from './WorldStateProvider'
import {
  URAI_WORLD_RETURN_EVENT,
  URAI_WORLD_TRAVEL_EVENT,
} from './worldEvents'
import type { UraiDestination, UraiWorldTravelRequest } from './worldTypes'
import { resolveWorldReturnDestination } from './worldReturnDestination'
import { prepareFocusViewHandoff, clearFocusViewReturn } from './focusViewReturn'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { claimWorldReturn } from './worldReturnGuard'

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

  const memoryId = target.searchParams.get('memoryId')
  const nodeId = target.searchParams.get('node')
  if (request.destination === 'life-map') {
    if (!nodeId && memoryId) target.searchParams.set('node', memoryId)
  } else if (!memoryId && nodeId) {
    target.searchParams.set('memoryId', nodeId)
  }

  return `${target.pathname}${target.search}${target.hash}`
}

function normalizedPathname(value: string) {
  return value.replace(/\/+$/, '') || '/'
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]')
}

function currentOwnerId(demo: boolean): string | null {
  if (demo) return 'explicit-demo'
  if (!firebasePublicEnvReady) return null
  try { return getAuth(app).currentUser?.uid ?? null } catch { return null }
}

export function WorldTransitionController() {
  const router = useRouter()
  const { world, phase, beginTravel, pendingTravel } = useUraiWorldState()
  const timer = useRef<number | null>(null)
  const navigationWatchdog = useRef<number | null>(null)
  const worldRef = useRef(world)
  const phaseRef = useRef(phase)
  const beginTravelRef = useRef(beginTravel)

  // Logout/account change discards all old owner camera hints before another
  // authenticated memory can be admitted.
  useEffect(() => {
    if (!firebasePublicEnvReady) return
    const auth = getAuth(app)
    let prior = auth.currentUser?.uid ?? null
    return onAuthStateChanged(auth, user => {
      const next = user?.uid ?? null
      if (next !== prior) clearFocusViewReturn()
      prior = next
    }, () => clearFocusViewReturn())
  }, [])

  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { beginTravelRef.current = beginTravel }, [beginTravel])

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

  const executeTravel = useCallback((request: UraiWorldTravelRequest) => {
    clearTimer()
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
        // Camera continuity is optional: storage denial must not block navigation.
      }
    }

    // The provider retains the pending destination and its single-use focus ticket.
    // Navigation is scheduled by the effect below so StrictMode effect cleanup
    // cannot permanently erase a transition after an immediate remount.

  }, [clearTimer])

  useEffect(() => {
    if (phase === 'idle' || !pendingTravel) return
    const href = buildTravelHref(pendingTravel)
    const targetPathname = normalizedPathname(new URL(href, window.location.origin).pathname)
    timer.current = window.setTimeout(() => {
      router.push(href)
      timer.current = null
      navigationWatchdog.current = window.setTimeout(() => {
        navigationWatchdog.current = null
        if (normalizedPathname(window.location.pathname) !== targetPathname) {
          window.location.assign(href)
        }
      }, 2500)
    }, transitionDuration(pendingTravel.destination))
    return clearTimer
  }, [phase, pendingTravel, clearTimer, router])

  const reverseTravel = useCallback(() => {
    const currentWorld = worldRef.current
    // Claim the return synchronously. React reducer updates are batched, so a
    // second same-tick Escape/return event must not consume the one-time ticket
    // or replace the already scheduled authenticated view-only navigation.
    if (!claimWorldReturn(phaseRef)) return
    const destination = resolveWorldReturnDestination(currentWorld)
    const definition = definitionForDestination(destination)
    const ownerId = currentOwnerId(Boolean(currentWorld.demo))
    const handoff = destination === 'focus' && currentWorld.destination === 'replay' &&
      currentWorld.memoryId && currentWorld.replayManifestId && ownerId
      ? prepareFocusViewHandoff(ownerId, currentWorld.memoryId, currentWorld.replayManifestId) : null
    const target = new URL(definition.href, window.location.origin)
    if (handoff) {
      target.searchParams.set('node', handoff.nodeId)
      target.searchParams.set('focusTicket', handoff.ticket)
    }
    executeTravel({
      destination,
      href: handoff ? target.pathname + target.search : definition.href,
      entryPortal: currentWorld.entryPortal ?? definition.entryPortal,
      cameraCheckpoint: handoff ? `focus-return:${handoff.nodeId}`
        : destination === 'home' ? 'home-threshold' : definition.cameraCheckpoint,
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
    const onTravel = (event: WindowEventMap[typeof URAI_WORLD_TRAVEL_EVENT]) => {
      // Normal travel shares the same synchronous claim as reverse travel.
      // Otherwise a same-tick travel+return pair can replace its timer.
      if (!claimWorldReturn(phaseRef)) return
      executeTravel(event.detail)
    }
    const onReturn = () => reverseTravel()
    const onKeyDown = (event: KeyboardEvent) => {
      const currentWorld = worldRef.current
      if (event.defaultPrevented || event.key !== 'Escape' || isEditableTarget(event.target) || Boolean(document.fullscreenElement)) return
      if (currentWorld.destination === 'home' && phaseRef.current === 'idle') return
      // Life Map and Location Map own their realm-specific Escape contracts.
      // The global reverse-travel fallback must not race either realm-owned handler.
      if (currentWorld.destination === 'life-map' || currentWorld.destination === 'location-map' || currentWorld.destination === 'focus') return
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
