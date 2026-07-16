import type { UraiWorldTravelRequest } from './worldTypes'

export const URAI_WORLD_TRAVEL_EVENT = 'urai:world-travel'
export const URAI_WORLD_RETURN_EVENT = 'urai:world-return'

export function requestUraiWorldTravel(request: UraiWorldTravelRequest) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<UraiWorldTravelRequest>(URAI_WORLD_TRAVEL_EVENT, { detail: request }))
}

export function requestUraiWorldReturn() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(URAI_WORLD_RETURN_EVENT))
}

declare global {
  interface WindowEventMap {
    [URAI_WORLD_TRAVEL_EVENT]: CustomEvent<UraiWorldTravelRequest>
    [URAI_WORLD_RETURN_EVENT]: Event
  }
}
