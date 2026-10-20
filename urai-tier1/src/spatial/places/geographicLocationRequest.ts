import { applyPrecision, isValidCoordinate, type GeographicCoordinate } from './geographicLocationVault'

export type GeographicRequestAuthority = {
  mounted: boolean
  online: boolean
  storageAvailable: boolean
  ownerId: string | null
  currentAuthOwnerId: string | null
  state: 'loading' | 'signed-out' | 'ready' | 'unavailable'
  mode: 'granted' | 'limited' | 'paused' | 'denied'
  revision: number
  precise: boolean
}

type GeographicRequestSink = {
  requested: () => void
  retainConsent: () => void
  accepted: (coordinate: GeographicCoordinate, precise: boolean) => void
  invalid: () => void
  failed: (code: number) => void
  storageFailed: () => void
}

function allowed(authority: GeographicRequestAuthority): boolean {
  return authority.mounted && authority.online && authority.storageAvailable
    && authority.ownerId === authority.currentAuthOwnerId
    && Number.isSafeInteger(authority.revision) && authority.revision >= 0
    && (authority.mode === 'granted' || authority.mode === 'limited')
    && (authority.state === 'ready' ? Boolean(authority.ownerId) : authority.state === 'signed-out' && authority.ownerId === null)
}

function identity(authority: GeographicRequestAuthority): string {
  return JSON.stringify([authority.ownerId, authority.currentAuthOwnerId, authority.state, authority.mode, authority.revision, authority.precise])
}

// Browser getCurrentPosition has no cancellation API. Invalidate its publication
// token immediately at every authority/revocation/deletion/lifecycle boundary.
export function createGeographicLocationRequest(readAuthority: () => GeographicRequestAuthority, sink: GeographicRequestSink) {
  let generation = 0
  let pending: number | null = null
  const cancel = () => {
    const wasPending = pending !== null
    generation += 1
    pending = null
    return wasPending
  }
  const request = (geolocation: Pick<Geolocation, 'getCurrentPosition'>): boolean => {
    const initial = readAuthority()
    if (!allowed(initial)) return false
    const requestGeneration = ++generation
    pending = requestGeneration
    const requestIdentity = identity(initial)
    const current = () => {
      const live = readAuthority()
      return pending === requestGeneration && generation === requestGeneration && allowed(live) && identity(live) === requestIdentity
    }
    sink.requested()
    if (!current()) return false
    try {
      geolocation.getCurrentPosition(position => {
        if (!current()) return
        const received = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy }
        if (!isValidCoordinate(received)) { pending = null; sink.invalid(); return }
        const precise = initial.state === 'ready' && Boolean(initial.ownerId) && initial.precise
        const coordinate = precise ? received : applyPrecision(received, 'approximate')
        if (!current()) return
        try { sink.retainConsent() } catch { cancel(); sink.storageFailed(); return }
        if (!current()) return
        pending = null
        sink.accepted(coordinate, precise)
      }, error => {
        if (!current()) return
        pending = null
        sink.failed(error.code)
      }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 })
    } catch {
      if (current()) { pending = null; sink.failed(2) }
    }
    return true
  }
  return { request, cancel }
}
