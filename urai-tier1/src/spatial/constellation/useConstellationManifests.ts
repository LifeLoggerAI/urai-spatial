'use client'

import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getFirebaseDb } from '../../lib/firebase/client'
import { SpatialAssetManifest, isSpatialAssetManifest } from '../assets/manifestTypes'

export const CONSTELLATION_MANIFEST_LIMIT = 18

export function useConstellationManifests(enabled: boolean) {
  const [manifests, setManifests] = useState<SpatialAssetManifest[]>([])

  useEffect(() => {
    if (!enabled) {
      setManifests([])
      return
    }

    const q = query(collection(getFirebaseDb(), 'assetManifests'), orderBy('createdAt', 'desc'), limit(CONSTELLATION_MANIFEST_LIMIT))
    return onSnapshot(q, (snapshot) => {
      setManifests(
        snapshot.docs
          .map((doc) => ({ ...doc.data(), manifestId: doc.id }))
          .filter(isSpatialAssetManifest)
          .slice(0, CONSTELLATION_MANIFEST_LIMIT),
      )
    })
  }, [enabled])

  return manifests
}
