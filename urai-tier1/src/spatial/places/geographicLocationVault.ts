export type GeographicPrecision = 'city' | 'approximate' | 'exact-private'
export type GeographicPermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'dismissed' | 'revoked' | 'unavailable' | 'unsupported' | 'offline' | 'timeout' | 'error'

export type GeographicCoordinate = {
  latitude: number
  longitude: number
  accuracyMeters?: number
}

export type GeographicMemoryPin = {
  id: string
  title: string
  coordinate: GeographicCoordinate
  readablePlace: string
  precision: GeographicPrecision
  createdAt: string
}

export type LocationVaultExport = {
  schemaVersion: 'urai-location-vault-1'
  exportedAt: string
  pins: GeographicMemoryPin[]
}

export const LOCATION_CONSENT_KEY = 'urai:geographic-location-consent:v1'
export const LOCATION_PINS_KEY = 'urai:geographic-memory-pins:v1'

export function isValidCoordinate(value: GeographicCoordinate | null | undefined): value is GeographicCoordinate {
  if (!value) return false
  return Number.isFinite(value.latitude)
    && Number.isFinite(value.longitude)
    && value.latitude >= -90
    && value.latitude <= 90
    && value.longitude >= -180
    && value.longitude <= 180
    && (value.accuracyMeters === undefined || (Number.isFinite(value.accuracyMeters) && value.accuracyMeters >= 0))
}

export function applyPrecision(value: GeographicCoordinate, precision: GeographicPrecision): GeographicCoordinate {
  if (!isValidCoordinate(value)) throw new Error('MALFORMED_COORDINATE')
  if (precision === 'exact-private') return { ...value }
  const digits = precision === 'city' ? 2 : 3
  const scale = 10 ** digits
  return {
    latitude: Math.round(value.latitude * scale) / scale,
    longitude: Math.round(value.longitude * scale) / scale,
    accuracyMeters: value.accuracyMeters,
  }
}

export function parsePins(raw: string | null): GeographicMemoryPin[] {
  if (!raw) return []
  try {
    const candidate: unknown = JSON.parse(raw)
    if (!Array.isArray(candidate)) return []
    return candidate.filter((entry): entry is GeographicMemoryPin => {
      if (!entry || typeof entry !== 'object') return false
      const pin = entry as Partial<GeographicMemoryPin>
      return typeof pin.id === 'string'
        && typeof pin.title === 'string'
        && typeof pin.readablePlace === 'string'
        && typeof pin.createdAt === 'string'
        && (pin.precision === 'city' || pin.precision === 'approximate' || pin.precision === 'exact-private')
        && isValidCoordinate(pin.coordinate)
    })
  } catch {
    return []
  }
}

export function exportPins(pins: GeographicMemoryPin[], exportedAt = new Date().toISOString()): LocationVaultExport {
  return {
    schemaVersion: 'urai-location-vault-1',
    exportedAt,
    pins: pins.filter(pin => isValidCoordinate(pin.coordinate)),
  }
}

export function createPin(input: {
  title: string
  coordinate: GeographicCoordinate
  readablePlace: string
  precision: GeographicPrecision
  now?: string
  id?: string
}): GeographicMemoryPin {
  const title = input.title.trim()
  const readablePlace = input.readablePlace.trim()
  if (!title || !readablePlace) throw new Error('LOCATION_PIN_LABEL_REQUIRED')
  return {
    id: input.id ?? `place-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    coordinate: applyPrecision(input.coordinate, input.precision),
    readablePlace,
    precision: input.precision,
    createdAt: input.now ?? new Date().toISOString(),
  }
}

export function geolocationErrorState(code: number): GeographicPermissionState {
  if (code === 1) return 'denied'
  if (code === 2) return 'unavailable'
  if (code === 3) return 'timeout'
  return 'error'
}
