import { useSceneStore } from '../store/useSceneStore'
import type { UraiWorldTravelRequest } from './worldTypes'

export const URAI_WORLD_TRAVEL_EVENT = 'urai:world-travel'
export const URAI_WORLD_RETURN_EVENT = 'urai:world-return'
export const URAI_WORLD_ORB_OPEN_EVENT = 'urai:world-orb-open'
export const URAI_HOME_ASCENT_EVENT = 'urai:home-ascent'

export type UraiWorldOrbOpenDetail = {
  returnFocusTo?: HTMLElement
}

const WORLD_TRAVEL_DEBOUNCE_MS = 1500
const WORLD_TRAVEL_FALLBACK_MS = 2400
const WORLD_TRAVEL_OBSERVE_MS = 50
let lastTravelFingerprint = ''
let lastTravelAt = 0

function dispatchSpatialAudioCue(cue: 'transition' | 'orb-confirm' | 'error') {
  window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue } }))
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
  const startingLocation = `${window.location.pathname}${window.location.search}${window.location.hash}`
  dispatchSpatialAudioCue('transition')
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
  dispatchSpatialAudioCue('transition')
  window.dispatchEvent(new Event(URAI_WORLD_RETURN_EVENT))
}

export function requestUraiWorldOrbOpen(returnFocusTo?: HTMLElement) {
  if (typeof window === 'undefined') return
  dispatchSpatialAudioCue('orb-confirm')
  window.dispatchEvent(new CustomEvent<UraiWorldOrbOpenDetail>(URAI_WORLD_ORB_OPEN_EVENT, { detail: { returnFocusTo } }))
}

declare global {
  interface WindowEventMap {
    [URAI_WORLD_TRAVEL_EVENT]: CustomEvent<UraiWorldTravelRequest>
    [URAI_WORLD_RETURN_EVENT]: Event
    [URAI_WORLD_ORB_OPEN_EVENT]: CustomEvent<UraiWorldOrbOpenDetail>
    [URAI_HOME_ASCENT_EVENT]: CustomEvent<UraiWorldTravelRequest>
  }
}
