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
