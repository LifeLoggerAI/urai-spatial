import { correctEmotionalWeather, URAI_EMOTIONAL_WEATHER, type EmotionalWeather, type EmotionalWeatherReading } from './weather'

export const MANUAL_WEATHER_RESET_EVENT = 'urai:manual-emotional-weather-reset'

export type ManualWeatherLease = Readonly<{ viewer: object; revision: number }>
export type ManualWeatherSnapshot = Readonly<{
  ready: boolean
  enabled: boolean
  revision: number
  inferenceEnabled: false
  reading: Readonly<EmotionalWeatherReading>
}>

const emptyReading = (): EmotionalWeatherReading => ({ weather:null, confidence:0, source:'disabled', uncertain:true, medicalDiagnosis:false, updatedAt:0 })
const snapshot = (ready: boolean, enabled: boolean, revision: number, reading = emptyReading()): ManualWeatherSnapshot =>
  Object.freeze({ ready, enabled, revision, inferenceEnabled:false as const, reading:Object.freeze(reading) })
export const UNAVAILABLE_MANUAL_WEATHER = snapshot(false, false, 0)

/** One provider instance owns one document-session. No user identifier or
 * reading is persisted, broadcast, inferred, sent to a server, or shared by SSR. */
export function createManualWeatherSession() {
  let viewer: object | null = null
  let revision = 0
  let isCurrent: (() => boolean) | null = null
  let invalidated = true
  let state = UNAVAILABLE_MANUAL_WEATHER
  const listeners = new Set<() => void>()
  const current = () => {
    if (viewer && isCurrent && !invalidated) {
      try { if (isCurrent() === true) return true } catch {}
    }
    // A once-invalid scope cannot revive an old choice if its source later
    // looks current again. Only a fresh OFF binding establishes a new session.
    invalidated = true
    state = UNAVAILABLE_MANUAL_WEATHER
    return false
  }
  const emit = () => { for (const listener of listeners) listener() }
  const validLease = (lease: ManualWeatherLease | null | undefined) => Boolean(lease && lease.viewer === viewer && lease.revision === revision && current())
  const clear = () => {
    revision += 1
    state = snapshot(current(), false, revision)
    emit()
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => current() ? state : UNAVAILABLE_MANUAL_WEATHER,
    getLease: (): ManualWeatherLease | null => current() && viewer ? Object.freeze({ viewer, revision }) : null,
    bind(nextViewer: object, checkCurrent: () => boolean) {
      viewer = nextViewer
      isCurrent = checkCurrent
      invalidated = false
      clear()
    },
    end() {
      viewer = null
      isCurrent = null
      clear()
    },
    // Reset notifications can only erase. They never carry state or grant
    // manual consent, server consent, inference, or another viewer's authority.
    revoke: clear,
    setEnabled(lease: ManualWeatherLease | null, enabled: boolean) {
      if (!validLease(lease) || typeof enabled !== 'boolean') return false
      if (!enabled) { clear(); return true }
      state = snapshot(true, true, revision, { ...state.reading })
      emit()
      return true
    },
    choose(lease: ManualWeatherLease | null, choice: unknown) {
      if (!validLease(lease) || !state.enabled || typeof choice !== 'string' || !URAI_EMOTIONAL_WEATHER.includes(choice as EmotionalWeather)) return false
      state = snapshot(true, true, revision, correctEmotionalWeather({ ...state.reading }, choice as EmotionalWeather))
      emit()
      return true
    },
    reset(lease: ManualWeatherLease | null) {
      if (!validLease(lease)) return false
      clear()
      return true
    },
  }
}

/** Called before an existing privacy change/deletion request. This adds no
 * network call and does not claim that the requested server operation passed. */
export function notifyManualWeatherRevocation() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(MANUAL_WEATHER_RESET_EVENT))
}
