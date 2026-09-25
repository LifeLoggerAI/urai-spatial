'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions } from '@/lib/firebase/client'
import { capturedRealityDeviceTier } from './capturedRealityRuntime'

type ReplayEntryResponse = {
  available: boolean
  assetId?: string
  truthLabel?: string
}

export type CapturedRealityReplayEntry = {
  assetId: string
  href: string
  truthLabel: string
}

const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/

export function useCapturedRealityReplayEntry(memoryId: string | null) {
  const [entry, setEntry] = useState<CapturedRealityReplayEntry | null>(null)

  useEffect(() => {
    setEntry(null)
    if (!memoryId || !firebasePublicEnvReady) return

    let cancelled = false
    const auth = getAuth(app)
    const stop = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      if (!user) {
        setEntry(null)
        return
      }

      const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
      const callable = httpsCallable<{ memoryId: string; deviceTier: 'desktop' | 'mobile' }, ReplayEntryResponse>(
        functions,
        'getCapturedRealityReplayEntry',
      )

      void callable({ memoryId, deviceTier }).then((result) => {
        if (cancelled) return
        const data = result.data
        if (!data.available || !data.assetId || !SAFE_ASSET_ID.test(data.assetId)) {
          setEntry(null)
          return
        }
        setEntry({
          assetId: data.assetId,
          href: `/spatial/captured-reality/${encodeURIComponent(data.assetId)}`,
          truthLabel: data.truthLabel ?? 'Spatial reconstruction from recorded sources',
        })
      }).catch(() => {
        if (!cancelled) setEntry(null)
      })
    })

    return () => {
      cancelled = true
      stop()
    }
  }, [memoryId])

  return entry
}
