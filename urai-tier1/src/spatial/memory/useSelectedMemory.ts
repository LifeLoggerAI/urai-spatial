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

function demoContinuationMemoryId(params: URLSearchParams, memoryId: string | null) {
  if (!memoryId || memoryId.startsWith('demo:')) return null

  if (params.get('demo') === '1' && params.get('from') === 'life-map') {
    return `demo:${memoryId}`
  }

  if (params.get('from') !== 'life-map-camera') return null

  const publicDemoEnabled = process.env.NEXT_PUBLIC_URAI_EXPLICIT_DEMO === 'true'
  const localDemoEnabled = typeof window !== 'undefined'
    && window.localStorage.getItem('urai:lifeMapDemoMode') === 'true'

  return publicDemoEnabled || localDemoEnabled ? `demo:${memoryId}` : null
}

function canonicalizeDemoContinuation(params: URLSearchParams, demoMemoryId: string) {
  const next = new URLSearchParams(params)
  next.set('memoryId', demoMemoryId)
  next.set('demo', '1')
  if (!next.get('node')) next.set('node', demoMemoryId.replace(/^demo:/, ''))
  return next
}

type InitialSelectedMemoryState = {
  params: URLSearchParams
  canonicalHref: string | null
}

function initialSelectedMemoryState(): InitialSelectedMemoryState {
  if (typeof window === 'undefined') return { params: new URLSearchParams(), canonicalHref: null }

  const initial = new URLSearchParams(window.location.search)
  const initialMemoryId = sanitizeMemoryId(initial.get('memoryId') ?? initial.get('node'))
  const continuedDemoMemoryId = demoContinuationMemoryId(initial, initialMemoryId)

  if (!continuedDemoMemoryId) return { params: initial, canonicalHref: null }

  const params = canonicalizeDemoContinuation(initial, continuedDemoMemoryId)
  const query = params.toString()
  return {
    params,
    canonicalHref: `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
  }
}

export function useSelectedMemory(): SelectedMemoryResult {
  const initialState = useMemo(initialSelectedMemoryState, [])
  const params = initialState.params
  const memoryId = sanitizeMemoryId(params.get('memoryId') ?? params.get('node'))
  const manifestId = sanitizeMemoryId(params.get('manifestId'))
  const continuedDemoMemoryId = demoContinuationMemoryId(params, memoryId)
  const requestedDemoMemoryId = isExplicitDemoRequest(params) ? memoryId : continuedDemoMemoryId
  const [result, setResult] = useState<SelectedMemoryResult>(LOADING)

  useEffect(() => {
    if (!initialState.canonicalHref || typeof window === 'undefined') return
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (currentHref !== initialState.canonicalHref) {
      window.history.replaceState(window.history.state, '', initialState.canonicalHref)
    }
  }, [initialState.canonicalHref])

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
