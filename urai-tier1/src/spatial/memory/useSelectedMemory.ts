'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  buildNamedExplicitDemoMemory,
  explicitDemoModeEnabled,
  isKnownExplicitDemoMemoryId,
} from './explicitDemoMemory'
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

export function useSelectedMemory(): SelectedMemoryResult {
  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams()
    return new URLSearchParams(window.location.search)
  }, [])
  const rawMemoryId = params.get('memoryId') ?? params.get('node')
  const memoryId = sanitizeMemoryId(rawMemoryId)
  const manifestId = sanitizeMemoryId(params.get('manifestId'))
  const [result, setResult] = useState<SelectedMemoryResult>(LOADING)

  useEffect(() => {
    let cancelled = false

    if (rawMemoryId && !memoryId) {
      setResult({ status: 'corrupt', memory: null, message: 'This memory link is not valid. Return to the Life Map and choose the memory again.' })
      return () => { cancelled = true }
    }

    if (!memoryId) {
      setResult(unavailable('No memory was selected. Return to the Life Map or open the disclosed demonstration chamber.'))
      return () => { cancelled = true }
    }

    const explicitDemo = isExplicitDemoRequest(params)
      || (explicitDemoModeEnabled() && isKnownExplicitDemoMemoryId(memoryId))

    if (explicitDemo) {
      const memory = buildNamedExplicitDemoMemory(memoryId)
      if (manifestId && memory.replayManifest.id !== manifestId) {
        setResult({ status: 'corrupt', memory: null, message: 'This Replay link belongs to a different demonstration memory. Return to the Life Map and choose the memory again.' })
        return () => { cancelled = true }
      }
      setResult({ status: 'demo', memory, message: 'Explicit demonstration memory ready.' })
      return () => { cancelled = true }
    }

    if (!firebasePublicEnvReady) {
      setResult(unavailable('The private memory service is temporarily unavailable. Your memory has not been replaced or exposed.'))
      return () => { cancelled = true }
    }

    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return
      if (!user) {
        setResult({ status: 'unauthorized', memory: null, message: 'This is a private memory chamber. Sign in through URAI, then open the memory again from your Life Map.' })
        return
      }

      setResult(LOADING)
      try {
        const snapshot = await getDoc(doc(getFirebaseDb(), 'users', user.uid, 'memories', memoryId))
        if (cancelled) return
        if (!snapshot.exists()) {
          setResult(unavailable('That memory is no longer available to open. It may have been removed, moved, or never belonged to this account.'))
          return
        }

        const parsed = parseSelectedMemory(snapshot.data(), user.uid, memoryId)
        if (parsed.memory && manifestId && parsed.memory.replayManifest.id !== manifestId) {
          setResult({ status: 'corrupt', memory: null, message: 'This Replay link does not match the selected memory. Return to the Life Map and choose the memory again.' })
          return
        }
        setResult(parsed)
      } catch {
        if (cancelled) return
        setResult(unavailable(
          typeof navigator !== 'undefined' && !navigator.onLine
            ? 'You appear to be offline. The private chamber will remain closed until the connection returns.'
            : 'The private memory could not be opened safely. Nothing was changed; try again or return to the Life Map.',
        ))
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [manifestId, memoryId, params, rawMemoryId])

  return result
}
