'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import { useBrowserLocation } from '@/hooks/useBrowserLocation'
import { buildNamedExplicitDemoMemory } from './explicitDemoMemory'
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
  const location = useBrowserLocation()
  const params = useMemo(
    () => {
      const address = location.split('#')[0]
      return new URLSearchParams(address.includes('?') ? address.slice(address.indexOf('?') + 1) : '')
    },
    [location],
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

    // Invalidate callbacks before detaching their source. A queued Firestore
    // callback must never restore a previous account or revoked memory.
    const detachMemory = () => {
      generation += 1
      unsubscribeMemory?.()
      unsubscribeMemory = undefined
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
      try {
        unsubscribeMemory = onSnapshot(
          doc(getFirebaseDb(), 'users', user.uid, 'memories', memoryId),
          (snapshot) => {
            if (!isCurrent()) return
            if (!snapshot.exists()) {
              setResult(unavailable('Selected memory could not be found.'))
              return
            }
            const parsed = parseSelectedMemory(snapshot.data(), user.uid, memoryId, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
            if (parsed.memory && manifestId && parsed.memory.replayManifest.id !== manifestId) {
              setResult({ status: 'corrupt', memory: null, message: 'The requested replay manifest does not match this memory.' })
              return
            }
            setResult(parsed)
          },
          () => {
            if (!isCurrent()) return
            setResult(unavailable('Selected memory could not be loaded.'))
          },
        )
      } catch {
        if (!isCurrent()) return
        setResult(unavailable('Selected memory could not be loaded.'))
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
