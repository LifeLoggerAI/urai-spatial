'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
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
  const auth = firebasePublicEnvReady ? getAuth(app) : null
  const [selection, setSelection] = useState<{
    memoryId: string | null
    demo: boolean
    user: User | null
    authority: ReplayLifeModelAuthority
  }>({ memoryId: null, demo: false, user: null, authority: unavailable })

  useEffect(() => {
    const publish = (user: User | null, authority: ReplayLifeModelAuthority) => setSelection({ memoryId, demo, user, authority })
    if (!memoryId || demo || !auth) {
      publish(null, unavailable)
      return
    }
    let cancelled = false
    let generation = 0
    const stop = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      const version = ++generation
      const current = () => !cancelled && generation === version && auth.currentUser === user
      if (!current()) return
      if (!user) {
        publish(null, { status: 'unavailable', available: false, reason: 'AUTH_REQUIRED' })
        return
      }
      publish(user, loading)
      const callable = httpsCallable<{ memoryId: string }, ReplayLifeModelLookupResponse>(
        functions,
        'getReplayLifeModelAuthority',
      )
      void callable({ memoryId }).then((result) => {
        if (!current()) return
        const data = result.data
        if (
          data.available === true
          && data.schemaVersion === 'urai-life-model-v1'
          && data.syntheticOutputMayBecomeHistoricalSource === false
          && Array.isArray(data.personModelBundleIds)
          && Array.isArray(data.people)
          && typeof data.sceneTruthPacketId === 'string'
        ) {
          publish(user, { ...data, status: 'available' } as ReplayLifeModelAuthority)
          return
        }
        publish(user, { status: 'unavailable', available: false, reason: 'reason' in data ? String(data.reason ?? '') : 'LIFE_MODEL_UNAVAILABLE' })
      }).catch(() => {
        if (current()) {
          publish(user, { status: 'unavailable', available: false, reason: 'LIFE_MODEL_LOOKUP_FAILED' })
        }
      })
    })
    return () => { cancelled = true; generation += 1; stop() }
  }, [auth, demo, memoryId])

  // Query and auth commits can precede replacement effects. Never expose an
  // earlier selection or same-UID session's authority during that render.
  if (!memoryId || demo || !auth) return unavailable
  if (!auth.currentUser) return { status: 'unavailable', available: false, reason: 'AUTH_REQUIRED' }
  if (selection.memoryId !== memoryId || selection.demo !== demo || selection.user !== auth.currentUser) return loading
  return selection.authority
}
