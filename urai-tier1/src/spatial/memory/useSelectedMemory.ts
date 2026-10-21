'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { firebasePublicEnvReady, getFirebaseDb, getUraiAuth } from '@/lib/firebase/client'
import { useBrowserLocation } from '@/hooks/useBrowserLocation'
import { isConsentPolicy } from '@/app/privacy-controls/consentModel'
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
  // The Life Map node identifies a constellation event, never private memory authority.
  // Only an explicitly disclosed demo may use the legacy node-only navigation.
  const demoRequested = isExplicitDemoRequest(params)
  const memoryId = sanitizeMemoryId(params.get('memoryId') ?? (demoRequested ? params.get('node') : null))
  const manifestId = sanitizeMemoryId(params.get('manifestId'))
  const requestedDemoMemoryId = demoRequested
    ? asDemoMemoryId(memoryId)
    : null
  const viewingReplay = location.split('?')[0].split('#')[0].replace(/\/+$/, '') === '/replay'
  const selectionKey = JSON.stringify([memoryId, manifestId, requestedDemoMemoryId, viewingReplay])
  const [selection, setSelection] = useState<{ key: string; result: SelectedMemoryResult }>({ key: '', result: LOADING })

  useEffect(() => {
    const setResult = (result: SelectedMemoryResult) => setSelection({ key: selectionKey, result })
    let cancelled = false
    let actorEpoch = 0
    let memoryEpoch = 0
    let unsubscribePolicy: (() => void) | undefined
    let unsubscribeMemory: (() => void) | undefined

    // Every detached source invalidates queued callbacks before unsubscribe.
    // Actor and policy generations are both checked before private content is
    // allowed into React state, including after a prior granted revision.
    const detachMemory = () => {
      memoryEpoch += 1
      const unsubscribe = unsubscribeMemory
      unsubscribeMemory = undefined
      unsubscribe?.()
    }
    const detachActor = () => {
      actorEpoch += 1
      detachMemory()
      const unsubscribe = unsubscribePolicy
      unsubscribePolicy = undefined
      unsubscribe?.()
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

    const auth = getUraiAuth()
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      detachActor()
      const ownerEpoch = actorEpoch
      // An auth callback or Firestore listener may lag a Firebase User-object
      // replacement, including a fresh session under the same UID.
      const isCurrentOwner = () => !cancelled && actorEpoch === ownerEpoch && auth.currentUser === user
      if (!user) {
        setResult({ status: 'unauthorized', memory: null, message: 'Sign in to open this private memory.' })
        return
      }

      // No memory data is subscribed or admitted until the canonical account
      // policy has been checked for this exact owner and consumer.
      setResult(LOADING)
      let currentRevision = -1
      let deniedAtRevision: number | null = null
      const attachMemory = () => {
        if (!isCurrentOwner() || unsubscribeMemory) return
        const boundEpoch = ++memoryEpoch
        const isCurrentMemory = () => isCurrentOwner() && boundEpoch === memoryEpoch
        try {
          unsubscribeMemory = onSnapshot(
            doc(getFirebaseDb(), 'users', user.uid, 'memories', memoryId),
            (snapshot) => {
              if (!isCurrentMemory()) return
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
              if (!isCurrentMemory()) return
              setResult(unavailable('Selected memory could not be loaded.'))
            },
          )
        } catch {
          if (!isCurrentMemory()) return
          setResult(unavailable('Selected memory could not be loaded.'))
        }
      }

      try {
        unsubscribePolicy = onSnapshot(
          doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current'),
          (snapshot) => {
            if (!isCurrentOwner()) return
            const raw = snapshot.exists() ? snapshot.data() : undefined
            if (!isConsentPolicy(raw, user.uid)) {
              detachMemory()
              setResult(unavailable('Private memory consent authority is unavailable.'))
              return
            }
            // Never recover a revoked source from an older (possibly cached)
            // policy snapshot. A new grant needs a later canonical revision.
            if (raw.revision < currentRevision) {
              detachMemory()
              setResult(unavailable('Private memory consent authority is stale.'))
              return
            }
            const memory = raw.domains.memory
            const permissionVisible = viewingReplay ? memory.replayVisible : memory.lifeMapVisible
            const allowed = raw.enforcement.state === 'fully-enforced'
              && (memory.mode === 'granted' || memory.mode === 'limited')
              && permissionVisible
            if (!allowed) {
              deniedAtRevision = raw.revision
              currentRevision = Math.max(currentRevision, raw.revision)
              detachMemory()
              setResult({ status: 'unauthorized', memory: null, message: 'Memory access is not currently permitted.' })
              return
            }
            if (deniedAtRevision !== null && raw.revision <= deniedAtRevision) {
              detachMemory()
              setResult({ status: 'unauthorized', memory: null, message: 'A newer consent authorization is required.' })
              return
            }
            if (raw.revision !== currentRevision) {
              currentRevision = raw.revision
              detachMemory()
              setResult(LOADING)
            }
            attachMemory()
          },
          () => {
            if (!isCurrentOwner()) return
            detachMemory()
            setResult(unavailable('Private memory consent authority could not be loaded.'))
          },
        )
      } catch {
        if (!isCurrentOwner()) return
        detachMemory()
        setResult(unavailable('Private memory consent authority could not be loaded.'))
      }
    })

    return () => {
      cancelled = true
      detachActor()
      unsubscribeAuth()
    }
  }, [manifestId, memoryId, requestedDemoMemoryId, selectionKey, viewingReplay])

  // Query navigation can reuse the mounted client. Never render the previous
  // selection during the frame before its subscription effect is replaced.
  return selection.key === selectionKey ? selection.result : LOADING
}
