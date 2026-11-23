/**
 * R1709 HOLD - pure read-only check for a future PROTECTED-SERVER provenance join.
 *
 * The objects below MUST originate from separate, currently authenticated
 * server authorities, not client JSON, a Studio public-safe status response,
 * or unverified Firestore documents. In particular, a sourceSystem/issuer/
 * authority label is NOT cryptographic or administrative provenance proof.
 *
 * There is NO registered Memory -> Jobs binding writer or approved canonical
 * life-movie.render issuer. This helper is not wired into an HTTP route or UI.
 * A candidate is NEVER a permission, media capability, signed URL, or GO.
 */

type Resolution = { status: 'unavailable'; reason: string } | {
  status: 'candidate'; tenantId: string; jobId: string
}

export type OwnerBoundStudioRenderEvidence = {
  authenticatedOwnerUid: unknown
  activeStudioTenantId: unknown
  currentStudioAuthority: unknown
  selectedMemory: unknown
  protectedBinding: unknown
  currentJobsReadback: unknown
  currentRenderConsent: unknown
  ownerDeletionFenced: unknown
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const JOB = /^[A-Za-z0-9_-]{10,64}$/
const HASH = /^[a-f0-9]{64}$/
const valid = (v: unknown, regex = ID): v is string => typeof v === 'string' && regex.test(v)
const deny = (reason: string): Resolution => ({ status: 'unavailable', reason })

function dataRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return false
  // Accessors and symbol properties are not accepted as authority-bearing
  // inert data. This check never invokes a getter.
  return Reflect.ownKeys(value).every(key => {
    if (typeof key !== 'string') return false
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return Boolean(descriptor && Object.hasOwn(descriptor, 'value'))
  })
}

/** A normalized, independently verified snapshot of the server-owned
 * Studio users/memberships and BOTH deletion fences. Raw records, client claims
 * and Studio's public-safe job status must not be supplied here. This pure
 * shape check is NOT a replacement for Studio's requireStudioLongformAuth.
 */
function studioAuthorityMatches(value: unknown, uid: string, tenant: string): boolean {
  if (!dataRecord(value) || value.ownerUid !== uid || value.tenantId !== tenant
    || value.ownerDeletionFenced !== false || value.deletionTombstoneFenced !== false) return false
  const user = value.studioUser
  const member = value.membership
  return dataRecord(user) && dataRecord(member)
    && user.uid === uid && (user.role === 'owner' || user.role === 'admin')
    && user.disabled === false && user.revoked === false
    && member.uid === uid && member.studioId === tenant
    && (member.role === 'owner' || member.role === 'creator')
    && member.active === true && member.disabled === false && member.revoked === false
}

/**
 * Pure consistency check. Caller must independently verify the authenticity,
 * freshness, source and owner of EACH input BEFORE invoking this function and
 * must recheck fresh authorization at the eventual Studio/Jobs playback API.
 */
