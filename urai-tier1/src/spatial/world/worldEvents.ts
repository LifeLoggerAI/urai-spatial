import type { UraiWorldTravelRequest } from './worldTypes'

export const URAI_WORLD_TRAVEL_EVENT = 'urai:world-travel'
export const URAI_WORLD_RETURN_EVENT = 'urai:world-return'
export const URAI_WORLD_ORB_OPEN_EVENT = 'urai:world-orb-open'

const WORLD_TRAVEL_DEBOUNCE_MS = 1500
const WORLD_TRAVEL_FALLBACK_MS = 2400
const WORLD_TRAVEL_OBSERVE_MS = 50
let lastTravelFingerprint = ''
let lastTravelAt = 0

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
  window.history.pushState(window.history.state, '', href)
  window.location.reload()
}

export function requestUraiWorldTravel(request: UraiWorldTravelRequest) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  const fingerprint = JSON.stringify(request)
  if (fingerprint === lastTravelFingerprint && now - lastTravelAt < WORLD_TRAVEL_DEBOUNCE_MS) return
  lastTravelFingerprint = fingerprint
  lastTravelAt = now
  const startingLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
  window.dispatchEvent(new CustomEvent<UraiWorldTravelRequest>(URAI_WORLD_TRAVEL_EVENT, { detail: request }))

  const fallbackHref = buildFallbackHref(request)
  if (!fallbackHref) return

  let settled = false
  let observer = 0
  const fallback = window.setTimeout(() => {
    if (settled) return
    settled = true
    if (observer) window.clearInterval(observer)
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (currentLocation === startingLocation) commitHardFallback(fallbackHref)
  }, WORLD_TRAVEL_FALLBACK_MS)

  observer = window.setInterval(() => {
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (currentLocation === startingLocation) return
    settled = true
    window.clearTimeout(fallback)
    window.clearInterval(observer)
  }, WORLD_TRAVEL_OBSERVE_MS)
}

export function requestUraiWorldReturn() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(URAI_WORLD_RETURN_EVENT))
}

export function requestUraiWorldOrbOpen() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(URAI_WORLD_ORB_OPEN_EVENT))
}

declare global {
  interface WindowEventMap {
    [URAI_WORLD_TRAVEL_EVENT]: CustomEvent<UraiWorldTravelRequest>
    [URAI_WORLD_RETURN_EVENT]: Event
    [URAI_WORLD_ORB_OPEN_EVENT]: Event
  }
}
