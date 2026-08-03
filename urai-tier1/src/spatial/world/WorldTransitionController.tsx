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

const CONTEXT_KEYS = [
  'memoryId',
  'node',
  'thread',
  'personId',
  'placeId',
  'manifestId',
  'privacyMode',
  'demo',
] as const

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function transitionDuration(destination: UraiDestination) {
  if (prefersReducedMotion()) return 260
  if (destination === 'replay' || destination === 'location-map') return 1900
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
  if (context?.privacyMode) target.searchParams.set('privacyMode', context.privacyMode)
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

function fallbackReturnDestination(destination: UraiDestination): UraiDestination {
  if (destination === 'focus') return 'life-map'
  if (destination === 'replay') return 'focus'
  if (destination === 'infrastructure-hub') return 'home'
  return 'infrastructure-hub'
}

export function WorldTransitionController() {
  const router = useRouter()
  const { world, phase, beginTravel } = useUraiWorldState()
  const timer = useRef<number | null>(null)
  const navigationWatchdog = useRef<number | null>(null)
  const worldRef = useRef(world)
  const phaseRef = useRef(phase)
  const beginTravelRef = useRef(beginTravel)

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
      window.sessionStorage.setItem('urai-world-home-checkpoint', JSON.stringify({
        destination: currentWorld.destination,
        entryPortal: request.entryPortal ?? 'ground-gateway',
        cameraCheckpoint: currentWorld.cameraCheckpoint ?? 'home-threshold',
        savedAt: Date.now(),
      }))
    }

    const href = buildTravelHref(request)
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
    }, transitionDuration(request.destination))
  }, [clearTimer, router])

  const reverseTravel = useCallback(() => {
    const currentWorld = worldRef.current
    if (phaseRef.current !== 'idle') return
    const destination = currentWorld.previousDestination ?? fallbackReturnDestination(currentWorld.destination)
    const definition = definitionForDestination(destination)
    executeTravel({
      destination,
      href: definition.href,
      entryPortal: currentWorld.entryPortal ?? definition.entryPortal,
      cameraCheckpoint: destination === 'home' ? 'home-threshold' : definition.cameraCheckpoint,
      context: {
        memoryId: currentWorld.memoryId,
        threadId: currentWorld.threadId,
        personId: currentWorld.personId,
        placeId: currentWorld.placeId,
        replayManifestId: currentWorld.replayManifestId,
        privacyMode: currentWorld.privacyMode,
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
      if (currentWorld.destination === 'life-map' || currentWorld.destination === 'location-map') return
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
