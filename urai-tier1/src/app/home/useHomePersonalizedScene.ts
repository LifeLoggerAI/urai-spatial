'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  buildHomePersonalizedScene,
  type HomeEvidenceRef,
  type HomePersonalizedScene,
  type HomeSignalKind,
} from './homePersonalizationModel'

const knownKinds = new Set<HomeSignalKind>([
  'memory', 'relationship', 'emotional-weather', 'recovery', 'stress', 'cognitive-load',
  'time-of-day', 'season', 'location-routine', 'permission-state',
])

function safeDate(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return Number.isNaN(Date.parse(value)) ? undefined : new Date(value).toISOString()
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    try { return value.toDate().toISOString() } catch { return undefined }
  }
  return undefined
}

function evidenceFromDocument(id: string, data: Record<string, unknown>): HomeEvidenceRef {
  const requestedKind = typeof data.kind === 'string' ? data.kind : typeof data.type === 'string' ? data.type : 'memory'
  const kind = knownKinds.has(requestedKind as HomeSignalKind) ? requestedKind as HomeSignalKind : 'memory'
  return {
    id,
    kind,
    occurredAt: safeDate(data.occurredAt ?? data.createdAt ?? data.timestamp),
    sourceLabel: kind === 'relationship' ? 'a permitted relationship signal' : 'a permitted private memory signal',
    permission: 'your private Home and Memory permission',
  }
}

export function useHomePersonalizedScene(): { scene: HomePersonalizedScene; loading: boolean } {
  const explicitSample = useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('homeSample') === '1' || params.get('demo') === '1'
  }, [])
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const [signedIn, setSignedIn] = useState(false)
  const [permissionsAvailable, setPermissionsAvailable] = useState(true)
  const [evidence, setEvidence] = useState<readonly HomeEvidenceRef[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    setPermissionsAvailable(window.localStorage.getItem('urai:homePermissionsAvailable') !== 'false')
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    if (explicitSample) {
      setSignedIn(false)
      setEvidence([])
      setLoading(false)
      return
    }
    if (!firebasePublicEnvReady) {
      setSignedIn(false)
      setEvidence([])
      setLoading(false)
      return
    }

    let cancelled = false
    const unsubscribe = onAuthStateChanged(getAuth(app), async (user) => {
      if (cancelled) return
      setSignedIn(Boolean(user))
      if (!user) {
        setEvidence([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const snapshot = await getDocs(query(collection(getFirebaseDb(), 'users', user.uid, 'memories'), limit(12)))
        if (!cancelled) setEvidence(snapshot.docs.map((item) => evidenceFromDocument(item.id, item.data() as Record<string, unknown>)))
      } catch {
        if (!cancelled) setEvidence([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [explicitSample])

  const scene = useMemo(() => buildHomePersonalizedScene({
    requestedMode: explicitSample ? 'explicit-sample' : online ? 'auto' : 'offline',
    signedIn,
    online,
    permissionsAvailable,
    evidence,
    now: new Date(),
  }), [evidence, explicitSample, online, permissionsAvailable, signedIn])

  return { scene, loading }
}
