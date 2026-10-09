'use client'

import { useEffect, useRef, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions, getFirebaseDb } from '@/lib/firebase/client'
import { parseSelectedMemory, type SelectedMemory, type SelectedMemoryMedia } from './selectedMemoryContract'
import { fetchOwnedMemoryPlayback, validateOwnedMemoryPlaybackDescriptor, type OwnedMemoryPlaybackDescriptor } from './ownedMemoryMediaPlayback'

type Playback = { key: string; status: 'absent' | 'loading' | 'ready' | 'unavailable'; media: SelectedMemoryMedia[] }
const EMPTY: Playback = { key: '', status: 'absent', media: [] }

export function useOwnedMemoryMediaPlayback(memory: SelectedMemory | null, onRelease?: () => void) {
  const releaseConsumer = useRef(onRelease)
  releaseConsumer.current = onRelease
  const receipt = memory?.sourceMediaReceipts?.find(item => item.kind === 'video')
    ?? memory?.sourceMediaReceipts?.find(item => item.kind === 'image')
    ?? memory?.sourceMediaReceipts?.find(item => item.kind === 'audio')
  const key = JSON.stringify([memory?.ownerId, memory?.id, memory?.privacy, memory?.demo, receipt ?? null])
  const [playback, setPlayback] = useState(EMPTY)
  useEffect(() => {
    if (!memory || !receipt) { setPlayback({ ...EMPTY, key }); return }
    if (!firebasePublicEnvReady || memory.demo || memory.authorization !== 'owner' || memory.privacy !== 'private') {
      setPlayback({ key, status: 'unavailable', media: [] }); return
    }
    const auth = getAuth(app), db = getFirebaseDb(), projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ''
    let closed = false, generation = 0, detach: (() => void) | undefined
    const stopIdentity = onAuthStateChanged(auth, user => {
      generation += 1; detach?.(); detach = undefined
      const version = generation, controller = new AbortController(), stops: (() => void)[] = []
      let objectUrl: string | null = null, expiry: ReturnType<typeof setTimeout> | undefined, poll: ReturnType<typeof setTimeout> | undefined
      let policyRevision: number | null = null, deletionGeneration: number | null = null
      let sourceSnapshot: Record<string, unknown> | null = null
      const readSourceSnapshot = (): Record<string, unknown> | null => sourceSnapshot
      const loaded = new Set<number>()
      let finishSnapshots: () => void = () => {}
      const snapshotsReady = new Promise<void>(resolve => { finishSnapshots = resolve })
      const current = () => !closed && version === generation && !controller.signal.aborted && auth.currentUser === user
      const release = () => {
        controller.abort(); stops.splice(0).forEach(stop => stop())
        clearTimeout(expiry); clearTimeout(poll)
        finishSnapshots()
        releaseConsumer.current?.()
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        objectUrl = null
      }
      detach = release
      const deny = () => { const publish = !closed && version === generation; release(); if (publish) setPlayback({ key, status: 'unavailable', media: [] }) }
      setPlayback({ key, status: 'loading', media: [] })
      if (!user || user.uid !== memory.ownerId || navigator.onLine === false) { deny(); return }
      expiry = setTimeout(deny, 50_000)
      const callable = httpsCallable<{ memoryId: string; receiptId: string }, unknown>(functions, 'getMemoryMediaPlaybackAuthority')
      const resolve = async () => {
        if (!current()) throw new Error('PRIVATE_MEDIA_AUTHORITY_CHANGED')
        let timeout: ReturnType<typeof setTimeout> | undefined
        const deadline = new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('PRIVATE_MEDIA_AUTHORITY_TIMEOUT')), 15_000)
        })
        const result = await Promise.race([callable({ memoryId: memory.id, receiptId: receipt.mediaReceiptId }), deadline]).finally(() => clearTimeout(timeout))
        if (!current() || !validateOwnedMemoryPlaybackDescriptor(result.data, { ownerId: user.uid, memoryId: memory.id, receipt })) throw new Error('PRIVATE_MEDIA_AUTHORITY_CHANGED')
        return result.data
      }
      let admitted: OwnedMemoryPlaybackDescriptor | null = null
      const armExpiry = (descriptor: OwnedMemoryPlaybackDescriptor) => {
        clearTimeout(expiry); expiry = setTimeout(deny, Math.max(0, descriptor.expiresAt - Date.now()))
      }
      const revalidate = async () => {
        try {
          const next = await resolve()
          if (!current() || next.sourceAuthorityHash !== admitted?.sourceAuthorityHash) { deny(); return }
          armExpiry(next); poll = setTimeout(() => void revalidate(), 30_000)
        } catch { deny() }
      }
      const watch = (parts: string[], check: (data: Record<string, unknown> | null) => boolean) => {
        if (!current()) return
        const index = stops.length
        const stop = onSnapshot(doc(db, ...parts as [string, ...string[]]), snapshot => {
          if (!current()) return
          if (!check(snapshot.exists() ? snapshot.data() : null)) { deny(); return }
          loaded.add(index)
          if (loaded.size === 5) finishSnapshots()
        }, deny)
        if (current()) stops.push(stop)
        else stop()
      }
      watch(['users', user.uid, 'memories', memory.id], data => {
        if (!data) return false
        const parsed = parseSelectedMemory(data, user.uid, memory.id, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
        return parsed.status === 'ready' && parsed.memory?.privacy === 'private'
          && parsed.memory.sourceMediaReceipts?.some(item => item.mediaReceiptId === receipt.mediaReceiptId && item.kind === receipt.kind) === true
      })
      watch(['users', user.uid, 'privacyPolicy', 'current'], data => {
        if (!data || data.ownerId !== user.uid || data.version !== 2 || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1
          || (data.domains as { memory?: { mode?: unknown; replayVisible?: unknown } } | undefined)?.memory?.mode !== 'granted'
          || (data.domains as { memory?: { replayVisible?: unknown } } | undefined)?.memory?.replayVisible !== true
          || (data.enforcement as { state?: unknown } | undefined)?.state !== 'fully-enforced'
          || (policyRevision !== null && data.revision !== policyRevision)) return false
        policyRevision = Number(data.revision)
        return !sourceSnapshot || sourceSnapshot.consentRevision === policyRevision
      })
      watch(['users', user.uid, 'privacyRuntime', 'exportAuthority'], data => {
        const next = data ? data.generation : 0
        if (!Number.isSafeInteger(next) || Number(next) < 0 || (deletionGeneration !== null && next !== deletionGeneration)
          || (data && (!data.pendingDeletions || typeof data.pendingDeletions !== 'object' || Array.isArray(data.pendingDeletions)
            || Object.keys(data.pendingDeletions).length !== 0))) return false
        deletionGeneration = Number(next)
        return !sourceSnapshot || sourceSnapshot.deletionGeneration === deletionGeneration
      })
      watch(['users', user.uid], data => !!data && data.deleted !== true && !['deleting', 'deleted', 'disabled'].includes(String(data.accountStatus)))
      watch(['users', user.uid, 'memoryMediaReceipts', receipt.mediaReceiptId], data => {
        if (!data || data.ownerUid !== user.uid || data.memoryId !== memory.id || data.receiptId !== receipt.mediaReceiptId || data.kind !== receipt.kind || data.state !== 'ready') return false
        if ((policyRevision !== null && data.consentRevision !== policyRevision)
          || (deletionGeneration !== null && data.deletionGeneration !== deletionGeneration)) return false
        if (admitted) return data.sha256 === admitted.sha256 && data.storageGeneration === admitted.storageGeneration
          && data.byteLength === admitted.byteLength && data.contentType === admitted.contentType && !!sourceSnapshot
          && ['schemaVersion', 'attemptNonce', 'consentRevision', 'consentReceiptHash', 'consentExpiresAt', 'deletionGeneration', 'bucketName', 'objectPath']
            .every(field => data[field] === sourceSnapshot![field])
        sourceSnapshot = data
        return true
      })
      const offline = () => deny()
      window.addEventListener('offline', offline); stops.push(() => window.removeEventListener('offline', offline))
      void (async () => {
        try {
          await snapshotsReady
          if (!current()) return
          admitted = await resolve(); armExpiry(admitted)
          const observed = readSourceSnapshot()
          if (!observed || observed.sha256 !== admitted.sha256 || observed.storageGeneration !== admitted.storageGeneration
            || observed.byteLength !== admitted.byteLength || observed.contentType !== admitted.contentType) { deny(); return }
          const blob = await fetchOwnedMemoryPlayback(admitted, projectId, { signal: controller.signal, isCurrent: current,
            requestHeaders: async () => { const token = await user.getIdToken(true); if (!current()) throw new Error('PRIVATE_MEDIA_AUTHORITY_CHANGED'); return { Authorization: `Bearer ${token}` } } })
          const after = await resolve()
          if (!current() || after.sourceAuthorityHash !== admitted.sourceAuthorityHash) { deny(); return }
          armExpiry(after)
          objectUrl = URL.createObjectURL(blob)
          setPlayback({ key, status: 'ready', media: [{ kind: receipt.kind, url: objectUrl, caption: receipt.caption }] })
          poll = setTimeout(() => void revalidate(), 30_000)
        } catch { deny() }
      })()
    })
    return () => { closed = true; generation += 1; detach?.(); stopIdentity() }
  // The selected immutable receipt, rather than unrelated caption renders, owns a mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return playback.key === key ? playback : { key, status: receipt ? 'loading' as const : 'absent' as const, media: [] }
}
