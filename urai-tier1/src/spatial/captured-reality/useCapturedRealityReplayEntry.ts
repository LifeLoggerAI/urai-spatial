'use client'

import { useEffect, useRef, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, firebasePublicEnvReady, functions, getFirebaseDb } from '@/lib/firebase/client'
import { capturedRealityDeviceTier } from './capturedRealityRuntime'
import { capturedRealityJourneyEntryHref } from './capturedRealityJourney'

type ReplayEntryResponse = {
  available: boolean
  assetId?: string
  truthLabel?: string
}

export type CapturedRealityReplayEntry = {
  assetId: string
  href: string
  truthLabel: string
}

export type CapturedRealityReplayLookup = {
  status: 'loading' | 'available' | 'unavailable'
  entry: CapturedRealityReplayEntry | null
}

const SAFE_ASSET_ID = /^[A-Za-z0-9._-]{1,128}$/
const unavailable: CapturedRealityReplayLookup = { status: 'unavailable', entry: null }
const loading: CapturedRealityReplayLookup = { status: 'loading', entry: null }

export function useCapturedRealityReplayLookup(memoryId: string | null, onWithdrawal?: () => void): CapturedRealityReplayLookup {
  const withdrawal = useRef(onWithdrawal)
  withdrawal.current = onWithdrawal
  const [selection, setSelection] = useState<{ memoryId: string | null; lookup: CapturedRealityReplayLookup }>({ memoryId: null, lookup: unavailable })

  useEffect(() => {
    const setLookup = (lookup: CapturedRealityReplayLookup) => setSelection({ memoryId, lookup })
    setLookup(memoryId && firebasePublicEnvReady ? loading : unavailable)
    if (!memoryId || !firebasePublicEnvReady) return

    let cancelled = false
    const auth = getAuth(app)
    let generation = 0, detach: (() => void) | undefined
    const stop = onAuthStateChanged(auth, (user) => {
      if (cancelled) return
      generation += 1; detach?.(); detach = undefined
      const version = generation, stops: (() => void)[] = []
      let closed = false, poll: ReturnType<typeof setTimeout> | undefined
      let revision: unknown, deletionGeneration: unknown, bindingHash: string | null = null
      const loaded = new Set<number>()
      let finish: () => void = () => {}
      const ready = new Promise<void>(resolve => { finish = resolve })
      const current = () => !cancelled && !closed && generation === version && auth.currentUser === user
      const close = () => {
        if (closed) return
        closed = true; withdrawal.current?.()
        clearTimeout(poll); stops.splice(0).forEach(unsubscribe => unsubscribe()); finish()
      }
      const deny = () => { const publish = current(); close(); if (publish) setLookup(unavailable) }
      detach = close
      setLookup(loading)
      if (!user) {
        deny()
        return
      }

      const deviceTier = capturedRealityDeviceTier(navigator.userAgent)
      const callable = httpsCallable<{ memoryId: string; deviceTier: 'desktop' | 'mobile' }, ReplayEntryResponse>(
        functions,
        'getCapturedRealityReplayEntry',
      )

      const watch = (index: number, parts: string[], allowed: (data: Record<string, unknown> | null) => boolean) => {
        if (!current()) return
        const unsubscribe = onSnapshot(doc(getFirebaseDb(), ...parts as [string, ...string[]]), snapshot => {
          if (!current()) return
          if (!allowed(snapshot.exists() ? snapshot.data() : null)) { deny(); return }
          loaded.add(index); if (loaded.size === 5) finish()
        }, deny)
        if (current()) stops.push(unsubscribe); else unsubscribe()
      }
      watch(0, ['users', user.uid, 'memories', memoryId], data => !!data && (data.ownerId ?? data.userId) === user.uid
        && data.deleted !== true && data.privacy !== 'hidden' && !['revoked', 'pending'].includes(String(data.consentState)))
      watch(1, ['users', user.uid, 'privacyPolicy', 'current'], data => {
        const memory = (data?.domains as { memory?: { mode?: unknown; replayVisible?: unknown } } | undefined)?.memory
        if (!data || data.ownerId !== user.uid || data.version !== 2 || !Number.isSafeInteger(data.revision) || Number(data.revision) < 1
          || (data.enforcement as { state?: unknown } | undefined)?.state !== 'fully-enforced'
          || !['granted', 'limited'].includes(String(memory?.mode)) || memory?.replayVisible !== true
          || (revision !== undefined && data.revision !== revision)) return false
        revision = data.revision; return true
      })
      watch(2, ['users', user.uid, 'capturedRealityReplayBindings', memoryId], data => {
        if (!data || data.ownerId !== user.uid || data.memoryId !== memoryId || data.state !== 'accepted') return false
        const next = JSON.stringify(data)
        if (bindingHash !== null && next !== bindingHash) return false
        bindingHash = next; return true
      })
      watch(3, ['users', user.uid], data => !!data && data.deleted !== true && !['deleting', 'deleted', 'disabled'].includes(String(data.accountStatus)))
      watch(4, ['users', user.uid, 'privacyRuntime', 'exportAuthority'], data => {
        const next = data ? data.generation : 0
        if (!Number.isSafeInteger(next) || Number(next) < 0 || (deletionGeneration !== undefined && next !== deletionGeneration)
          || (data && (!data.pendingDeletions || typeof data.pendingDeletions !== 'object' || Array.isArray(data.pendingDeletions)
            || Object.keys(data.pendingDeletions).length !== 0))) return false
        deletionGeneration = next; return true
      })
      const offline = () => deny()
      window.addEventListener('offline', offline); stops.push(() => window.removeEventListener('offline', offline))
      poll = setTimeout(deny, 15_000)
      const resolveEntry = async () => {
        try {
          clearTimeout(poll); poll = setTimeout(deny, 15_000)
          const result = await callable({ memoryId, deviceTier })
          if (!current()) return
          const data = result.data
          const href = data.assetId ? capturedRealityJourneyEntryHref(data.assetId, memoryId) : null
          if (!data.available || !data.assetId || !SAFE_ASSET_ID.test(data.assetId) || !href) { deny(); return }
          setLookup({ status: 'available', entry: { assetId: data.assetId, href,
            truthLabel: data.truthLabel ?? 'Spatial reconstruction from recorded sources' } })
          clearTimeout(poll); poll = setTimeout(() => void resolveEntry(), 30_000)
        } catch { deny() }
      }
      void ready.then(() => { if (current()) void resolveEntry() })
    })

    return () => {
      cancelled = true
      generation += 1; detach?.()
      stop()
    }
  }, [memoryId])

  return selection.memoryId === memoryId ? selection.lookup : memoryId && firebasePublicEnvReady ? loading : unavailable
}

export function useCapturedRealityReplayEntry(memoryId: string | null) {
  return useCapturedRealityReplayLookup(memoryId).entry
}
