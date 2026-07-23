'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  buildHomePersonalizedScene,
  type HomeEvidenceRef,
  type HomePersonalizedScene,
  type HomeSceneMode,
  type HomeSignalKind,
} from './homePersonalizationModel'

const knownKinds = new Set<HomeSignalKind>([
  'memory', 'relationship', 'emotional-weather', 'recovery', 'stress', 'cognitive-load',
  'time-of-day', 'season', 'location-routine', 'permission-state',
])

const reviewModes = new Set<HomeSceneMode>(['private-personalized', 'world-forming', 'permission-limited', 'unavailable', 'offline', 'explicit-sample'])

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

function parseRequestedMode(): { mode: HomeSceneMode | 'auto'; safePrivate: boolean } {
  if (typeof window === 'undefined') return { mode: 'auto', safePrivate: false }
  const params = new URLSearchParams(window.location.search)
  if (params.get('homeSample') === '1' || params.get('demo') === '1') return { mode: 'explicit-sample', safePrivate: false }
  if (params.get('homePrivateFixture') === '1') return { mode: 'private-personalized', safePrivate: true }
  const fixture = params.get('homeState') as HomeSceneMode | null
  return fixture && reviewModes.has(fixture) ? { mode: fixture, safePrivate: fixture === 'private-personalized' } : { mode: 'auto', safePrivate: false }
}

export function useHomePersonalizedScene(): { scene: HomePersonalizedScene; loading: boolean } {
  const requested = useMemo(parseRequestedMode, [])
  const requestedMode = requested.mode
  const isolatedReviewMode = requestedMode !== 'auto'
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const [signedIn, setSignedIn] = useState(false)
  const [permissionsAvailable, setPermissionsAvailable] = useState(true)
  const [dataAvailable, setDataAvailable] = useState(true)
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
    if (isolatedReviewMode) {
      setSignedIn(false)
      setEvidence([])
      setDataAvailable(requestedMode !== 'unavailable')
      setLoading(false)
      return
    }
    if (!firebasePublicEnvReady) {
      setSignedIn(false)
      setEvidence([])
      setDataAvailable(false)
      setLoading(false)
      return
    }

    let cancelled = false
    const unsubscribe = onAuthStateChanged(getAuth(app), async (user) => {
      if (cancelled) return
      setSignedIn(Boolean(user))
      if (!user) {
        setEvidence([])
        setDataAvailable(true)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const snapshot = await getDocs(query(collection(getFirebaseDb(), 'users', user.uid, 'memories'), limit(12)))
        if (!cancelled) {
          setEvidence(snapshot.docs.map((item) => evidenceFromDocument(item.id, item.data() as Record<string, unknown>)))
          setDataAvailable(true)
        }
      } catch {
        if (!cancelled) {
          setEvidence([])
          setDataAvailable(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [isolatedReviewMode, requestedMode])

  const scene = useMemo(() => buildHomePersonalizedScene({
    requestedMode: requestedMode === 'auto' && !online ? 'offline' : requestedMode,
    signedIn,
    online,
    permissionsAvailable,
    dataAvailable,
    reviewFixture: requested.safePrivate ? 'safe-private' : null,
    evidence,
    now: new Date(),
  }), [dataAvailable, evidence, online, permissionsAvailable, requested.safePrivate, requestedMode, signedIn])

  return { scene, loading }
}
