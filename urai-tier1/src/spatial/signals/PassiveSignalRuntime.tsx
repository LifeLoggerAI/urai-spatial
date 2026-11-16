'use client'

import { useEffect, useRef, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions, getFirebaseDb } from '@/lib/firebase/client'

type RuntimeAuthority = {
  ownerId: string | null
  workforce: boolean
  location: boolean
  revision: number
}

const STILLNESS_MS = 120_000
const SIGNAL_COOLDOWN_MS = 5 * 60_000

function boundedMotion(event: DeviceMotionEvent) {
  const acceleration = event.accelerationIncludingGravity
  const components = [acceleration?.x, acceleration?.y, acceleration?.z].filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (!components.length) return null
  return Math.min(1000, Math.sqrt(components.reduce((sum, value) => sum + value * value, 0)))
}

export default function PassiveSignalRuntime() {
  const [user, setUser] = useState<User | null>(null)
  const [authority, setAuthority] = useState<RuntimeAuthority>({ ownerId: null, workforce: false, location: false, revision: 0 })
  // Increment synchronously with each auth event; React effect cleanup may run later.
  const authEpoch = useRef({ ownerId: null as string | null, revision: 0 })
  // Snapshot callbacks revoke client authority synchronously, before next render.
  const currentConsent = useRef<RuntimeAuthority>({ ownerId: null, workforce: false, location: false, revision: 0 })
  const lastSent = useRef<Record<string, number>>({})
  const lastSentOwner = useRef<string | null>(null)
  const lastActivityAt = useRef(Date.now())
  const cancelTimes = useRef<number[]>([])
  const motionSamples = useRef<number[]>([])

  useEffect(() => {
    if (!firebasePublicEnvReady) return
    return onAuthStateChanged(getAuth(app), (nextUser) => {
      authEpoch.current = { ownerId: nextUser?.uid ?? null, revision: authEpoch.current.revision + 1 }
      // A newly authenticated session must not inherit another session's cooldown.
      lastSent.current = {}
      lastSentOwner.current = null
      setUser(nextUser)
    })
  }, [])

  useEffect(() => {
    const resetConsent = (ownerId: string | null) => {
      const next: RuntimeAuthority = {
        ownerId, workforce: false, location: false,
        revision: currentConsent.current.revision + 1,
      }
      currentConsent.current = next
      setAuthority(next)
    }
    if (!user) {
      resetConsent(null)
      lastSent.current = {}
      lastSentOwner.current = null
      return
    }

    resetConsent(user.uid)
    const workforceRef = doc(getFirebaseDb(), 'users', user.uid, 'privacyRuntime', 'workforce-actions')
    const locationRef = doc(getFirebaseDb(), 'users', user.uid, 'privacyRuntime', 'location-collection')
    let workforce = false
    let location = false
    let subscribed = true
    const publish = () => {
      if (!subscribed) return
      const previous = currentConsent.current
      if (previous.ownerId === user.uid && previous.workforce === workforce && previous.location === location) return
      const next: RuntimeAuthority = { ownerId: user.uid, workforce, location, revision: previous.revision + 1 }
      currentConsent.current = next
      setAuthority(next)
    }
    const offWorkforce = onSnapshot(workforceRef, (snapshot) => {
      workforce = snapshot.exists() && snapshot.get('enabled') === true && snapshot.get('automationEnabled') === true
      publish()
    }, () => { workforce = false; publish() })
    const offLocation = onSnapshot(locationRef, (snapshot) => {
      location = snapshot.exists() && snapshot.get('enabled') === true
      publish()
    }, () => { location = false; publish() })
    return () => {
      subscribed = false
      offWorkforce(); offLocation()
      // Revokes callbacks captured by this subscription, including same-user
      // permission requests that would otherwise outlive a consent transition.
      if (currentConsent.current.ownerId === user.uid) {
        currentConsent.current = { ownerId: null, workforce: false, location: false, revision: currentConsent.current.revision + 1 }
      }
    }
  }, [user])

  useEffect(() => {
    if (!user || authority.ownerId !== user.uid || !authority.workforce) return

    // A pending browser permission or geolocation callback may outlive this
    // owner's effect. A later signed-in account must not inherit its payload.
    const ownerId = user.uid
    const authRevision = authEpoch.current.revision
    const consentRevision = authority.revision
    let active = true
    const currentSession = (type?: string) => {
      const liveConsent = currentConsent.current
      return active && authEpoch.current.revision === authRevision && authEpoch.current.ownerId === ownerId
        && getAuth(app).currentUser?.uid === ownerId
        && liveConsent.ownerId === ownerId && liveConsent.revision === consentRevision && liveConsent.workforce
        && (type !== 'location' || liveConsent.location)
    }
    if (lastSentOwner.current !== ownerId) {
      lastSentOwner.current = ownerId
      lastSent.current = {}
    }

    const record = async (type: string, payload: Record<string, unknown>, force = false) => {
      if (!currentSession(type)) return
      const now = Date.now()
      if (!force && now - (lastSent.current[type] ?? 0) < SIGNAL_COOLDOWN_MS) return
      if (!currentSession(type)) return
      lastSent.current[type] = now
      try {
        const callable = httpsCallable(functions, 'recordPassiveSignal')
        await callable({ type, payload })
      } catch {
        // Fail closed and quiet. Consent or connectivity changes must never turn
        // passive-signal failure into a blocking product error.
      }
    }

    const markActivity = () => { lastActivityAt.current = Date.now() }
    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((name) => window.addEventListener(name, markActivity, { passive: true }))

    const hour = new Date().getHours()
    if (hour >= 23 || hour < 5) {
      void record('late-night', {
        source: 'browser-session',
        localHour: hour,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      markActivity()
      if (event.key !== 'Escape') return
      const now = Date.now()
      cancelTimes.current = [...cancelTimes.current.filter((time) => now - time <= 3_000), now]
      if (cancelTimes.current.length >= 2) {
        void record('quick-cancel', {
          source: 'keyboard',
          count: cancelTimes.current.length,
          windowMs: 3_000,
        })
        cancelTimes.current = []
      }
    }
    window.addEventListener('keydown', onKeyDown)

    const stillnessTimer = window.setInterval(() => {
      const durationMs = Date.now() - lastActivityAt.current
      if (durationMs >= STILLNESS_MS && !document.hidden) {
        void record('stillness', { source: 'browser-session', durationMs })
      }
    }, 30_000)

    const onMotion = (event: DeviceMotionEvent) => {
      const intensity = boundedMotion(event)
      if (intensity === null) return
      motionSamples.current.push(intensity)
      if (motionSamples.current.length < 20) return
      const average = motionSamples.current.reduce((sum, value) => sum + value, 0) / motionSamples.current.length
      motionSamples.current = []
      void record('motion', {
        source: 'device-motion',
        intensity: average,
        sampleWindowMs: 20_000,
        deviceMotion: true,
      })
    }
    window.addEventListener('devicemotion', onMotion, { passive: true })

    void record('session-activity', { source: 'browser-session', activity: 'active' })

    if (authority.location && 'permissions' in navigator && 'geolocation' in navigator) {
      void navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
        if (!currentSession('location') || permission.state !== 'granted') return
        navigator.geolocation.getCurrentPosition((position) => {
          if (!currentSession('location')) return
          void record('location', {
            source: 'browser-geolocation',
            precision: position.coords.accuracy <= 250 ? 'precise' : 'approximate',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          })
        }, () => undefined, { enableHighAccuracy: false, maximumAge: 15 * 60_000, timeout: 4_000 })
      }).catch(() => undefined)
    }

    return () => {
      active = false
      activityEvents.forEach((name) => window.removeEventListener(name, markActivity))
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('devicemotion', onMotion)
      window.clearInterval(stillnessTimer)
      motionSamples.current = []
      cancelTimes.current = []
    }
  }, [authority.ownerId, authority.location, authority.workforce, authority.revision, user])

  return null
}
