'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions } from '@/lib/firebase/client'
import { capturedRealityDeviceTier } from './capturedRealityRuntime'
import { createCapturedRealityRequestAuthority } from './capturedRealityDelivery'
import { capturedRealityJourneyEntryHref } from './capturedRealityJourney'

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

export type CapturedRealityReplayLookup = {
  status: 'loading' | 'available' | 'unavailable'
  entry: CapturedRealityReplayEntry | null
}

const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/
const unavailable: CapturedRealityReplayLookup = { status: 'unavailable', entry: null }
const loading: CapturedRealityReplayLookup = { status: 'loading', entry: null }

export function useCapturedRealityReplayLookup(memoryId: string | null): CapturedRealityReplayLookup {
  const [lookup, setLookup] = useState<CapturedRealityReplayLookup>(memoryId && firebasePublicEnvReady ? loading : unavailable)

  useEffect(() => {
    setLookup(memoryId && firebasePublicEnvReady ? loading : unavailable)
    if (!memoryId || !firebasePublicEnvReady) return

    let cancelled = false
    const authority = createCapturedRealityRequestAuthority()
    const auth = getAuth(app)
    const stop = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      const currentRequest = authority.begin()
      setLookup(loading)
      if (!user) {
        setLookup(unavailable)
        return
      }

      const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
      const callable = httpsCallable<{ memoryId: string; deviceTier: 'desktop' | 'mobile' }, ReplayEntryResponse>(
        functions,
        'getCapturedRealityReplayEntry',
      )

      void callable({ memoryId, deviceTier }).then((result) => {
        if (cancelled || !currentRequest() || auth.currentUser?.uid !== user.uid) return
        const data = result.data
        const href = data.assetId ? capturedRealityJourneyEntryHref(data.assetId, memoryId) : null
        if (!data.available || !data.assetId || !SAFE_ASSET_ID.test(data.assetId) || !href) {
          setLookup(unavailable)
          return
        }
        setLookup({
          status: 'available',
          entry: {
            assetId: data.assetId,
            href,
            truthLabel: data.truthLabel ?? 'Spatial reconstruction from recorded sources',
          },
        })
      }).catch(() => {
        if (!cancelled && currentRequest() && auth.currentUser?.uid === user.uid) setLookup(unavailable)
      })
    })

    return () => {
      cancelled = true
      authority.invalidate()
      stop()
    }
  }, [memoryId])

  return lookup
}

export function useCapturedRealityReplayEntry(memoryId: string | null) {
  return useCapturedRealityReplayLookup(memoryId).entry
}
