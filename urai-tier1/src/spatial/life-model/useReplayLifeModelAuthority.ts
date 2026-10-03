'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions } from '@/lib/firebase/client'

export type ReplayLifeModelAvailable = {
  status: 'available'
  available: true
  schemaVersion: 'urai-life-model-v1'
  sceneTruthPacketId: string
  personModelBundleIds: string[]
  people: Array<{ bundleId:string; personId:string; label:string; asOf:string; knowledgeCutoff:string|null }>
  decision: 'READY' | 'READY_WITH_OCCLUSION' | 'READY_INTERPRETIVE'
  presentationClass: string
  syntheticOutputMayBecomeHistoricalSource: false
}

export type ReplayLifeModelAuthority =
  | { status: 'loading' | 'unavailable'; available: false; reason?: string }
  | ReplayLifeModelAvailable

type ReplayLifeModelLookupResponse =
  | { available:false; reason?:string }
  | Omit<ReplayLifeModelAvailable,'status'>

const unavailable: ReplayLifeModelAuthority = { status: 'unavailable', available: false }
const loading: ReplayLifeModelAuthority = { status: 'loading', available: false }

export function useReplayLifeModelAuthority(memoryId: string | null, demo = false): ReplayLifeModelAuthority {
  const [authority, setAuthority] = useState<ReplayLifeModelAuthority>(memoryId && !demo && firebasePublicEnvReady ? loading : unavailable)

  useEffect(() => {
    if (!memoryId || demo || !firebasePublicEnvReady) {
      setAuthority(unavailable)
      return
    }
    let cancelled = false
    const auth = getAuth(app)
    const stop = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      if (!user) {
        setAuthority({ status: 'unavailable', available: false, reason: 'AUTH_REQUIRED' })
        return
      }
      setAuthority(loading)
      const callable = httpsCallable<{ memoryId: string }, ReplayLifeModelLookupResponse>(
        functions,
        'getReplayLifeModelAuthority',
      )
      void callable({ memoryId }).then((result) => {
        if (cancelled || auth.currentUser?.uid !== user.uid) return
        const data = result.data
        if (
          data.available === true
          && data.schemaVersion === 'urai-life-model-v1'
          && data.syntheticOutputMayBecomeHistoricalSource === false
          && Array.isArray(data.personModelBundleIds)
          && Array.isArray(data.people)
          && typeof data.sceneTruthPacketId === 'string'
        ) {
          setAuthority({ ...data, status: 'available' } as ReplayLifeModelAuthority)
          return
        }
        setAuthority({ status: 'unavailable', available: false, reason: 'reason' in data ? String(data.reason ?? '') : 'LIFE_MODEL_UNAVAILABLE' })
      }).catch(() => {
        if (!cancelled && auth.currentUser?.uid === user.uid) {
          setAuthority({ status: 'unavailable', available: false, reason: 'LIFE_MODEL_LOOKUP_FAILED' })
        }
      })
    })
    return () => { cancelled = true; stop() }
  }, [demo, memoryId])

  return authority
}
