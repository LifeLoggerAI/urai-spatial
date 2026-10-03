'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions } from '@/lib/firebase/client'
import { capturedRealityDeviceTier } from '@/spatial/captured-reality/capturedRealityRuntime'
import { createCapturedRealityRequestAuthority } from '@/spatial/captured-reality/capturedRealityDelivery'

type ReplayEntryResponse = {
  available: boolean
  assetId?: string
  truthLabel?: string
  autobiographical?: false
}

export type InterpretiveWorldReplayEntry = {
  assetId: string
  href: string
  truthLabel: string
  autobiographical: false
}

const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/

export function useInterpretiveWorldReplayEntry(memoryId: string | null) {
  const [entry, setEntry] = useState<InterpretiveWorldReplayEntry | null>(null)

  useEffect(() => {
    setEntry(null)
    if (!memoryId || !firebasePublicEnvReady) return

    let cancelled = false
    const authority = createCapturedRealityRequestAuthority()
    const auth = getAuth(app)
    const stop = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      const currentRequest = authority.begin()
      setEntry(null)
      if (!user) return

      const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
      const callable = httpsCallable<{ memoryId: string; deviceTier: 'desktop' | 'mobile' }, ReplayEntryResponse>(
        functions,
        'getInterpretiveWorldReplayEntry',
      )

      void callable({ memoryId, deviceTier }).then((result) => {
        if (cancelled || !currentRequest() || auth.currentUser?.uid !== user.uid) return
        const data = result.data
        if (!data.available || !data.assetId || !SAFE_ASSET_ID.test(data.assetId) || data.autobiographical !== false) return
        setEntry({
          assetId: data.assetId,
          href: `/spatial/interpretive-world?assetId=${encodeURIComponent(data.assetId)}`,
          truthLabel: data.truthLabel ?? 'Interpretive generated world — not camera-recorded history.',
          autobiographical: false,
        })
      }).catch(() => {
        if (!cancelled && currentRequest() && auth.currentUser?.uid === user.uid) setEntry(null)
      })
    })

    return () => {
      cancelled = true
      authority.invalidate()
      stop()
    }
  }, [memoryId])

  return entry
}
