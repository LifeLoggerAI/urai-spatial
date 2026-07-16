'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { definitionForDestination } from './destinationRegistry'
import { useUraiWorldState } from './WorldStateProvider'
import {
  URAI_WORLD_RETURN_EVENT,
  URAI_WORLD_TRAVEL_EVENT,
} from './worldEvents'
import type { UraiDestination, UraiWorldTravelRequest } from './worldTypes'

const CONTEXT_KEYS = [
  'memoryId',
  'thread',
  'personId',
  'placeId',
  'manifestId',
  'privacyMode',
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
  if (request.entryPortal) target.searchParams.set('entryPortal', request.entryPortal)
  if (request.cameraCheckpoint) target.searchParams.set('cameraCheckpoint', request.cameraCheckpoint)

  return `${target.pathname}${target.search}${target.hash}`
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]')
}

export function WorldTransitionController() {
  const router = useRouter()
  const { world, phase, pendingTravel, beginTravel, cancelTransition } = useUraiWorldState()
  const timer = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
  }, [])

  const executeTravel = useCallback((request: UraiWorldTravelRequest) => {
    clearTimer()
    beginTravel(request)

    if (world.destination === 'home') {
      window.sessionStorage.setItem('urai-world-home-checkpoint', JSON.stringify({
        destination: world.destination,
        entryPortal: request.entryPortal ?? 'ground-gateway',
        cameraCheckpoint: world.cameraCheckpoint ?? 'home-threshold',
        savedAt: Date.now(),
      }))
    }

    const href = buildTravelHref(request)
    timer.current = window.setTimeout(() => {
      router.push(href)
      timer.current = null
    }, transitionDuration(request.destination))
  }, [beginTravel, clearTimer, router, world])

  const reverseTravel = useCallback(() => {
    if (phase !== 'idle') return
    const destination = world.previousDestination ?? (world.destination === 'infrastructure-hub' ? 'home' : 'infrastructure-hub')
    const definition = definitionForDestination(destination)
    executeTravel({
      destination,
      href: definition.href,
      entryPortal: world.entryPortal ?? definition.entryPortal,
      cameraCheckpoint: destination === 'home' ? 'home-threshold' : definition.cameraCheckpoint,
      context: {
        memoryId: world.memoryId,
        threadId: world.threadId,
        personId: world.personId,
        placeId: world.placeId,
        replayManifestId: world.replayManifestId,
        privacyMode: world.privacyMode,
      },
    })
  }, [executeTravel, phase, world])

  useEffect(() => {
    const onTravel = (event: WindowEventMap[typeof URAI_WORLD_TRAVEL_EVENT]) => executeTravel(event.detail)
    const onReturn = () => reverseTravel()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isEditableTarget(event.target)) return
      if (world.destination === 'home' && phase === 'idle') return
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
  }, [clearTimer, executeTravel, phase, reverseTravel, world.destination])

  useEffect(() => {
    if (phase === 'idle' || pendingTravel) return
    cancelTransition()
  }, [cancelTransition, pendingTravel, phase])

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
