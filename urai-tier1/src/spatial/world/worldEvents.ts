import { useSceneStore } from '../store/useSceneStore'
import type { UraiWorldTravelRequest } from './worldTypes'

export const URAI_WORLD_TRAVEL_EVENT = 'urai:world-travel'
export const URAI_WORLD_RETURN_EVENT = 'urai:world-return'
export const URAI_WORLD_ORB_OPEN_EVENT = 'urai:world-orb-open'
export const URAI_HOME_ASCENT_EVENT = 'urai:home-ascent'

const WORLD_TRAVEL_DEBOUNCE_MS = 1500
const WORLD_TRAVEL_FALLBACK_MS = 2400
const WORLD_TRAVEL_OBSERVE_MS = 50
const WORLD_TRAVEL_CONTEXT_KEYS = [
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
let lastTravelFingerprint = ''
let lastTravelAt = 0
let fallbackGeneration = 0
let pendingFallbackTimeout: number | null = null
let pendingFallbackObserver: number | null = null
let pendingFallbackPopstateListener: (() => void) | null = null

function cancelPendingWorldTravelFallback() {
  // Invalidate callbacks that were already queued before timers were cleared.
  fallbackGeneration += 1
  if (typeof window !== 'undefined') {
    if (pendingFallbackTimeout !== null) window.clearTimeout(pendingFallbackTimeout)
    if (pendingFallbackObserver !== null) window.clearInterval(pendingFallbackObserver)
    if (pendingFallbackPopstateListener !== null) window.removeEventListener('popstate', pendingFallbackPopstateListener)
  }
  pendingFallbackTimeout = null
  pendingFallbackObserver = null
  pendingFallbackPopstateListener = null
}

function dispatchSpatialAudioCue(cue: 'transition' | 'orb-confirm' | 'error') {
  window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue } }))
}

