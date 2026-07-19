import type { UraiWorldTravelRequest } from './worldTypes'

export const URAI_WORLD_TRAVEL_EVENT = 'urai:world-travel'
export const URAI_WORLD_RETURN_EVENT = 'urai:world-return'
export const URAI_WORLD_ORB_OPEN_EVENT = 'urai:world-orb-open'
export const URAI_WORLD_LOCATION_EVENT = 'urai:world-location'

export type UraiWorldLocationDetail = {
  href: string
}

export function requestUraiWorldTravel(request: UraiWorldTravelRequest) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<UraiWorldTravelRequest>(URAI_WORLD_TRAVEL_EVENT, { detail: request }))
}

export function requestUraiWorldReturn() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(URAI_WORLD_RETURN_EVENT))
}

export function requestUraiWorldOrbOpen() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(URAI_WORLD_ORB_OPEN_EVENT))
}

export function announceUraiWorldLocation(href: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<UraiWorldLocationDetail>(URAI_WORLD_LOCATION_EVENT, { detail: { href } }))
}

declare global {
  interface WindowEventMap {
    [URAI_WORLD_TRAVEL_EVENT]: CustomEvent<UraiWorldTravelRequest>
    [URAI_WORLD_RETURN_EVENT]: Event
    [URAI_WORLD_ORB_OPEN_EVENT]: Event
    [URAI_WORLD_LOCATION_EVENT]: CustomEvent<UraiWorldLocationDetail>
  }
}
