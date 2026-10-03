'use client'

import { useEffect, useRef, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions, getFirebaseDb } from '@/lib/firebase/client'

type RuntimeAuthority = {
  workforce: boolean
  location: boolean
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
  const [authority, setAuthority] = useState<RuntimeAuthority>({ workforce: false, location: false })
  const lastSent = useRef<Record<string, number>>({})
  const lastActivityAt = useRef(Date.now())
  const cancelTimes = useRef<number[]>([])
  const motionSamples = useRef<number[]>([])

  useEffect(() => {
    if (!firebasePublicEnvReady) return
    return onAuthStateChanged(getAuth(app), setUser)
  }, [])

  useEffect(() => {
    if (!user) {
      setAuthority({ workforce: false, location: false })
      return
    }

    const workforceRef = doc(getFirebaseDb(), 'users', user.uid, 'privacyRuntime', 'workforce-actions')
    const locationRef = doc(getFirebaseDb(), 'users', user.uid, 'privacyRuntime', 'location-collection')
    let workforce = false
    let location = false
    const publish = () => setAuthority({ workforce, location })
    const offWorkforce = onSnapshot(workforceRef, (snapshot) => {
      workforce = snapshot.exists() && snapshot.get('enabled') === true && snapshot.get('automationEnabled') === true
      publish()
    }, () => { workforce = false; publish() })
    const offLocation = onSnapshot(locationRef, (snapshot) => {
      location = snapshot.exists() && snapshot.get('enabled') === true
      publish()
    }, () => { location = false; publish() })
    return () => { offWorkforce(); offLocation() }
  }, [user])

  useEffect(() => {
    if (!user || !authority.workforce) return

    const record = async (type: string, payload: Record<string, unknown>, force = false) => {
      const now = Date.now()
      if (!force && now - (lastSent.current[type] ?? 0) < SIGNAL_COOLDOWN_MS) return
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
        if (permission.state !== 'granted') return
        navigator.geolocation.getCurrentPosition((position) => {
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
      activityEvents.forEach((name) => window.removeEventListener(name, markActivity))
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('devicemotion', onMotion)
      window.clearInterval(stillnessTimer)
      motionSamples.current = []
      cancelTimes.current = []
    }
  }, [authority.location, authority.workforce, user])

  return null
}
