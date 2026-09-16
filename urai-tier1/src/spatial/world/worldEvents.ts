import { useSceneStore } from '../store/useSceneStore'
import type { UraiWorldTravelRequest } from './worldTypes'

export const URAI_WORLD_TRAVEL_EVENT = 'urai:world-travel'
export const URAI_WORLD_RETURN_EVENT = 'urai:world-return'
export const URAI_WORLD_ORB_OPEN_EVENT = 'urai:world-orb-open'
export const URAI_HOME_ASCENT_EVENT = 'urai:home-ascent'

export type UraiWorldOrbOpenDetail = {
  returnFocusTo?: HTMLElement
}

let pendingOrbOpenDetail: UraiWorldOrbOpenDetail | null = null

const WORLD_TRAVEL_DEBOUNCE_MS = 1500
const WORLD_TRAVEL_FALLBACK_MS = 2400
const WORLD_TRAVEL_OBSERVE_MS = 50
let lastTravelFingerprint = ''
let lastTravelAt = 0

function dispatchSpatialAudioCue(cue: 'transition' | 'orb-confirm' | 'error') {
  window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue } }))
}

function isGroundDestination(request: UraiWorldTravelRequest) {
  return request.destination === 'infrastructure-hub'
}

function isGroundPathname(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return normalized === '/ground'
}

function buildFallbackHref(request: UraiWorldTravelRequest) {
  if (!request.href || typeof window === 'undefined') return request.href
  const target = new URL(request.href, window.location.origin)
  if (request.entryPortal) target.searchParams.set('entryPortal', request.entryPortal)
  if (request.cameraCheckpoint) target.searchParams.set('cameraCheckpoint', request.cameraCheckpoint)

  const context = request.context
  if (context?.memoryId) target.searchParams.set('memoryId', context.memoryId)
  if (context?.threadId) target.searchParams.set('thread', context.threadId)
  if (context?.personId) target.searchParams.set('personId', context.personId)
  if (context?.placeId) target.searchParams.set('placeId', context.placeId)
  if (context?.replayManifestId) target.searchParams.set('manifestId', context.replayManifestId)
  if (context?.privacyMode) target.searchParams.set('privacyMode', context.privacyMode)

  return `${target.pathname}${target.search}${target.hash}`
}

function commitHardFallback(href: string) {
  // Commit exactly one browser-history entry. The previous pushState + reload
  // sequence could race the client router and leave duplicate destination
  // entries, causing one Back action to remain on the destination route.
  window.location.assign(href)
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
  lastTravelFingerprint = fingerprint
  lastTravelAt = now

  // Ground explicitly rejects the generic portal travel language. Until the
  // governed soil/root/stone crossing sound pack exists, the authored Home/Ground
  // worlds and their consent-controlled ambient beds are more truthful than the
  // global portal-transition tone. Other realm travel keeps the existing cue.
  if (!isGroundDestination(request)) dispatchSpatialAudioCue('transition')
  window.dispatchEvent(new CustomEvent<UraiWorldTravelRequest>(URAI_WORLD_TRAVEL_EVENT, { detail: request }))

  const fallbackHref = buildFallbackHref(request)
  if (!fallbackHref) return
  const targetPathname = new URL(fallbackHref, window.location.origin).pathname.replace(/\/+$/, '') || '/'

  let settled = false
  let observer = 0
  const fallback = window.setTimeout(() => {
    if (settled) return
    settled = true
    if (observer) window.clearInterval(observer)
    const currentPathname = window.location.pathname.replace(/\/+$/, '') || '/'
    if (currentPathname !== targetPathname) commitHardFallback(fallbackHref)
  }, WORLD_TRAVEL_FALLBACK_MS)

  observer = window.setInterval(() => {
    const currentPathname = window.location.pathname.replace(/\/+$/, '') || '/'
    if (currentPathname !== targetPathname) return
    settled = true
    window.clearTimeout(fallback)
    window.clearInterval(observer)
  }, WORLD_TRAVEL_OBSERVE_MS)
}

export function requestUraiWorldReturn() {
  if (typeof window === 'undefined') return
  // Ground return is the reverse material/world transition, not a portal cue.
  if (!isGroundPathname()) dispatchSpatialAudioCue('transition')
  window.dispatchEvent(new Event(URAI_WORLD_RETURN_EVENT))
}

export function requestUraiWorldOrbOpen(returnFocusTo?: HTMLElement) {
  if (typeof window === 'undefined') return
  pendingOrbOpenDetail = { returnFocusTo }
  // Keep the native semantic button as the single activation owner. Dispatch on
  // the next task so React/flushSync companion work cannot hold the browser's
  // native pointer transport open, while the pending detail keeps pre-hydration
  // activation lossless for the companion's existing pending-request consumer.
  window.setTimeout(() => {
    const detail = pendingOrbOpenDetail ?? { returnFocusTo }
    dispatchSpatialAudioCue('orb-confirm')
    window.dispatchEvent(new CustomEvent<UraiWorldOrbOpenDetail>(URAI_WORLD_ORB_OPEN_EVENT, { detail }))
  }, 0)
}

/**
 * Atomically consumes an Orb-open request made before the companion hydrated.
 * Keeping this at the event boundary makes activation lossless without adding a
 * second document click owner or dispatching the request twice.
 */
export function takePendingUraiWorldOrbOpen() {
  const detail = pendingOrbOpenDetail
  pendingOrbOpenDetail = null
  return detail
}

declare global {
  interface WindowEventMap {
    [URAI_WORLD_TRAVEL_EVENT]: CustomEvent<UraiWorldTravelRequest>
    [URAI_WORLD_RETURN_EVENT]: Event
    [URAI_WORLD_ORB_OPEN_EVENT]: CustomEvent<UraiWorldOrbOpenDetail>
    [URAI_HOME_ASCENT_EVENT]: CustomEvent<UraiWorldTravelRequest>
  }
}