function buildFallbackHref(request: UraiWorldTravelRequest) {
  if (!request.href || typeof window === 'undefined') return request.href
  const target = new URL(request.href, window.location.origin)
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
  // Match the canonical WorldTransitionController: visual node and private
  // memory identities are separate even when its delayed hard fallback runs.
  for (const key of WORLD_TRAVEL_CONTEXT_KEYS) {
    if (key === 'memoryId' && (!memoryDestination || !selectedMemoryId)) continue
    if ((key === 'node' || key === 'manifestId' || key === 'movieId' || key === 'chapterId' || key === 'demo') && (!memoryDestination || !sameMemory)) continue
    // Relationship hints from an old memory never scope a different selection.
    if ((key === 'thread' || key === 'personId' || key === 'placeId') && (neutralDestination || (selectedMemoryId && !sameMemory))) continue
    // A privacy-mode hint from an old memory cannot describe a new star or neutral realm.
    if (key === 'privacyMode' && (!memoryDestination || !sameMemory)) continue
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
    target.searchParams.delete('privacyMode')
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
  if (memoryDestination && context?.privacyMode) target.searchParams.set('privacyMode', context.privacyMode)
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

  return `${target.pathname}${target.search}${target.hash}`
}

function commitHardFallback(href: string) {
  // Commit exactly one browser-history entry. If the client router already moved
  // the URL but failed to mount the destination surface, assigning the same URL
  // may not create a fresh document. Force a reload only in that stalled case.
  const target = new URL(href, window.location.origin)
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const targetLocation = `${target.pathname}${target.search}${target.hash}`
  if (current === targetLocation) {
    window.location.reload()
    return
  }
  window.location.assign(href)
}

export function destinationSurfaceReady(destination: UraiWorldTravelRequest['destination']) {
  const selectedMemorySurfaceMatchesRoute = (surface: Element | null) => {
    if (!surface) return false
    if (typeof window === 'undefined') return true
    const params = new URLSearchParams(window.location.search)
    const mountedId = surface.getAttribute('data-memory-id')
    // A neutral loading or denied-state surface is truthful; never require
    // its private media to resolve just to acknowledge a mounted route.
    if (!mountedId) return true
    const requestedId = params.get('memoryId')
    if (!requestedId) return false
    const expectedId = params.get('demo') === '1' && !requestedId.startsWith('demo:')
      ? `demo:${requestedId}` : requestedId
    if (mountedId !== expectedId) return false
    const requestedManifest = params.get('manifestId')
    const mountedManifest = surface.getAttribute('data-manifest-id')
    // A selected private-memory surface must expose the requested manifest.
    // Neutral loading or denied states return above, before this guard.
    return !requestedManifest || requestedManifest === mountedManifest
  }
  if (destination === 'focus') return selectedMemorySurfaceMatchesRoute(document.querySelector('[data-testid="urai-final-focus-chamber"]'))
  if (destination === 'life-map') return Boolean(
    document.querySelector('[data-testid="urai-r3f-canonical-lifemap"]') ||
    document.querySelector('[data-testid="urai-life-map-signed-out-threshold"]') ||
    document.querySelector('[data-testid="urai-life-map-authored-fallback"]')
  )
  if (destination === 'replay') return selectedMemorySurfaceMatchesRoute(document.querySelector('[data-testid="cinematic-replay-client"]'))
  if (destination === 'passport') return Boolean(document.querySelector('main[data-route-owner="passport-ownership-vault"]'))
  return true
}

function shouldBeginHomeAscent(request: UraiWorldTravelRequest) {
  if (request.destination !== 'life-map') return false
  if (request.entryPortal !== 'home-sky' || request.cameraCheckpoint !== 'home-sky-ascent') return false
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  if (pathname !== '/' && pathname !== '/home') return false
  return Boolean(document.querySelector('.urai-asset-home-world canvas'))
}

function markHomeAscentClosing(request: UraiWorldTravelRequest) {
  if (request.destination !== 'life-map') return
  if (request.entryPortal !== 'home-sky' || request.cameraCheckpoint !== 'home-sky-ascent-complete') return
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  if (pathname !== '/' && pathname !== '/home') return
  const owner = document.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
  if (!owner) return
  if (owner.getAttribute('data-home-portal-sequence') !== 'life-map:traversal') return
  owner.setAttribute('data-home-portal-sequence', 'life-map:closing')
}

export function requestUraiWorldTravel(request: UraiWorldTravelRequest) {
  if (typeof window === 'undefined') return

  if (shouldBeginHomeAscent(request)) {
    cancelPendingWorldTravelFallback()
    lastTravelFingerprint = ''
    lastTravelAt = 0
    const scene = useSceneStore.getState()
    if (scene.phase !== 'ASCENT') scene.enterLifeMap()
    dispatchSpatialAudioCue('transition')
    window.dispatchEvent(new CustomEvent<UraiWorldTravelRequest>(URAI_HOME_ASCENT_EVENT, { detail: request }))
    return
  }

  // The completed Home sky ascent owns a real closing phase before route handoff.
  // This is intentionally bound at the canonical travel boundary so the phase is
  // committed before either the client router or hard fallback can tear Home down.
  markHomeAscentClosing(request)

  const now = Date.now()
  const fingerprint = JSON.stringify(request)
  if (fingerprint === lastTravelFingerprint && now - lastTravelAt < WORLD_TRAVEL_DEBOUNCE_MS) return
  cancelPendingWorldTravelFallback()
  const generation = fallbackGeneration
  lastTravelFingerprint = fingerprint
  lastTravelAt = now
  const startingLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
  dispatchSpatialAudioCue('transition')
  window.dispatchEvent(new CustomEvent<UraiWorldTravelRequest>(URAI_WORLD_TRAVEL_EVENT, { detail: request }))
  if (generation !== fallbackGeneration) return

  const fallbackHref = buildFallbackHref(request)
  if (!fallbackHref) return
  const target = new URL(fallbackHref, window.location.origin)
  const targetLocation = `${target.pathname}${target.search}${target.hash}`

  let settled = false
  let reachedTarget = false
  let observer = 0
  // Browser Back/Forward is an immediate ownership change; polling can miss
  // a target-and-return completed entirely between two 50ms samples.
  const onPopstate = () => cancelPendingWorldTravelFallback()
  window.addEventListener('popstate', onPopstate)
  pendingFallbackPopstateListener = onPopstate
  const fallback = window.setTimeout(() => {
    if (settled || generation !== fallbackGeneration) return
    settled = true
    if (observer) window.clearInterval(observer)
    pendingFallbackTimeout = null
    pendingFallbackObserver = null
    window.removeEventListener('popstate', onPopstate)
    if (pendingFallbackPopstateListener === onPopstate) pendingFallbackPopstateListener = null
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
    // A direct router navigation elsewhere (including Back after reaching the
    // intended target) supersedes this attempt; never resurrect that route.
    if (currentLocation !== startingLocation && currentLocation !== targetLocation) return
    if (currentLocation === startingLocation && reachedTarget) return
    if (currentLocation === startingLocation || !destinationSurfaceReady(request.destination)) commitHardFallback(fallbackHref)
  }, WORLD_TRAVEL_FALLBACK_MS)

  pendingFallbackTimeout = fallback
  observer = window.setInterval(() => {
    if (generation !== fallbackGeneration) { window.clearInterval(observer); return }
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (currentLocation === targetLocation && targetLocation !== startingLocation) reachedTarget = true
    if (currentLocation === startingLocation && !reachedTarget) return
    if (currentLocation === targetLocation && !destinationSurfaceReady(request.destination)) return
    settled = true
    window.clearTimeout(fallback)
    window.clearInterval(observer)
    pendingFallbackTimeout = null
    pendingFallbackObserver = null
    window.removeEventListener('popstate', onPopstate)
    if (pendingFallbackPopstateListener === onPopstate) pendingFallbackPopstateListener = null
  }, WORLD_TRAVEL_OBSERVE_MS)
  pendingFallbackObserver = observer
}

export function requestUraiWorldReturn() {
  if (typeof window === 'undefined') return
  cancelPendingWorldTravelFallback()
  // A real return ends the prior journey. Keep duplicate-click protection
  // within one traversal, but never suppress a new Focus -> Replay entry just
  // because the user legitimately returned in under 1.5 seconds.
  lastTravelFingerprint = ''
  lastTravelAt = 0
  dispatchSpatialAudioCue('transition')
  window.dispatchEvent(new Event(URAI_WORLD_RETURN_EVENT))
}

export function requestUraiWorldOrbOpen() {
  if (typeof window === 'undefined') return
  dispatchSpatialAudioCue('orb-confirm')
  window.dispatchEvent(new Event(URAI_WORLD_ORB_OPEN_EVENT))
}

declare global {
  interface WindowEventMap {
    [URAI_WORLD_TRAVEL_EVENT]: CustomEvent<UraiWorldTravelRequest>
    [URAI_WORLD_RETURN_EVENT]: Event
    [URAI_WORLD_ORB_OPEN_EVENT]: Event
    [URAI_HOME_ASCENT_EVENT]: CustomEvent<UraiWorldTravelRequest>
  }
}
