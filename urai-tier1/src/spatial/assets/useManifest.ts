'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebaseDb } from '../../lib/firebase/client'
import { SpatialAssetManifest, isSpatialAssetManifest } from './manifestTypes'

export interface UseManifestState {
  manifest: SpatialAssetManifest | null
  loading: boolean
  error: string | null
}

export function useManifest(manifestId: string | null): UseManifestState {
  const [manifest, setManifest] = useState<SpatialAssetManifest | null>(null)
  const [loading, setLoading] = useState(Boolean(manifestId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!manifestId) {
      setManifest(null)
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
          setManifest(null)
          setError(`Manifest not found: ${manifestId}`)
          setLoading(false)
          return
        }

        const data = { ...snapshot.data(), manifestId: snapshot.id }
        if (!isSpatialAssetManifest(data)) {
          setManifest(null)
          setError(`Invalid spatial manifest: ${manifestId}`)
          setLoading(false)
          return
        }

        setManifest(data)
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [manifestId])

  return { manifest, loading, error }
}
