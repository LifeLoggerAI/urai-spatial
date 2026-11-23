/**
 * R1714 HOLD: read-only Studio authority evidence adapter, review-only.
 *
 * This code MUST only run in an authenticated server with an independently
 * approved reader bound to Studio's authoritative Firestore project. Neither
 * the caller-supplied UID/tenant nor this returned object proves identity.
 * The caller MUST verify the original Firebase bearer (revocation checked),
 * tenant claim, Studio project credentials, and repeat checks before playback.
 * Do not pass a client Firestore reader, JSON input or browser JWT role claims.
 * This does NOT register an ADC provider, route, IAM role, grant, or render job.
 *
 * Mirrors the read-side requirements inspected in Studio #206:
 * apps/studio/lib/studio-member-auth.ts and studio-life-movie-longform-auth.ts.
 * The actual Studio policy and its final playback checks remain authoritative.
 */
import { createHash } from 'node:crypto'

export type StudioAuthoritySnapshot = {
  exists: boolean
  data(): Record<string, unknown> | undefined
}
export type StudioAuthorityReader = {
  doc(path: string): {get(): Promise<StudioAuthoritySnapshot>}
}
export type CurrentStudioAuthority = {
  ownerUid: string
  tenantId: string
  studioUser: {uid: string; role: 'owner' | 'admin'; disabled: false; revoked: false}
  membership: {
    uid: string; studioId: string; role: 'owner' | 'creator';
    active: true; disabled: false; revoked: false
  }
  ownerDeletionFenced: false
  deletionTombstoneFenced: false
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const LEASE_FIELDS = [
  'deletionPlanningLeaseToken', 'deletionPlanningLeaseUntil',
  'deletionPlanningLeaseRequestId', 'deletionPlanningLeaseOperation',
  'deletionPlanningLeaseBy',
] as const

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return false
  return Reflect.ownKeys(value).every(key => {
    if (typeof key !== 'string') return false
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return Boolean(descriptor && Object.hasOwn(descriptor, 'value'))
  })
}

/** Do not export raw records, member details, receipt references or GCS data.
 * A null result does not reveal whether the account, tenant or memory exists.
 */
export async function readCurrentStudioAuthorityEvidence(
  verifiedOwnerUid: unknown, verifiedTenantId: unknown, reader: StudioAuthorityReader,
): Promise<CurrentStudioAuthority | null> {
  if (typeof verifiedOwnerUid !== 'string' || !ID.test(verifiedOwnerUid)
    || typeof verifiedTenantId !== 'string' || !ID.test(verifiedTenantId)) return null
  const uid = verifiedOwnerUid
  const tenant = verifiedTenantId
  const fenceId = createHash('sha256').update('urai-studio-data-rights:' + uid).digest('hex')

  try {
    // All paths are fixed by verified owner/tenant scalars, never by a
    // client-provided Firestore path, job ID, membership or authority object.
    const [userSnap, memberSnap, fenceSnap, tombstoneSnap] = await Promise.all([
      reader.doc('studioUsers/' + uid).get(),
      reader.doc('memberships/' + uid + '_' + tenant).get(),
      reader.doc('studioDataRightsOwnerFences/' + fenceId).get(),
      reader.doc('privacyDeletionTombstones/' + uid).get(),
    ])
    if (!userSnap?.exists || !memberSnap?.exists) return null
    const user = userSnap.data()
    const member = memberSnap.data()
    if (!record(user) || !record(member) || user.uid !== uid || member.uid !== uid
      || member.studioId !== tenant
      || (user.role !== 'owner' && user.role !== 'admin')
      || (member.role !== 'owner' && member.role !== 'creator')
      || user.disabled === true || user.revoked === true
      || member.disabled === true || member.revoked === true || member.active !== true) return null

    if (fenceSnap?.exists) {
      const fence = fenceSnap.data()
      if (!record(fence) || fence.uid !== uid
        || typeof fence.requestId !== 'string' || fence.requestId.length === 0
        || fence.active !== false || fence.permanent !== false) return null
    }
    if (tombstoneSnap?.exists) {
      const tombstone = tombstoneSnap.data()
      if (!record(tombstone) || tombstone.uid !== uid || tombstone.active !== false
        || LEASE_FIELDS.some(key => Object.hasOwn(tombstone, key))) return null
    }

    // Normalize allowable legacy omissions only AFTER policy checks; the
    // pure render resolver can therefore require explicit clear flags.
    return {
      ownerUid: uid, tenantId: tenant,
      studioUser: {uid, role: user.role, disabled: false, revoked: false},
      membership: {uid, studioId: tenant, role: member.role,
        active: true, disabled: false, revoked: false},
      ownerDeletionFenced: false,
      deletionTombstoneFenced: false,
    }
  } catch {
    // Unreachable Studio project, access denial, malformed SDK snapshot or
    // hostile getter/proxy: never fall back to claims or stale cached values.
    return null
  }
}

/** Reader binding for resolveCurrentOwnerBoundStudioRender. The injection is
 * intentionally explicit: no production credentials or cross-project setup.
 */
export function makeReadOnlyStudioAuthorityReader(reader: StudioAuthorityReader) {
  return (uid: string, tenantId: string) => readCurrentStudioAuthorityEvidence(uid, tenantId, reader)
}
