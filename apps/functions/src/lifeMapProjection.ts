/** Read-only projection of canonical owner memories. Never reads demo seed collections. */
type Row = Record<string, unknown>
const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
const token = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value)
const text = (value: unknown, maximum: number) => typeof value === 'string' ? value.slice(0, maximum) : ''
function epoch(value: unknown): number {
  try {
    if (value instanceof Date) return value.getTime()
    if (typeof value === 'string') return Date.parse(value)
    if (typeof value === 'number') return value
    const timestamp = record(value)
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis()
  } catch { /* Malformed expiry is never authority. */ }
  return Number.NaN
}

export type LifeMapAuthority = {
  user: Row | undefined
  accountFence: boolean
  tombstone: Row | undefined
  grant: Row | undefined
  policy: Row | undefined
  applied: Row | undefined
  pendingDeletion: boolean
}

export function lifeMapAuthorityBinding(uid: string, state: LifeMapAuthority, now: number): string | null {
  const { user, grant, policy, applied } = state
  const memory = record(record(policy?.domains).memory)
  const enforcement = record(policy?.enforcement)
  const expiry = epoch(grant?.expiresAt)
  if (!token(uid) || !user || user.uid !== uid || user.deleted === true || user.markedForDeletion === true
    || ['deleting', 'deleted', 'disabled'].includes(String(user.accountStatus))
    || state.accountFence || state.tombstone?.active === true || state.pendingDeletion
    || grant?.uid !== uid || grant.purpose !== 'memory.storage' || grant.consentTier !== 'C1'
    || grant.policyVersion !== '1.0.0' || grant.status !== 'granted'
    || !Number.isFinite(expiry) || expiry <= now
    || typeof grant.receiptHash !== 'string' || !/^[a-f0-9]{64}$/.test(grant.receiptHash)
    || policy?.ownerId !== uid || policy.version !== 2 || !Number.isSafeInteger(policy.revision) || Number(policy.revision) < 1
    || !['granted', 'limited'].includes(String(memory.mode)) || memory.lifeMapVisible !== true
    || enforcement.state !== 'fully-enforced' || !token(enforcement.jobId)
    || !Array.isArray(enforcement.affectedTargets) || !enforcement.affectedTargets.includes('life-map-visibility')
    || applied?.ownerId !== uid || applied.domain !== 'memory' || applied.target !== 'life-map-visibility'
    || applied.revision !== policy.revision || applied.sourceJobId !== enforcement.jobId
    || applied.mode !== memory.mode || applied.enabled !== true || applied.lifeMapVisible !== true) return null
  return JSON.stringify([uid, grant.receiptHash, expiry, policy.revision, enforcement.jobId, memory.mode])
}

export function projectCanonicalMemory(uid: string, id: string, raw: Row) {
  if (!token(id) || raw.ownerId !== uid || raw.demo !== false || raw.deleted !== false
    || raw.consentState !== 'authorized' || raw.privacyLevel === 'hidden') return null
  const occurredAt = epoch(raw.occurredAt ?? raw.createdAt)
  const occurredDate = new Date(occurredAt)
  return {
    id, userId: uid, title: text(raw.title, 240) || 'Memory', summary: text(raw.summary, 2000),
    type: 'memory' as const, sourceType: 'system_generated' as const,
    ...(Number.isFinite(occurredDate.getTime()) ? { occurredAt: occurredDate.toISOString() } : {}),
    intensity: 0.5, privacyLevel: 'private' as const, connectedTo: [] as string[],
    // A list projection is not proof of a render grant, manifest or playback capability.
    replayAvailable: false, locked: false,
  }
}

export async function readLifeMapProjection(uid: string, dependencies: {
  verifyOwner(): Promise<void>
  readAuthority(): Promise<LifeMapAuthority>
  readMemories(): Promise<Array<{ id: string; data: Row }>>
  now(): number
}) {
  const denied = () => ({ view: 'life-map' as const, owner: uid, state: 'denied' as const, events: [], eras: [] })
  await dependencies.verifyOwner()
  const before = lifeMapAuthorityBinding(uid, await dependencies.readAuthority(), dependencies.now())
  if (!before) return denied()
  const memories = await dependencies.readMemories()
  // Recheck both grant authorities and owner after reads; never return an obsolete grant's data.
  await dependencies.verifyOwner()
  const after = lifeMapAuthorityBinding(uid, await dependencies.readAuthority(), dependencies.now())
  if (!after || before !== after) return denied()
  const events = memories.slice(0, 240).flatMap(({ id, data }) => {
    const event = projectCanonicalMemory(uid, id, data)
    return event ? [event] : []
  })
  const issuedAt = dependencies.now()
  return { view: 'life-map' as const, owner: uid, state: 'available' as const, events, eras: [], issuedAt,
    validUntil: Math.min(Number(JSON.parse(after)[2]), issuedAt + 30_000) }
}
