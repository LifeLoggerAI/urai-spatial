'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getFirebaseDb } from '../../lib/firebase/client'
import { SpatialAssetManifest, isSpatialAssetManifest } from '../assets/manifestTypes'

export const CONSTELLATION_MANIFEST_LIMIT = 18
export const LAUNCH_DEMO_OWNER_ID = 'launch-demo'

const SEED_MANIFESTS: SpatialAssetManifest[] = [
  {
    manifestId: 'seed-memory-bloom',
    manifestVersion: '1.0',
    jobId: 'seed-memory-bloom',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'memory image',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'soft memory bloom in the life map',
    spatialCompatibility: { supported: true, type: 'image_overlay' },
  },
  {
    manifestId: 'seed-recovery-arc',
    manifestVersion: '1.0',
    jobId: 'seed-recovery-arc',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'recovery motion',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'recovery arc returning to calm',
    spatialCompatibility: { supported: true, type: 'video_panel' },
  },
  {
    manifestId: 'seed-threshold-storm',
    manifestVersion: '1.0',
    jobId: 'seed-threshold-storm',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'threshold skybox',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'storm threshold becoming visible',
    spatialCompatibility: { supported: true, type: 'skybox' },
  },
  {
    manifestId: 'seed-mirror-focus',
    manifestVersion: '1.0',
    jobId: 'seed-mirror-focus',
    ownerId: LAUNCH_DEMO_OWNER_ID,
    projectId: 'urai-spatial',
    assetType: 'mirror model',
    artifacts: [],
    provider: 'seed',
    model: 'launch-fallback',
    promptPreview: 'spatial mirror for focused attention',
    spatialCompatibility: { supported: true, type: 'model3d' },
  },
]

function liveManifestFirestoreEnabled() {
  return process.env.NEXT_PUBLIC_URAI_MANIFEST_FIRESTORE === 'true'
}

function scopedManifestOwnerId() {
  return process.env.NEXT_PUBLIC_URAI_MANIFEST_OWNER_ID || LAUNCH_DEMO_OWNER_ID
}

function uniqueByManifestId(manifests: SpatialAssetManifest[]) {
  const seen = new Set<string>()
  return manifests.filter((manifest) => {
    if (seen.has(manifest.manifestId)) return false
    seen.add(manifest.manifestId)
    return true
  })
}

export function useConstellationManifests(enabled: boolean) {
  const [manifests, setManifests] = useState<SpatialAssetManifest[]>([])
  const ownerId = useMemo(scopedManifestOwnerId, [])

  useEffect(() => {
    if (!enabled) {
      setManifests([])
      return
    }

    if (!liveManifestFirestoreEnabled()) {
      setManifests(SEED_MANIFESTS)
      return
    }

    try {
      const q = query(
        collection(getFirebaseDb(), 'assetManifests'),
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
        limit(CONSTELLATION_MANIFEST_LIMIT),
      )

      return onSnapshot(
        q,
        (snapshot) => {
          const remoteManifests = snapshot.docs
            .map((doc) => ({ ...doc.data(), manifestId: doc.id }))
            .filter(isSpatialAssetManifest)
            .slice(0, CONSTELLATION_MANIFEST_LIMIT)

          setManifests(uniqueByManifestId(remoteManifests.length ? remoteManifests : SEED_MANIFESTS))
        },
        (error) => {
          console.warn('[URAI] Scoped asset manifest listener unavailable; using launch fallback.', error)
          setManifests(SEED_MANIFESTS)
        },
      )
    } catch (error) {
      console.warn('[URAI] Scoped asset manifest listener failed to start; using launch fallback.', error)
      setManifests(SEED_MANIFESTS)
    }
  }, [enabled, ownerId])

  return manifests
}
