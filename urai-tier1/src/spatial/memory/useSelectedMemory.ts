'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { doc, onSnapshot } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import { buildNamedExplicitDemoMemory } from './explicitDemoMemory'
import { memoryConsentAdmission, type MemoryConsentAdmission } from './memoryConsentAdmission'
import {
  isExplicitDemoRequest,
  parseSelectedMemory,
  sanitizeMemoryId,
  type SelectedMemoryResult,
} from './selectedMemoryContract'

const LOADING: SelectedMemoryResult = {
  status: 'loading',
  memory: null,
  message: 'Opening selected memory…',
}

function unavailable(message: string): SelectedMemoryResult {
  return { status: 'unavailable', memory: null, message }
}

function asDemoMemoryId(memoryId: string | null) {
  if (!memoryId) return null
  return memoryId.startsWith('demo:') ? memoryId : `demo:${memoryId}`
}

export function useSelectedMemory(): SelectedMemoryResult {
  const search = useSearchParams().toString()
  const params = useMemo(
    () => new URLSearchParams(search),
    [search],
  )
  const memoryId = sanitizeMemoryId(params.get('memoryId') ?? params.get('node'))
  const manifestId = sanitizeMemoryId(params.get('manifestId'))
  const requestedDemoMemoryId = isExplicitDemoRequest(params)
    ? asDemoMemoryId(memoryId)
    : null
  const selectionKey = JSON.stringify([memoryId, manifestId, requestedDemoMemoryId])
  const [selection, setSelection] = useState<{ key: string; result: SelectedMemoryResult }>({ key: '', result: LOADING })

  useEffect(() => {
    const setResult = (result: SelectedMemoryResult) => setSelection({ key: selectionKey, result })
    let cancelled = false
    let generation = 0
    let unsubscribeMemory: (() => void) | undefined
    let unsubscribePolicy: (() => void) | undefined

    // Invalidate callbacks before detaching their source. A queued Firestore
    // callback must never restore a previous account or revoked memory.
    const detachMemory = () => {
      generation += 1
      unsubscribeMemory?.()
      unsubscribePolicy?.()
      unsubscribeMemory = undefined
      unsubscribePolicy = undefined
    }

    if (!memoryId) {
      setResult(unavailable('No selected memory was provided.'))
      return () => { cancelled = true }
    }

    if (requestedDemoMemoryId) {
      const memory = buildNamedExplicitDemoMemory(requestedDemoMemoryId)
      if (manifestId && memory.replayManifest.id !== manifestId) {
        setResult({ status: 'corrupt', memory: null, message: 'The requested replay manifest does not match this demonstration memory.' })
        return () => { cancelled = true }
      }
      setResult({ status: 'demo', memory, message: 'Explicit demonstration memory ready.' })
      return () => { cancelled = true }
    }

    if (!firebasePublicEnvReady) {
      setResult(unavailable('Selected memory is temporarily unavailable.'))
      return () => { cancelled = true }
    }

    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      detachMemory()
      const activeGeneration = generation
      const isCurrent = () => !cancelled && generation === activeGeneration
      if (!user) {
        setResult({ status: 'unauthorized', memory: null, message: 'Sign in to open this private memory.' })
        return
      }

      setResult(LOADING)
      let policyAdmission: MemoryConsentAdmission = 'pending'
      let latestMemory: SelectedMemoryResult | null = null
      const publish = () => {
        if (!isCurrent()) return
        if (policyAdmission === 'denied') {
          setResult({ status: 'unauthorized', memory: null, message: 'Memory-domain consent is unavailable or revoked.' })
        } else if (policyAdmission === 'allowed' && latestMemory) {
          setResult(latestMemory)
        } else {
          setResult(LOADING)
        }
      }
      let memoryGeneration = 0
      const stopMemory = () => {
        memoryGeneration += 1
        unsubscribeMemory?.()
        unsubscribeMemory = undefined
        latestMemory = null
      }
      const startMemory = () => {
        if (!isCurrent() || policyAdmission !== 'allowed' || unsubscribeMemory) return
        const activeMemoryGeneration = ++memoryGeneration
        unsubscribeMemory = onSnapshot(
          doc(getFirebaseDb(), 'users', user.uid, 'memories', memoryId),
          (snapshot) => {
            if (!isCurrent() || memoryGeneration !== activeMemoryGeneration || policyAdmission !== 'allowed') return
            if (!snapshot.exists()) {
              latestMemory = unavailable('Selected memory could not be found.')
              publish()
              return
            }
            const parsed = parseSelectedMemory(snapshot.data(), user.uid, memoryId, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
            if (parsed.memory && manifestId && parsed.memory.replayManifest.id !== manifestId) {
              latestMemory = { status: 'corrupt', memory: null, message: 'The requested replay manifest does not match this memory.' }
              publish()
              return
            }
            latestMemory = parsed
            publish()
          },
          () => {
            if (!isCurrent() || memoryGeneration !== activeMemoryGeneration) return
            latestMemory = unavailable('Selected memory could not be loaded.')
            publish()
          },
        )
      }
      try {
        // Policy is authoritative for private Focus, Replay, Mirror and Memory World.
        // A revoked policy detaches the private source and discards the old frame;
        // restoration must obtain a *new* memory snapshot before showing data.
        unsubscribePolicy = onSnapshot(
          doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current'),
          (snapshot) => {
            if (!isCurrent()) return
            const next = memoryConsentAdmission(
              snapshot.exists(),
              snapshot.exists() ? snapshot.data() : null,
              user.uid,
            )
            if (next !== 'allowed') stopMemory()
            policyAdmission = next
            if (next === 'allowed') startMemory()
            publish()
          },
          () => {
            if (!isCurrent()) return
            stopMemory()
            policyAdmission = 'denied'
            publish()
          },
        )
      } catch {
        if (!isCurrent()) return
        stopMemory()
        policyAdmission = 'denied'
        publish()
      }
    })

    return () => {
      cancelled = true
      detachMemory()
      unsubscribe()
    }
  }, [manifestId, memoryId, requestedDemoMemoryId, selectionKey])

  // Query navigation can reuse the mounted client. Never render the previous
  // selection during the frame before its subscription effect is replaced.
  return selection.key === selectionKey ? selection.result : LOADING
}
