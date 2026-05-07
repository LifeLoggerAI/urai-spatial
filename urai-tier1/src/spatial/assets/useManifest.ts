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

const DEMO_MANIFESTS: Record<string, SpatialAssetManifest> = {
  'seed-memory-bloom': createDemoManifest('seed-memory-bloom', 'Memory Bloom', 'A soft recovery bloom from a remembered moment.'),
  'seed-recovery-arc': createDemoManifest('seed-recovery-arc', 'Recovery Arc', 'A calm return after pressure, tracked as light.'),
  'seed-threshold-storm': createDemoManifest('seed-threshold-storm', 'Threshold Storm', 'A transition point where the weather changed.'),
  'seed-mirror-focus': createDemoManifest('seed-mirror-focus', 'Mirror Focus', 'A clear reflective moment held in the constellation.'),
  'seed-ritual-echo': createDemoManifest('seed-ritual-echo', 'Ritual Echo', 'A small ritual that left an emotional echo.'),
  'seed-dream-signal': createDemoManifest('seed-dream-signal', 'Dream Signal', 'A symbolic dream trace surfaced as a star.'),
  'seed-calm-return': createDemoManifest('seed-calm-return', 'Calm Return', 'A grounded return to steadiness after noise.'),
  'demo-memory-star': createDemoManifest('demo-memory-star', 'Demo Memory Star', 'A graceful fallback memory star for demo and local preview.'),
}

function createDemoManifest(manifestId: string, assetType: string, promptPreview: string): SpatialAssetManifest {
  return {
    manifestId,
    manifestVersion: '1.0',
    jobId: `demo-${manifestId}`,
    ownerId: 'demo-user',
    projectId: 'urai-spatial-demo',
    assetType,
    provider: 'urai-demo',
    model: 'css-svg-fallback',
    promptPreview,
    artifacts: [],
    spatialCompatibility: {
      supported: true,
      type: 'image_overlay',
      reason: 'Demo fallback manifest generated locally for preview mode.',
    },
  }
}

function allowDemoFallback() {
  return process.env.NEXT_PUBLIC_URAI_DISABLE_DEMO_FALLBACK !== 'true'
}

export function getDemoSpatialManifest(manifestId: string | null | undefined): SpatialAssetManifest {
  if (manifestId && DEMO_MANIFESTS[manifestId]) return DEMO_MANIFESTS[manifestId]
  return createDemoManifest(manifestId || 'demo-memory-star', manifestId || 'Demo Memory Star', 'A graceful fallback memory star for demo and local preview.')
}

export function useManifest(manifestId: string | null): UseManifestState {
  const [manifest, setManifest] = useState<SpatialAssetManifest | null>(() => (manifestId && allowDemoFallback() && DEMO_MANIFESTS[manifestId] ? DEMO_MANIFESTS[manifestId] : null))
  const [loading, setLoading] = useState(Boolean(manifestId && !DEMO_MANIFESTS[manifestId]))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!manifestId) {
      setManifest(null)
      setLoading(false)
      setError(null)
      return
    }

    if (allowDemoFallback() && DEMO_MANIFESTS[manifestId]) {
      setManifest(DEMO_MANIFESTS[manifestId])
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
