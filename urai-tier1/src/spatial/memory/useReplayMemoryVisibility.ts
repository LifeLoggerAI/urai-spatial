'use client'

import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import type { SelectedMemory } from './selectedMemoryContract'

/** Replay-only metadata admission. Focus and Life Map keep their existing semantics. */
export function useReplayMemoryVisibility(memory: SelectedMemory | null) {
  const key = JSON.stringify([memory?.ownerId, memory?.id, memory?.privacy, memory?.demo])
  const [authority, setAuthority] = useState<{ key: string; status: 'loading' | 'visible' | 'unavailable' }>({ key: '', status: 'loading' })
  useEffect(() => {
    const publish = (status: 'loading' | 'visible' | 'unavailable') => setAuthority({ key, status })
    if (!memory) { publish('unavailable'); return }
    if (memory.demo) { publish('visible'); return }
    if (!firebasePublicEnvReady || memory.privacy === 'hidden') { publish('unavailable'); return }
    const auth = getAuth(app)
    let cancelled = false, generation = 0, detach: (() => void) | undefined
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      generation += 1; detach?.()
      const version = generation, stops: (() => void)[] = [], ready = new Set<number>()
      let closed = false
      const current = () => !cancelled && !closed && generation === version && auth.currentUser === user
      const close = () => { closed = true; stops.splice(0).forEach(stop => stop()) }
      const deny = () => { if (current()) publish('unavailable'); close() }
      detach = close
      publish('loading')
      if (!user || user.uid !== memory.ownerId || navigator.onLine === false) { deny(); return }
      const watch = (index: number, parts: string[], valid: (value: Record<string, unknown> | null) => boolean) => {
        if (!current()) return
        const stop = onSnapshot(doc(getFirebaseDb(), ...parts as [string, ...string[]]), snapshot => {
          if (!current()) return
          if (!valid(snapshot.exists() ? snapshot.data() : null)) { deny(); return }
          ready.add(index); if (ready.size === 4) publish('visible')
        }, deny)
        if (current()) stops.push(stop); else stop()
      }
      watch(0, ['users', user.uid, 'memories', memory.id], data => !!data && (data.ownerId ?? data.userId) === user.uid
        && data.deleted !== true && data.privacy !== 'hidden' && !['revoked', 'pending'].includes(String(data.consentState)))
      watch(1, ['users', user.uid, 'privacyPolicy', 'current'], data => {
        const policyMemory = (data?.domains as { memory?: { mode?: unknown; replayVisible?: unknown } } | undefined)?.memory
        return !!data && data.ownerId === user.uid && data.version === 2 && Number.isSafeInteger(data.revision) && Number(data.revision) >= 1
          && (data.enforcement as { state?: unknown } | undefined)?.state === 'fully-enforced'
          && ['granted', 'limited'].includes(String(policyMemory?.mode)) && policyMemory?.replayVisible === true
      })
      watch(2, ['users', user.uid], data => !!data && data.deleted !== true && !['deleting', 'deleted', 'disabled'].includes(String(data.accountStatus)))
      watch(3, ['users', user.uid, 'privacyRuntime', 'exportAuthority'], data => !data || (Number.isSafeInteger(data.generation)
        && Number(data.generation) >= 0 && !!data.pendingDeletions && typeof data.pendingDeletions === 'object'
        && !Array.isArray(data.pendingDeletions) && Object.keys(data.pendingDeletions).length === 0))
      const offline = () => deny()
      window.addEventListener('offline', offline); stops.push(() => window.removeEventListener('offline', offline))
    })
    return () => { cancelled = true; generation += 1; detach?.(); unsubscribeAuth() }
  // The same selected owner memory owns these subscriptions across unrelated renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return authority.key === key ? authority.status : memory?.demo ? 'visible' : 'loading'
}
