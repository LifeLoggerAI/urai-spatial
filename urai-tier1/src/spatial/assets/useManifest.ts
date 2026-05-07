'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebaseDb } from '../../lib/firebase/client'
import { DEMO_SPATIAL_MANIFESTS, createDemoSpatialManifest } from '../demo/demoMemoryStars'
import { SpatialAssetManifest, isSpatialAssetManifest } from './manifestTypes'

export interface UseManifestState {
  manifest: SpatialAssetManifest | null
  loading: boolean
  error: string | null
}

function allowDemoFallback() {
  return process.env.NEXT_PUBLIC_URAI_DISABLE_DEMO_FALLBACK !== 'true'
}

export function getDemoSpatialManifest(manifestId: string | null | undefined): SpatialAssetManifest {
  if (manifestId && DEMO_SPATIAL_MANIFESTS[manifestId]) return DEMO_SPATIAL_MANIFESTS[manifestId]
  return createDemoSpatialManifest(manifestId)
}

export function useManifest(manifestId: string | null): UseManifestState {
  const [manifest, setManifest] = useState<SpatialAssetManifest | null>(() => (manifestId && allowDemoFallback() && DEMO_SPATIAL_MANIFESTS[manifestId] ? DEMO_SPATIAL_MANIFESTS[manifestId] : null))
  const [loading, setLoading] = useState(Boolean(manifestId && !DEMO_SPATIAL_MANIFESTS[manifestId]))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!manifestId) {
      setManifest(null)
      setLoading(false)
      setError(null)
      return
    }

    if (allowDemoFallback() && DEMO_SPATIAL_MANIFESTS[manifestId]) {
      setManifest(DEMO_SPATIAL_MANIFESTS[manifestId])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const ref = doc(getFirebaseDb(), 'assetManifests', manifestId)
    return onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          const fallback = allowDemoFallback() ? getDemoSpatialManifest(manifestId) : null
          setManifest(fallback)
          setError(fallback ? null : `Manifest not found: ${manifestId}`)
          setLoading(false)
          return
        }

        const data = { ...snapshot.data(), manifestId: snapshot.id }
        if (!isSpatialAssetManifest(data)) {
          const fallback = allowDemoFallback() ? getDemoSpatialManifest(manifestId) : null
          setManifest(fallback)
          setError(fallback ? null : `Invalid spatial manifest: ${manifestId}`)
          setLoading(false)
          return
        }

        setManifest(data)
        setLoading(false)
      },
      (err) => {
        const fallback = allowDemoFallback() ? getDemoSpatialManifest(manifestId) : null
        setManifest(fallback)
        setError(fallback ? null : err.message)
        setLoading(false)
      },
    )
  }, [manifestId])

  return { manifest, loading, error }
}
