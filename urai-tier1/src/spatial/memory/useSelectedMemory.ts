'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  buildExplicitDemoMemory,
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

export function useSelectedMemory(): SelectedMemoryResult {
  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams()
    return new URLSearchParams(window.location.search)
  }, [])
  const memoryId = sanitizeMemoryId(params.get('memoryId') ?? params.get('node'))
  const manifestId = sanitizeMemoryId(params.get('manifestId'))
  const [result, setResult] = useState<SelectedMemoryResult>(LOADING)

  useEffect(() => {
    let cancelled = false

    if (!memoryId) {
      setResult(unavailable('No selected memory was provided.'))
      return () => { cancelled = true }
    }

    if (isExplicitDemoRequest(params)) {
      setResult({ status: 'demo', memory: buildExplicitDemoMemory(memoryId), message: 'Explicit demonstration memory ready.' })
      return () => { cancelled = true }
    }

    if (!firebasePublicEnvReady) {
      setResult(unavailable('Selected memory is temporarily unavailable.'))
      return () => { cancelled = true }
    }

    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return
      if (!user) {
        setResult({ status: 'unauthorized', memory: null, message: 'Sign in to open this private memory.' })
        return
      }

      setResult(LOADING)
      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid, 'memories', memoryId))
        if (cancelled) return
        if (!snapshot.exists()) {
          setResult(unavailable('Selected memory could not be found.'))
          return
        }

        const parsed = parseSelectedMemory(snapshot.data(), user.uid, memoryId)
        if (parsed.memory && manifestId && parsed.memory.replayManifest.id !== manifestId) {
          setResult({ status: 'corrupt', memory: null, message: 'The requested replay manifest does not match this memory.' })
          return
        }
        setResult(parsed)
      } catch (error) {
        if (cancelled) return
        setResult(unavailable(error instanceof Error ? error.message : 'Selected memory could not be loaded.'))
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [manifestId, memoryId, params])

  return result
}
