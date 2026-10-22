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
