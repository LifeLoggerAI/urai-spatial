'use client'

import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getFirebaseDb } from '../../lib/firebase/client'
import { SpatialAssetManifest, isSpatialAssetManifest } from '../assets/manifestTypes'

export function useConstellationManifests(enabled: boolean) {
  const [manifests, setManifests] = useState<SpatialAssetManifest[]>([])

  useEffect(() => {
    if (!enabled) {
      setManifests([])
      return
    }

    const q = query(collection(getFirebaseDb(), 'assetManifests'), orderBy('createdAt', 'desc'), limit(24))
    return onSnapshot(q, (snapshot) => {
      setManifests(
        snapshot.docs
          .map((doc) => ({ ...doc.data(), manifestId: doc.id }))
          .filter(isSpatialAssetManifest),
      )
    })
  }, [enabled])

  return manifests
}
