'use client'

import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
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

// The protected media backend requires this same canonical C1 grant. The client
// must independently close Focus/Replay when C1 is missing or withdrawn, even
// if a separate, previously granted privacyPolicy revision is still visible.
function activeC1MemoryGrant(value: unknown, uid: string): { receiptHash: string; expiresAt: number } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if (record.uid !== uid || record.purpose !== 'memory.storage' || record.consentTier !== 'C1'
    || record.policyVersion !== '1.0.0' || record.status !== 'granted'
    || typeof record.receiptHash !== 'string' || !/^[a-f0-9]{64}$/.test(record.receiptHash)) return null
  const rawExpiry = record.expiresAt
  let expiresAt = Number.NaN
  if (typeof rawExpiry === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(rawExpiry)) {
    const time = Date.parse(rawExpiry)
    if (Number.isFinite(time) && new Date(time).toISOString() === rawExpiry) expiresAt = time
  } else if (rawExpiry && typeof rawExpiry === 'object'
    && 'toMillis' in rawExpiry && typeof rawExpiry.toMillis === 'function') {
    try { expiresAt = rawExpiry.toMillis() } catch { return null }
  }
  return Number.isSafeInteger(expiresAt) && expiresAt > Date.now()
    ? { receiptHash: record.receiptHash, expiresAt } : null
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
    let unsubscribeC1: (() => void) | undefined
    let unsubscribeMemory: (() => void) | undefined
    let c1ExpiryTimer: ReturnType<typeof setTimeout> | undefined

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
      if (c1ExpiryTimer !== undefined) clearTimeout(c1ExpiryTimer)
      c1ExpiryTimer = undefined
      const unsubscribe = unsubscribePolicy
      const unsubscribeGrant = unsubscribeC1
      unsubscribePolicy = undefined
      unsubscribeC1 = undefined
      unsubscribe?.()
      unsubscribeGrant?.()
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
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      detachActor()
      const ownerEpoch = actorEpoch
      const isCurrentOwner = () => !cancelled && actorEpoch === ownerEpoch
      if (!user) {
        setResult({ status: 'unauthorized', memory: null, message: 'Sign in to open this private memory.' })
        return
      }

      // No memory data is subscribed or admitted until the canonical account
      // policy has been checked for this exact owner and consumer.
      setResult(LOADING)
      let currentRevision = -1
      let deniedAtRevision: number | null = null
      // Firestore's listener error callback is terminal. Even a late queued
      // success must never re-establish authority on this dead stream.
      let policyListenerFailed = false
      let c1ListenerFailed = false
      let policyGranted = false
      let c1ExpiresAt = 0
      let c1ReceiptHash = ''
      const revokeC1 = (message: string, status: 'unauthorized' | 'unavailable' = 'unauthorized') => {
        c1ExpiresAt = 0
        c1ReceiptHash = ''
        if (c1ExpiryTimer !== undefined) clearTimeout(c1ExpiryTimer)
        c1ExpiryTimer = undefined
        detachMemory()
        setResult({ status, memory: null, message })
      }
      const watchC1Expiry = () => {
        if (c1ExpiryTimer !== undefined) clearTimeout(c1ExpiryTimer)
        c1ExpiryTimer = undefined
        if (c1ExpiresAt <= 0 || typeof setTimeout !== 'function') return
        // Browsers clamp long timers; rearm until the actual expiry is reached.
        c1ExpiryTimer = setTimeout(() => {
          c1ExpiryTimer = undefined
          if (!isCurrentOwner()) return
          if (Date.now() >= c1ExpiresAt) revokeC1('Memory storage consent has expired.')
          else watchC1Expiry()
        }, Math.min(Math.max(1, c1ExpiresAt - Date.now() + 1), 2_147_483_647))
      }
      const attachMemory = () => {
        if (!isCurrentOwner() || unsubscribeMemory || !policyGranted || !c1ReceiptHash) return
        if (c1ExpiresAt <= Date.now()) {
          revokeC1('Memory storage consent has expired.')
          return
        }
        const boundEpoch = ++memoryEpoch
        const isCurrentMemory = () => isCurrentOwner() && boundEpoch === memoryEpoch
        try {
          unsubscribeMemory = onSnapshot(
            doc(getFirebaseDb(), 'users', user.uid, 'memories', memoryId),
            { includeMetadataChanges: true },
            (snapshot) => {
              if (!isCurrentMemory()) return
              if (!policyGranted || !c1ReceiptHash || c1ExpiresAt <= Date.now()) {
                revokeC1('Current memory storage authorization is required.')
                return
              }
              // Never display cached or locally optimistic private memory as verified source truth.
              // A metadata-only server acknowledgement can reopen the view after reconciliation.
              if (snapshot.metadata?.fromCache !== false || snapshot.metadata?.hasPendingWrites !== false) {
                setResult(unavailable('Selected memory is awaiting verified server state.'))
                return
              }
              if (!snapshot.exists()) {
                setResult(unavailable('Selected memory could not be found.'))
                return
              }
              const parsed = parseSelectedMemory(snapshot.data(), user.uid, memoryId, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null)
              if (parsed.memory && manifestId && parsed.memory.replayManifest.id !== manifestId) {
                setResult({ status: 'corrupt', memory: null, message: 'The requested replay manifest does not match this memory.' })
                return
              }
              setResult(parsed)
            },
            () => {
              if (!isCurrentMemory()) return
              // Reject any later callback from the failed source generation.
              // A future server-confirmed policy event may attach a new listener.
              detachMemory()
              setResult(unavailable('Selected memory could not be loaded.'))
            },
          )
        } catch {
          if (!isCurrentMemory()) return
          // A subscription may throw after scheduling a callback. Invalidate
          // that generation even when no unsubscribe handle was returned.
          detachMemory()
          setResult(unavailable('Selected memory could not be loaded.'))
        }
      }

      try {
        unsubscribePolicy = onSnapshot(
          doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current'),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (!isCurrentOwner() || policyListenerFailed) return
            // Firestore may replay an old granted policy from the browser cache or
            // expose an uncommitted local grant. Neither is current consent authority.
            // Subscribe to metadata changes so only a server-confirmed, committed
            // revision may authorize the private memory stream.
            if (snapshot.metadata?.fromCache !== false || snapshot.metadata?.hasPendingWrites !== false) {
              policyGranted = false
              detachMemory()
              setResult(unavailable('Private memory consent authority is awaiting live verification.'))
              return
            }
            const raw = snapshot.exists() ? snapshot.data() : undefined
            if (!isConsentPolicy(raw, user.uid)) {
              policyGranted = false
              detachMemory()
              setResult(unavailable('Private memory consent authority is unavailable.'))
              return
            }
            // Never recover a revoked source from an older (possibly cached)
            // policy snapshot. A new grant needs a later canonical revision.
            if (raw.revision < currentRevision) {
              policyGranted = false
              detachMemory()
              setResult(unavailable('Private memory consent authority is stale.'))
              return
            }
            const memory = raw.domains.memory
            const permissionVisible = viewingReplay ? memory.replayVisible : memory.lifeMapVisible
            const allowed = raw.enforcement.state === 'fully-enforced'
              && memory.mode === 'granted'
              && permissionVisible
            if (!allowed) {
              policyGranted = false
              deniedAtRevision = raw.revision
              currentRevision = Math.max(currentRevision, raw.revision)
              detachMemory()
              setResult({ status: 'unauthorized', memory: null, message: 'Memory access is not currently permitted.' })
              return
            }
            if (deniedAtRevision !== null && raw.revision <= deniedAtRevision) {
              policyGranted = false
              detachMemory()
              setResult({ status: 'unauthorized', memory: null, message: 'A newer consent authorization is required.' })
              return
            }
            if (raw.revision !== currentRevision) {
              currentRevision = raw.revision
              detachMemory()
              setResult(LOADING)
            }
            policyGranted = true
            attachMemory()
          },
          () => {
            if (!isCurrentOwner()) return
            policyGranted = false
            policyListenerFailed = true
            detachMemory()
            setResult(unavailable('Private memory consent authority could not be loaded.'))
          },
        )
      } catch {
        if (!isCurrentOwner()) return
        // A failed policy subscription cannot ever authorize memory through
        // a queued success callback, even without an unsubscribe handle.
        policyGranted = false
        policyListenerFailed = true
        detachMemory()
        setResult(unavailable('Private memory consent authority could not be loaded.'))
      }

      // A policy grant alone is not a current memory-storage C1 authorization.
      // Firestore rules allow this owner to GET only its canonical C1 record.
      try {
        unsubscribeC1 = onSnapshot(
          doc(getFirebaseDb(), 'consentRecords', `${user.uid}_memory_storage`),
          { includeMetadataChanges: true },
          (snapshot) => {
            if (!isCurrentOwner() || c1ListenerFailed) return
            if (snapshot.metadata?.fromCache !== false || snapshot.metadata?.hasPendingWrites !== false) {
              revokeC1('Memory storage consent is awaiting server verification.', 'unavailable')
              return
            }
            const grant = snapshot.exists() ? activeC1MemoryGrant(snapshot.data(), user.uid) : null
            if (!grant) {
              revokeC1('Current C1 memory storage consent is required.')
              return
            }
            if (c1ReceiptHash && (c1ReceiptHash !== grant.receiptHash || c1ExpiresAt !== grant.expiresAt)) {
              detachMemory()
              setResult(LOADING)
            }
            c1ReceiptHash = grant.receiptHash
            c1ExpiresAt = grant.expiresAt
            watchC1Expiry()
            if (policyGranted && !unsubscribeMemory) setResult(LOADING)
            attachMemory()
          },
          () => {
            if (!isCurrentOwner()) return
            c1ListenerFailed = true
            revokeC1('Memory storage consent authority could not be loaded.', 'unavailable')
          },
        )
      } catch {
        if (!isCurrentOwner()) return
        c1ListenerFailed = true
        revokeC1('Memory storage consent authority could not be loaded.', 'unavailable')
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
