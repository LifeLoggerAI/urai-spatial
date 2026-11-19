/**
 * Review-only owner-scoped family memory projection.
 *
 * This is NOT a database authorization layer. Call only with server-authoritative
 * contributions and grants after authenticated owner/current-account checks.
 * Firestore/Storage/Jobs must independently enforce authorization and revocation.
 * Family relationships never imply a grant; no raw URLs or original media bytes
 * are returned. Do not enable private-memory writes from this module.
 */
export const FAMILY_MEMORY_VIEW_VERSION = 'urai-family-memory-view-v1' as const

export type FamilyMediaKind = 'photo' | 'audio' | 'video'
export type FamilyEvidenceClass =
  | 'DIRECT_SUBJECT_TESTIMONY'
  | 'ATTRIBUTED_TESTIMONY'
  | 'SOURCE_CAPTURED'

export type FamilyMemoryContribution = {
  id: string
  eventId: string
  ownerId: string
  authorId: string
  title: string
  recollection: string
  evidenceClass: FamilyEvidenceClass
  mediaRefs: Array<{ id: string; kind: FamilyMediaKind }>
  state: 'active' | 'revoked' | 'deleted'
  synthetic: false
}

export type FamilyMemoryGrant = {
  id: string
  ownerId: string
  viewerId: string
  contributionId: string
  purpose: 'family-memory-view'
  scope: 'story' | 'story-and-media'
  state: 'active' | 'revoked'
}

export type FamilyMemoryViewEntry = {
  contributionId: string
  eventId: string
  authorId: string
  title: string
  recollection: string
  evidenceClass: FamilyEvidenceClass
  mediaRefs: Array<{ id: string; kind: FamilyMediaKind }>
  access: 'owner' | 'granted'
}

export type FamilyMemoryView = {
  version: typeof FAMILY_MEMORY_VIEW_VERSION
  eventId: string
  viewerId: string
  memories: FamilyMemoryViewEntry[]
}

const safeId = (s: unknown): s is string =>
  typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(s)

const mediaKinds = new Set(['photo', 'audio', 'video'])
const evidenceKinds = new Set(['DIRECT_SUBJECT_TESTIMONY', 'ATTRIBUTED_TESTIMONY', 'SOURCE_CAPTURED'])

const validContribution = (c: FamilyMemoryContribution): boolean =>
  !!c &&
  safeId(c.id) && safeId(c.eventId) && safeId(c.ownerId) &&
  safeId(c.authorId) && c.ownerId === c.authorId &&
  c.state !== undefined &&
  ['active', 'revoked', 'deleted'].includes(c.state) &&
  c.synthetic === false &&
  typeof c.title === 'string' && c.title.trim().length > 0 && c.title.length <= 160 &&
  typeof c.recollection === 'string' && c.recollection.trim().length > 0 && c.recollection.length <= 10000 &&
  evidenceKinds.has(c.evidenceClass) &&
  Array.isArray(c.mediaRefs) && c.mediaRefs.length <= 50 &&
  c.mediaRefs.every((m) => !!m && safeId(m.id) && mediaKinds.has(m.kind)) &&
  new Set(c.mediaRefs.map((m) => m.id)).size === c.mediaRefs.length

const validGrant = (g: FamilyMemoryGrant): boolean =>
  !!g &&
  safeId(g.id) && safeId(g.ownerId) && safeId(g.viewerId) && safeId(g.contributionId) &&
  g.purpose === 'family-memory-view' &&
  (g.scope === 'story' || g.scope === 'story-and-media') &&
  (g.state === 'active' || g.state === 'revoked')

/**
 * Project one shared event for a current authenticated viewer.
 * Contributions remain separate testimony; no merged or inferred narrative.
 *
 * All caller-supplied records must originate from an independently verified
 * backend. In particular, a forged grant passed by a client is NOT authority.
 */
export function buildFamilyMemoryView(input: {
  viewerId: string
  eventId: string
  contributions: FamilyMemoryContribution[]
  grants: FamilyMemoryGrant[]
}): FamilyMemoryView {
  if (!safeId(input.viewerId) || !safeId(input.eventId)) {
    throw new Error('FAMILY_VIEW_INVALID_CONTEXT')
  }
  if (!Array.isArray(input.contributions) || !Array.isArray(input.grants) ||
      input.contributions.length > 1000 || input.grants.length > 5000 ||
      !input.contributions.every(validContribution) || !input.grants.every(validGrant)) {
    throw new Error('FAMILY_VIEW_INVALID_RECORD')
  }
  // Any duplicate record identity is a data-integrity failure, never "last wins".
  const contributionIds = input.contributions.map((c) => c.id)
  const grantIds = input.grants.map((g) => g.id)
  if (new Set(contributionIds).size !== contributionIds.length ||
      new Set(grantIds).size !== grantIds.length) {
    throw new Error('FAMILY_VIEW_DUPLICATE_ID')
  }

  const memories: FamilyMemoryViewEntry[] = []
  for (const contribution of input.contributions) {
    if (contribution.eventId !== input.eventId || contribution.state !== 'active') continue
    const own = contribution.ownerId === input.viewerId
    const applicable = input.grants.filter((g) =>
      g.ownerId === contribution.ownerId &&
      g.viewerId === input.viewerId &&
      g.contributionId === contribution.id &&
      g.purpose === 'family-memory-view'
    )
    // An explicit revocation wins over an older still-present active grant.
    if (!own && (applicable.some((g) => g.state === 'revoked') ||
                 !applicable.some((g) => g.state === 'active'))) continue

    const mediaAllowed = own || applicable.some((g) =>
      g.state === 'active' && g.scope === 'story-and-media'
    )
    memories.push({
      contributionId: contribution.id,
      eventId: contribution.eventId,
      authorId: contribution.authorId,
      title: contribution.title,
      recollection: contribution.recollection,
      evidenceClass: contribution.evidenceClass,
      mediaRefs: mediaAllowed ? contribution.mediaRefs.map((m) => ({ ...m })) : [],
      access: own ? 'owner' : 'granted',
    })
  }

  memories.sort((a, b) => a.contributionId.localeCompare(b.contributionId))
  return {
    version: FAMILY_MEMORY_VIEW_VERSION,
    eventId: input.eventId,
    viewerId: input.viewerId,
    memories,
  }
}
