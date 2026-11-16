'use client'

import { getAuth, onIdTokenChanged, type User } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'

export type AIActorSnapshot = Readonly<{ actor: User | null; uid: string | null; generation: number }>
const serverSnapshot: AIActorSnapshot = Object.freeze({ actor: null, uid: null, generation: 0 })
let snapshot = serverSnapshot
let observedActor: User | null = null
let observedUid: string | null = null
let observed = false
let blocked = false
let generation = 0

function actorUid(actor: User | null) {
  try { return actor && typeof actor.uid === 'string' && actor.uid.length > 0 && actor.uid.length <= 128 ? actor.uid : null } catch { return null }
}
function currentActor(): User | null {
  if (!firebasePublicEnvReady || blocked) return null
  try { const actor = getAuth(app).currentUser; return actorUid(actor) ? actor : null } catch { return null }
}
function replaceSnapshot(actor: User | null) {
  snapshot = Object.freeze({ actor, uid: actorUid(actor), generation: ++generation })
}
export function getAIActorSnapshot(): AIActorSnapshot {
  const actor = currentActor(), uid = actorUid(actor)
  if (!observed || snapshot.actor !== actor || snapshot.uid !== uid) {
    observed = true; observedActor = actor; observedUid = uid
    replaceSnapshot(actor)
  }
  return snapshot
}
export function getServerAIActorSnapshot() { return serverSnapshot }
export function isCurrentAIActorSnapshot(value: AIActorSnapshot) {
  return getAIActorSnapshot() === value
}
export function subscribeAIActor(listener: () => void) {
  getAIActorSnapshot()
  if (!firebasePublicEnvReady) return () => {}
  try {
    return onIdTokenChanged(getAuth(app), actor => {
      blocked = false
      const uid = actorUid(actor)
      // Preserve same-object token refresh; retain even a queued intermediate
      // actor notification when the SDK has already returned to the prior actor.
      if (!observed || actor !== observedActor || uid !== observedUid) {
        observed = true; observedActor = actor; observedUid = uid
        replaceSnapshot(currentActor())
      } else getAIActorSnapshot()
      listener()
    }, () => { blocked = true; replaceSnapshot(null); listener() })
  } catch { blocked = true; replaceSnapshot(null); listener(); return () => {} }
}

function stopped() { return new DOMException('AI request stopped after its actor or lifetime changed.', 'AbortError') }
function discard(value: unknown) {
  try { void Promise.resolve(value).catch(() => {}) } catch { /* Cleanup must not prolong the request. */ }
}
export function cancelAIResponse(response: Response) {
  try { if (response.body) discard(response.body.cancel()) } catch { /* A native fetch abort also owns a locked body. */ }
}
export function beginAIActorRequest(parentSignal: AbortSignal) {
  if (!firebasePublicEnvReady || parentSignal.aborted) return null
  let auth
  try { auth = getAuth(app) } catch { return null }
  const actor = currentActor(), uid = actorUid(actor)
  try { if (!actor || !uid || auth.currentUser !== actor) return null } catch { return null }
  const controller = new AbortController()
  let disposed = false
  const stop = () => controller.abort()
  const isCurrent = () => {
    let current = false
    try { current = !disposed && !parentSignal.aborted && !controller.signal.aborted
      && !blocked && auth.currentUser === actor && actorUid(actor) === uid } catch { /* Invalid SDK state stays denied. */ }
    if (!current) stop()
    return current
  }
  const check = () => { if (!isCurrent()) throw stopped() }
  parentSignal.addEventListener('abort', stop, { once: true })
  let unsubscribe: (() => void) | undefined
  try {
    unsubscribe = onIdTokenChanged(auth, value => {
      if (value !== actor || actorUid(value) !== uid || !isCurrent()) stop()
    }, stop)
  } catch { stop() }
  const dispose = () => {
    if (disposed) return
    disposed = true; stop()
    parentSignal.removeEventListener('abort', stop)
    try { unsubscribe?.() } catch { /* A closed request remains closed. */ }
  }
  if (!isCurrent()) { dispose(); return null }
  const wait = <T,>(promise: PromiseLike<T>, late?: (value: T) => unknown): Promise<T> => new Promise((resolve, reject) => {
    let settled = false
    const abort = () => {
      if (settled) return
      settled = true; controller.signal.removeEventListener('abort', abort); reject(stopped())
    }
    controller.signal.addEventListener('abort', abort, { once: true })
    Promise.resolve(promise).then(value => {
      if (settled || !isCurrent()) {
        if (late) { try { discard(late(value)) } catch { /* Late transport cleanup is best effort. */ } }
        abort(); return
      }
      settled = true; controller.signal.removeEventListener('abort', abort); resolve(value)
    }, error => {
      if (settled) return
      if (!isCurrent()) { abort(); return }
      settled = true; controller.signal.removeEventListener('abort', abort); reject(error)
    })
    if (!isCurrent()) abort()
  })
  return Object.freeze({ actor, uid, signal: controller.signal, isCurrent, check, wait, dispose })
}
