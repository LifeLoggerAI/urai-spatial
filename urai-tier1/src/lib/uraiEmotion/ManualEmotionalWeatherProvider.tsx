'use client'

import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { createManualWeatherSession, MANUAL_WEATHER_RESET_EVENT, UNAVAILABLE_MANUAL_WEATHER } from './manualWeatherSession'

type Session = ReturnType<typeof createManualWeatherSession>
type WeatherContext = { session: Session; lease: ReturnType<Session['getLease']> } | null
const Context = createContext<WeatherContext>(null)
const unavailableSnapshot = () => UNAVAILABLE_MANUAL_WEATHER
const subscribeUnavailable = () => () => {}

export default function ManualEmotionalWeatherProvider({ children }: { children: ReactNode }) {
  const [session] = useState(createManualWeatherSession)
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, unavailableSnapshot)
  useEffect(() => {
    let active = true
    let resolved = !firebasePublicEnvReady
    let unsubscribe: (() => void) | undefined
    let auth: ReturnType<typeof getAuth> | null = null
    const bindCurrentViewer = () => {
      if (!active || !resolved) return
      const owner = auth?.currentUser ?? null
      // The token is local and opaque. An auth object alone does not enable
      // this preference: every new binding starts OFF with no chosen reading.
      const viewer = Object.freeze({})
      session.bind(viewer, () => active && resolved && (auth ? auth.currentUser === owner : !firebasePublicEnvReady))
    }
    try {
      if (firebasePublicEnvReady) {
        auth = getAuth(app)
        unsubscribe = onAuthStateChanged(auth, owner => {
          if (!active) return
          if (owner !== auth?.currentUser) { resolved = false; session.end(); return }
          resolved = true
          bindCurrentViewer()
        }, () => { if (active) { resolved = false; session.end() } })
      } else bindCurrentViewer()
    } catch { resolved = false; session.end() }
    const revoke = () => session.revoke()
    const end = () => session.end()
    const resume = (event: PageTransitionEvent) => { if (event.persisted) bindCurrentViewer() }
    window.addEventListener(MANUAL_WEATHER_RESET_EVENT, revoke)
    window.addEventListener('pagehide', end)
    window.addEventListener('pageshow', resume)
    return () => {
      active = false
      resolved = false
      unsubscribe?.()
      window.removeEventListener(MANUAL_WEATHER_RESET_EVENT, revoke)
      window.removeEventListener('pagehide', end)
      window.removeEventListener('pageshow', resume)
      session.end()
    }
  }, [session])
  const value = useMemo(() => ({ session, lease:session.getLease() }), [session, state])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useManualEmotionalWeather() {
  const value = useContext(Context)
  // A streamed consumer must hydrate against the same denied server snapshot,
  // even when the parent effect has already bound its local session.
  const snapshot = useSyncExternalStore(
    value?.session.subscribe ?? subscribeUnavailable,
    value?.session.getSnapshot ?? unavailableSnapshot,
    unavailableSnapshot,
  )
  // Recheck actual viewer/session authority on each consumer read as well as
  // each action. Cached UI state cannot transfer to a successor auth owner.
  return {
    snapshot,
    setEnabled:(enabled: boolean) => value?.session.setEnabled(value.lease, enabled) ?? false,
    choose:(choice: unknown) => value?.session.choose(value.lease, choice) ?? false,
    reset:() => value?.session.reset(value.lease) ?? false,
  }
}
