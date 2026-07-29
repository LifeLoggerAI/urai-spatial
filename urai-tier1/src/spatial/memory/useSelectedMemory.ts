'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
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

function demoContinuationMemoryId(params: URLSearchParams, memoryId: string | null) {
  if (!memoryId) return null

  if (params.get('demo') === '1' && params.get('from') === 'life-map') {
    return asDemoMemoryId(memoryId)
  }

  if (params.get('from') !== 'life-map-camera') return null

  const publicDemoEnabled = process.env.NEXT_PUBLIC_URAI_EXPLICIT_DEMO === 'true'
  const localDemoEnabled = typeof window !== 'undefined'
    && window.localStorage.getItem('urai:lifeMapDemoMode') === 'true'

  return publicDemoEnabled || localDemoEnabled ? asDemoMemoryId(memoryId) : null
}

export function useSelectedMemory(): SelectedMemoryResult {
  const params = useMemo(
    () => typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search),
    [],
  )
  const memoryId = sanitizeMemoryId(params.get('memoryId') ?? params.get('node'))
  const manifestId = sanitizeMemoryId(params.get('manifestId'))
  const continuedDemoMemoryId = demoContinuationMemoryId(params, memoryId)
  const requestedDemoMemoryId = isExplicitDemoRequest(params)
    ? asDemoMemoryId(memoryId)
    : continuedDemoMemoryId
  const [result, setResult] = useState<SelectedMemoryResult>(LOADING)

  useEffect(() => {
    let cancelled = false

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
  }, [continuedDemoMemoryId, manifestId, memoryId, params, requestedDemoMemoryId])

  return result
}