export function resolveOwnerBoundStudioRender(input: OwnerBoundStudioRenderEvidence): Resolution {
  try {
    if (!dataRecord(input) || !valid(input.authenticatedOwnerUid)
      || !valid(input.activeStudioTenantId)) return deny('current_identity_required')
    if (input.ownerDeletionFenced !== false) return deny('current_authority_unavailable')

    const uid = input.authenticatedOwnerUid
    const tenant = input.activeStudioTenantId
    if (!studioAuthorityMatches(input.currentStudioAuthority, uid, tenant)) {
      return deny('studio_current_membership_required')
    }
    const memory = input.selectedMemory
    const binding = input.protectedBinding
    const job = input.currentJobsReadback
    const grant = input.currentRenderConsent
    if (!dataRecord(memory) || !dataRecord(binding) || !dataRecord(job)
      || !dataRecord(grant)) return deny('verified_provenance_missing')

    const manifest = memory.replayManifest
    if (!valid(memory.id) || !valid(memory.ownerId)
      || memory.ownerId !== uid || memory.demo !== false || memory.deleted !== false
      || !dataRecord(manifest) || !valid(manifest.id)
      || !Number.isSafeInteger(manifest.version) || (manifest.version as number) < 1) {
      return deny('memory_not_eligible')
    }

    if (binding.authority !== 'protected-server-record'
      || binding.sourceSystem !== 'urai-jobs' || binding.revoked !== false
      || binding.jobType !== 'studio.render.video' || !valid(binding.jobId, JOB)
      || !valid(binding.renderPlanDigest, HASH) || !valid(binding.decisionReceiptId, HASH)
      || binding.ownerUid !== uid || binding.tenantId !== tenant
      || binding.memoryId !== memory.id || binding.replayManifestId !== manifest.id
      || binding.manifestVersion !== manifest.version) return deny('protected_binding_invalid')

    if (grant.issuer !== 'urai-privacy' || grant.ownerUid !== uid
      || grant.tenantId !== tenant || grant.purpose !== 'life-movie.render'
      || grant.policyVersion !== '1.1.0' || grant.decisionReceiptId !== binding.decisionReceiptId
      || grant.status !== 'granted' || grant.revoked !== false) {
      return deny('canonical_render_consent_unavailable')
    }

    // Studio/Jobs public status intentionally strips sourceSystem, consent and
    // provenance. That reduced projection MUST NOT be upgraded to authority.
    const jobConsent = job.consent
    const jobOutput = job.output
    if (!dataRecord(jobConsent) || !dataRecord(jobOutput)
      || job.sourceSystem !== 'urai-studio' || job.jobId !== binding.jobId
      || job.ownerUid !== uid || job.tenantId !== tenant
      || job.jobType !== 'studio.render.video' || job.status !== 'SUCCESS'
      || job.outputDeletedAt != null
      || jobOutput.renderPlanDigest !== binding.renderPlanDigest
      || jobConsent.purpose !== 'life-movie.render' || jobConsent.policyVersion !== '1.1.0'
      || jobConsent.decisionReceiptId !== binding.decisionReceiptId) {
      return deny('render_job_not_authoritative')
    }

    return { status: 'candidate', tenantId: tenant, jobId: binding.jobId }
  } catch {
    // Inaccessible getters, Proxy traps or malformed objects must fail closed.
    return deny('authority_unavailable')
  }
}

/** R1710 review-only read orchestration; no live adapter or issuer registered.
 * Implementations MUST independently verify identity, Studio tenant membership,
 * original Firebase token revocation, Jobs-issued protected provenance, and
 * Privacy's current APPROVED render grant. No client-provided binding objects.
 */
export type VerifiedRenderReaders = Readonly<{
  currentVerifiedIdentity(): Promise<{uid: string; tenantId: string} | null>
  /** Caller must use current, server-owned Studio user + membership + fences.
   * Do not substitute browser JWT role claims or sanitized job status. */
  readCurrentStudioAuthority(uid: string, tenantId: string): Promise<unknown>
  readOwnerMemory(uid: string, memoryId: string, manifestId: string): Promise<unknown>
  readProtectedBinding(uid: string, tenantId: string, memoryId: string, manifestId: string): Promise<unknown>
  readCurrentRenderGrant(uid: string, tenantId: string, receiptId: string): Promise<unknown>
  readOwnerDeletionFence(uid: string): Promise<boolean | null>
  readBoundJobsRecord(uid: string, tenantId: string, jobId: string): Promise<unknown>
}>

function selectedIds(value: unknown): {memoryId: string; manifestId: string} | null {
  if (!dataRecord(value)) return null
  const fields = Object.keys(value)
  if (fields.length !== 2 || !fields.includes('memoryId') || !fields.includes('manifestId')) return null
  const { memoryId, manifestId } = value
  if (!valid(memoryId) || !valid(manifestId) || memoryId.startsWith('demo:')
    || manifestId.startsWith('demo:')) return null
  return {memoryId, manifestId}
}

