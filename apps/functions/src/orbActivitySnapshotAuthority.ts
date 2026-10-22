import { createHash } from 'node:crypto'

/**
 * Canonical, data-only representation of the maximum three pieces of history
 * the owner may explicitly opt to send with ONE Orb model request.
 *
 * This does not grant retrieval permission. Server-side owner, model/memory
 * consent, provenance, and deletion checks must run before this function.
 */
export type OrbAllowedActivity = {
  category: 'hypothetical-scenario' | 'unverified-owner-report'
  description: string
}

/** Server-only evidence identity; never forwarded to the model. */
export type OrbAuthorizedActivity = OrbAllowedActivity & { sourceKey: string }
export type OrbAuthorizedActivityRead = { privacyRevision: number; entries: readonly OrbAuthorizedActivity[] }
export type OrbSealedActivity = { modelContext: string; authorityTag: string }

export const ORB_ACTIVITY_CONTEXT_LIMIT = 3 as const
export const ORB_ACTIVITY_DESCRIPTION_LIMIT = 280 as const

function invalid(): never {
  throw new Error('ORB_ACTIVITY_SNAPSHOT_INVALID')
}

export function canonicalOrbActivitySnapshot(records: readonly OrbAllowedActivity[]): string {
  if (!Array.isArray(records) || records.length > ORB_ACTIVITY_CONTEXT_LIMIT) invalid()
  const safe = records.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) invalid()
    // Allow exactly these two fields. Do not accidentally export source refs,
    // user IDs, private ledger metadata, timestamps, or model instructions.
    const keys = Object.keys(item)
    if (keys.length !== 2 || !keys.includes('category') || !keys.includes('description')) invalid()
    if (item.category !== 'hypothetical-scenario' && item.category !== 'unverified-owner-report') invalid()
    if (typeof item.description !== 'string') invalid()
    const description = item.description.trim()
    if (!description || description.length > ORB_ACTIVITY_DESCRIPTION_LIMIT) invalid()
    return { category: item.category, description }
  })
  return JSON.stringify(safe)
}

/** Compare a newly authorized read to the exact private text selected for dispatch. */
export function matchesOrbActivitySnapshot(original: string, current: readonly OrbAllowedActivity[]): boolean {
  return typeof original === 'string' && canonicalOrbActivitySnapshot(current) === original
}

/** Bind exact trusted source identity + privacy revision separately from model text. */
export function sealOrbAuthorizedActivity(read: OrbAuthorizedActivityRead): OrbSealedActivity {
  if (!read || !Number.isSafeInteger(read.privacyRevision) || read.privacyRevision < 0
    || !Array.isArray(read.entries) || read.entries.length > ORB_ACTIVITY_CONTEXT_LIMIT) invalid()
  const sources: string[] = []
  const visible: OrbAllowedActivity[] = []
  for (const item of read.entries) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) invalid()
    const keys = Object.keys(item)
    if (keys.length !== 3 || !keys.includes('category') || !keys.includes('description') || !keys.includes('sourceKey')) invalid()
    if (typeof item.sourceKey !== 'string' || !/^[a-f0-9]{64}$/.test(item.sourceKey)) invalid()
    sources.push(item.sourceKey)
    visible.push({ category: item.category, description: item.description })
  }
  const modelContext = canonicalOrbActivitySnapshot(visible)
  const authorityTag = createHash('sha256').update(JSON.stringify({ privacyRevision: read.privacyRevision, sources })).digest('hex')
  return { modelContext, authorityTag }
}

/** Detect deleted/recreated records even when their visible text is unchanged. */
export function matchesOrbAuthorizedActivity(sealed: OrbSealedActivity, current: OrbAuthorizedActivityRead): boolean {
  if (!sealed || typeof sealed.modelContext !== 'string' || typeof sealed.authorityTag !== 'string') return false
  const next = sealOrbAuthorizedActivity(current)
  return next.modelContext === sealed.modelContext && next.authorityTag === sealed.authorityTag
}
