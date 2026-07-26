import type { UraiWorldTravelRequest } from './worldTypes'

export const URAI_WORLD_TRAVEL_EVENT = 'urai:world-travel'
export const URAI_WORLD_RETURN_EVENT = 'urai:world-return'
export const URAI_WORLD_ORB_OPEN_EVENT = 'urai:world-orb-open'

const WORLD_TRAVEL_DEBOUNCE_MS = 1500
const WORLD_TRAVEL_FALLBACK_MS = 2400
const WORLD_TRAVEL_OBSERVE_MS = 50
let lastTravelFingerprint = ''
let lastTravelAt = 0

export function requestUraiWorldTravel(request: UraiWorldTravelRequest) {
  if (typeof window === 'undefined') return
  const now = Date.now()
  const fingerprint = JSON.stringify(request)
  if (fingerprint === lastTravelFingerprint && now - lastTravelAt < WORLD_TRAVEL_DEBOUNCE_MS) return
  lastTravelFingerprint = fingerprint
  lastTravelAt = now
  const startingLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
  window.dispatchEvent(new CustomEvent<UraiWorldTravelRequest>(URAI_WORLD_TRAVEL_EVENT, { detail: request }))

  const fallbackHref = request.href
  if (!fallbackHref) return

  let settled = false
  let observer = 0
  const fallback = window.setTimeout(() => {
    if (settled) return
    settled = true
    if (observer) window.clearInterval(observer)
    const currentLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (currentLocation === startingLocation) window.location.assign(fallbackHref)
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