async function readVerifiedJoin(
  readers: VerifiedRenderReaders,
  ownerUid: string,
  tenantId: string,
  ids: {memoryId: string; manifestId: string},
): Promise<{candidate: Extract<Resolution, {status:'candidate'}>; stamp: string} | null> {
  const studioAuthority = await readers.readCurrentStudioAuthority(ownerUid, tenantId)
  if (!studioAuthorityMatches(studioAuthority, ownerUid, tenantId)) return null
  const memory = await readers.readOwnerMemory(ownerUid, ids.memoryId, ids.manifestId)
  // A trusted reader must return the EXACT requested selection. Otherwise
  // internally consistent records for another Memory Star could be promoted
  // into a candidate for the wrong Focus selection (confused deputy).
  if (!dataRecord(memory) || memory.id !== ids.memoryId || memory.ownerId !== ownerUid) return null
  const manifest = memory.replayManifest
  if (!dataRecord(manifest) || manifest.id !== ids.manifestId) return null

  // These records MUST be returned from trusted protected-server providers,
  // not from a JSON body or Studio's deliberately sanitized status endpoint.
  const binding = await readers.readProtectedBinding(ownerUid, tenantId, ids.memoryId, ids.manifestId)
  if (!dataRecord(binding) || !valid(binding.jobId, JOB)
    || !valid(binding.decisionReceiptId, HASH)) return null
  const grant = await readers.readCurrentRenderGrant(ownerUid, tenantId, binding.decisionReceiptId)
  if (!dataRecord(grant)) return null
  const fenced = await readers.readOwnerDeletionFence(ownerUid)
  if (fenced !== false) return null
  const job = await readers.readBoundJobsRecord(ownerUid, tenantId, binding.jobId)
  if (!dataRecord(job) || !dataRecord(job.output) || !dataRecord(job.consent)) return null

  const candidate = resolveOwnerBoundStudioRender({
    authenticatedOwnerUid: ownerUid, activeStudioTenantId: tenantId,
    currentStudioAuthority: studioAuthority,
    selectedMemory: memory, protectedBinding: binding,
    currentJobsReadback: job, currentRenderConsent: grant,
    ownerDeletionFenced: fenced,
  })
  if (candidate.status !== 'candidate') return null
  // Capture immutable scalar evidence BEFORE the next awaited read. Never
  // compare live object references (upstream readers may reuse/mutate them).
  const roleEvidence = studioAuthority as Record<string, unknown>
  if (!dataRecord(roleEvidence.studioUser) || !dataRecord(roleEvidence.membership)) return null
  const stamp = JSON.stringify([
    ownerUid, tenantId, ids.memoryId, ids.manifestId,
    roleEvidence.studioUser.role, roleEvidence.membership.role,
    manifest.version, binding.jobId, binding.renderPlanDigest,
    binding.decisionReceiptId, job.status, job.output.renderPlanDigest,
    job.consent.decisionReceiptId, grant.status, grant.revoked,
  ])
  return { candidate, stamp }
}

/** A candidate is never playback authorization. Studio and Jobs must still
 * re-check the original actor, purpose and deletion fences at media delivery.
 * This exported helper performs no network access unless an authorized host
 * explicitly supplies reviewed readers; none are provided in this draft.
 */
export async function resolveCurrentOwnerBoundStudioRender(
  untrustedSelection: unknown,
  readers: VerifiedRenderReaders,
): Promise<Resolution> {
  try {
    const ids = selectedIds(untrustedSelection)
    if (!ids) return deny('current_authority_unavailable')
    const firstIdentity = await readers.currentVerifiedIdentity()
    if (!dataRecord(firstIdentity) || !valid(firstIdentity.uid)
      || !valid(firstIdentity.tenantId)) return deny('current_authority_unavailable')
    const uid = firstIdentity.uid
    const tenant = firstIdentity.tenantId

    const first = await readVerifiedJoin(readers, uid, tenant, ids)
    if (!first) return deny('current_authority_unavailable')
    const last = await readVerifiedJoin(readers, uid, tenant, ids)
    if (!last || last.stamp !== first.stamp
      || last.candidate.jobId !== first.candidate.jobId) return deny('current_authority_unavailable')
    const finalIdentity = await readers.currentVerifiedIdentity()
    if (!dataRecord(finalIdentity) || finalIdentity.uid !== uid
      || finalIdentity.tenantId !== tenant) return deny('current_authority_unavailable')

    return first.candidate
  } catch {
    return deny('current_authority_unavailable')
  }
}
