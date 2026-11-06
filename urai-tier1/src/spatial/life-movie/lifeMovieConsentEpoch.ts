import { isConsentPolicy } from '@/app/privacy-controls/consentModel'

/** No memory title, chapter or media receipt may be admitted without this epoch. */
export type LifeMovieConsentEpoch = {
  ownerId: string | null
  revision: number
  highestSeenRevision: number
  deniedAtRevision: number
  allowed: boolean
}

export function initialLifeMovieConsentEpoch(ownerId: string | null = null): LifeMovieConsentEpoch {
  return { ownerId, revision: -1, highestSeenRevision: -1, deniedAtRevision: -1, allowed: false }
}

/**
 * Owner-scoped monotonic admission: stale cached snapshots never restore an
 * earlier grant after a denial/revocation. A fresh grant needs a newer epoch.
 * This is a UI gate, not a substitute for server-side consent or media ACLs.
 */
export function advanceLifeMovieConsentEpoch(
  state: LifeMovieConsentEpoch,
  ownerId: string,
  raw: unknown,
): LifeMovieConsentEpoch {
  if (!ownerId || state.ownerId !== ownerId) return initialLifeMovieConsentEpoch(ownerId || null)
  if (!isConsentPolicy(raw, ownerId)) {
    return { ...state, allowed: false, revision: -1,
      deniedAtRevision: Math.max(state.deniedAtRevision, state.highestSeenRevision) }
  }
  if (raw.revision < state.highestSeenRevision) {
    return { ...state, revision: -1, allowed: false,
      deniedAtRevision: Math.max(state.deniedAtRevision, state.highestSeenRevision) }
  }
  const highestSeenRevision = Math.max(state.highestSeenRevision, raw.revision)
  const memory = raw.domains.memory
  const permitted = raw.revision >= 1
    && raw.enforcement.state === 'fully-enforced'
    && (memory.mode === 'granted' || memory.mode === 'limited')
    && memory.replayVisible === true
  const deniedAtRevision = permitted ? state.deniedAtRevision
    : Math.max(state.deniedAtRevision, raw.revision)
  const allowed = permitted && raw.revision > deniedAtRevision
  return {
    ownerId, revision: allowed ? raw.revision : -1,
    highestSeenRevision, deniedAtRevision, allowed,
  }
}

export function sameLifeMovieConsentEpoch(
  epoch: LifeMovieConsentEpoch,
  ownerId: string,
  revision: number,
): boolean {
  return !!ownerId && epoch.ownerId === ownerId && epoch.allowed
    && Number.isSafeInteger(revision) && revision >= 1
    && epoch.revision === revision
}
