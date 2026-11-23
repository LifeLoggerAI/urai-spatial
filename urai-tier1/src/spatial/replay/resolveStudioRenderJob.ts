/**
 * R1685 HOLD - read-only, server-side Spatial Memory -> Studio Jobs reference.
 *
 * This resolves a *reference*, never authorization or a playable URL. Callers
 * must inject independently authenticated, server-owned readers. There is no
 * production reader registration, HTTP route, consent issuer, or write path.
 * A client-supplied jobId, tenantId, ownerId, or consent receipt is not input.
 */

export type SpatialRenderSelection = { memoryId: string; manifestId: string }

export type VerifiedTenantSession = { uid: string; tenantId: string }
export type OwnerMemory = {
  id: string
  ownerId: string
  demo: boolean
  deleted: boolean
  replayManifest: { id: string; version: number }
}
export type CurrentMemoryAdmission = {
  ownerUid: string
  memoryId: string
  consentState: 'allowed' | 'denied' | 'pending'
  deletionFenced: boolean
}
export type CanonicalRenderBinding = {
  sourceSystem: 'urai-jobs'
  ownerUid: string
  tenantId: string
  memoryId: string
  manifestId: string
  manifestVersion: number
  jobId: string
  renderPlanDigest: string
  decisionReceiptId: string
  revoked: boolean
}
export type CurrentCanonicalRenderGrant = {
  issuer: 'urai-privacy'
  ownerUid: string
  tenantId: string
  purpose: 'life-movie.render'
  policyVersion: '1.1.0'
  decisionReceiptId: string
  status: 'granted' | 'denied' | 'pending'
  revoked: boolean
}
export type BoundJobsRender = {
  jobId: string
  ownerUid: string
  tenantId: string
  sourceSystem: 'urai-studio'
  jobType: 'studio.render.video'
  status: string
  renderPlanDigest: string
  consent: { purpose: string; policyVersion: string; decisionReceiptId: string }
  outputDeleted: boolean
}

/**
 * Reader implementations are deliberately NOT supplied in this PR. A trusted
 * issuer and canonical memory/job binding have not been independently approved.
 * A production adapter must validate: revoked Firebase token + Studio tenant
 * membership; authoritative current Memory/Privacy; immutable Jobs-issued
 * memory/manifest binding; current independent Privacy grant; owner-bound
 * Jobs status (without issuing any media URL).
 */
export type TrustedStudioRenderReaders = {
  currentVerifiedTenantSession(): Promise<VerifiedTenantSession | null>
  readOwnerMemory(uid: string, memoryId: string): Promise<OwnerMemory | null>
  readCurrentMemoryAdmission(uid: string, memoryId: string): Promise<CurrentMemoryAdmission | null>
  readCanonicalRenderBinding(uid: string, memoryId: string, manifestId: string): Promise<CanonicalRenderBinding | null>
  readCurrentCanonicalRenderGrant(uid: string, tenantId: string, receiptId: string): Promise<CurrentCanonicalRenderGrant | null>
  readBoundJobsRender(tenantId: string, uid: string, jobId: string): Promise<BoundJobsRender | null>
}

export type StudioJobResolution =
  | { status: 'unavailable' }
  | { status: 'reference-only'; jobId: string; memoryId: string; manifestId: string }

const unavailable: StudioJobResolution = Object.freeze({ status: 'unavailable' })
const MEMORY_ID = /^[A-Za-z0-9._:-]{1,120}$/
const TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const JOB_ID = /^[A-Za-z0-9_-]{10,64}$/
const DIGEST = /^[a-f0-9]{64}$/

function record(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function selectionOf(value: unknown): SpatialRenderSelection | null {
  if (!record(value)) return null
  const keys = Reflect.ownKeys(value)
  if (keys.length !== 2 || !keys.includes('memoryId') || !keys.includes('manifestId')) return null
  // Reject untrusted accessors without invoking their code. Source identity is
  // parsed as inert data; a claimed job or tenant is never an accepted input.
  const fields = Object.getOwnPropertyDescriptors(value)
  if (!fields.memoryId?.enumerable || !fields.manifestId?.enumerable
    || !Object.hasOwn(fields.memoryId, 'value') || !Object.hasOwn(fields.manifestId, 'value')) return null
  const memoryId = fields.memoryId.value
  const manifestId = fields.manifestId.value
  if (typeof memoryId !== 'string' || !MEMORY_ID.test(memoryId) || memoryId.startsWith('demo:')) return null
  if (typeof manifestId !== 'string' || !MEMORY_ID.test(manifestId) || manifestId.startsWith('demo:')) return null
  return { memoryId, manifestId }
}

function sessionMatches(value: VerifiedTenantSession | null): value is VerifiedTenantSession {
  return Boolean(value && typeof value.uid === 'string' && TENANT_ID.test(value.uid)
    && typeof value.tenantId === 'string' && TENANT_ID.test(value.tenantId))
}

function admissionMatches(admission: CurrentMemoryAdmission | null, uid: string, memoryId: string): boolean {
  return Boolean(admission && admission.ownerUid === uid && admission.memoryId === memoryId
    && admission.consentState === 'allowed' && admission.deletionFenced === false)
}

function grantMatches(grant: CurrentCanonicalRenderGrant | null, session: VerifiedTenantSession, receipt: string): boolean {
  return Boolean(grant && grant.issuer === 'urai-privacy' && grant.ownerUid === session.uid
    && grant.tenantId === session.tenantId && grant.purpose === 'life-movie.render'
    && grant.policyVersion === '1.1.0' && grant.decisionReceiptId === receipt
    && grant.status === 'granted' && grant.revoked === false)
}

/**
 * Read-only orchestration. Failure is indistinguishable for unknown, foreign,
 * deleted, revoked and incomplete jobs; it never leaks existence across owners.
 * Even a reference-only result MUST go through Studio's freshly authenticated
 * playback API and Jobs' current consent/deletion/signing checks.
 */
function memoryMatches(
  memory: OwnerMemory | null, uid: string, selected: SpatialRenderSelection, version?: number,
): memory is OwnerMemory {
  return Boolean(memory && memory.ownerId === uid && memory.id === selected.memoryId
    && memory.demo === false && memory.deleted === false
    && memory.replayManifest?.id === selected.manifestId
    && Number.isSafeInteger(memory.replayManifest.version) && memory.replayManifest.version > 0
    && (version === undefined || memory.replayManifest.version === version))
}

function bindingMatches(
  binding: CanonicalRenderBinding | null, uid: string, tenantId: string,
  selected: SpatialRenderSelection, version: number,
): binding is CanonicalRenderBinding {
  return Boolean(binding && binding.sourceSystem === 'urai-jobs' && binding.revoked === false
    && binding.ownerUid === uid && binding.tenantId === tenantId
    && binding.memoryId === selected.memoryId && binding.manifestId === selected.manifestId
    && binding.manifestVersion === version && JOB_ID.test(binding.jobId)
    && DIGEST.test(binding.renderPlanDigest) && DIGEST.test(binding.decisionReceiptId))
}

function jobMatches(job: BoundJobsRender | null, jobId: string, uid: string,
  tenantId: string, plan: string, receipt: string): boolean {
  return Boolean(job && job.jobId === jobId && job.ownerUid === uid
    && job.tenantId === tenantId && job.sourceSystem === 'urai-studio'
    && job.jobType === 'studio.render.video' && job.status === 'SUCCESS'
    && job.outputDeleted === false && job.renderPlanDigest === plan
    && job.consent?.purpose === 'life-movie.render' && job.consent.policyVersion === '1.1.0'
    && job.consent.decisionReceiptId === receipt)
}

export async function resolveStudioRenderJob(
  untrustedSelection: unknown,
  readers: TrustedStudioRenderReaders,
): Promise<StudioJobResolution> {
  try {
    const selected = selectionOf(untrustedSelection)
    if (!selected) return unavailable

    const session = await readers.currentVerifiedTenantSession()
    if (!sessionMatches(session)) return unavailable
    // Capture immutable identity scalars. An upstream reader may reuse and
    // mutate its session object while awaits are pending.
    const uid = session.uid, tenantId = session.tenantId
    const memory = await readers.readOwnerMemory(uid, selected.memoryId)
    if (!memoryMatches(memory, uid, selected)) return unavailable
    const manifestVersion = memory.replayManifest.version

    const admission = await readers.readCurrentMemoryAdmission(uid, selected.memoryId)
    if (!admissionMatches(admission, uid, selected.memoryId)) return unavailable

    // The binding MUST be independently authenticated, immutable and server
    // owned. Its sourceSystem label alone is not issuer/provenance evidence.
    const binding = await readers.readCanonicalRenderBinding(uid, selected.memoryId, selected.manifestId)
    if (!bindingMatches(binding, uid, tenantId, selected, manifestVersion)) return unavailable
    const { jobId, renderPlanDigest, decisionReceiptId } = binding

    const grant = await readers.readCurrentCanonicalRenderGrant(uid, tenantId, decisionReceiptId)
    if (!grantMatches(grant, { uid, tenantId }, decisionReceiptId)) return unavailable

    const job = await readers.readBoundJobsRender(tenantId, uid, jobId)
    if (!jobMatches(job, jobId, uid, tenantId, renderPlanDigest, decisionReceiptId)) return unavailable

    // Long-running reads can outlive manifest edits, binding revocation, Jobs
    // deletion, Privacy revocation, or a changed Firebase/tenant session.
    // Revalidate the entire read-only join. This still does NOT authorize a
    // playback URL: Studio and Jobs must enforce their own current checks.
    const lastMemory = await readers.readOwnerMemory(uid, selected.memoryId)
    if (!memoryMatches(lastMemory, uid, selected, manifestVersion)) return unavailable
    const lastBinding = await readers.readCanonicalRenderBinding(uid, selected.memoryId, selected.manifestId)
    if (!bindingMatches(lastBinding, uid, tenantId, selected, manifestVersion)
      || lastBinding.jobId !== jobId || lastBinding.renderPlanDigest !== renderPlanDigest
      || lastBinding.decisionReceiptId !== decisionReceiptId) return unavailable
    const lastJob = await readers.readBoundJobsRender(tenantId, uid, jobId)
    if (!jobMatches(lastJob, jobId, uid, tenantId, renderPlanDigest, decisionReceiptId)) return unavailable
    const lastAdmission = await readers.readCurrentMemoryAdmission(uid, selected.memoryId)
    if (!admissionMatches(lastAdmission, uid, selected.memoryId)) return unavailable
    const lastGrant = await readers.readCurrentCanonicalRenderGrant(uid, tenantId, decisionReceiptId)
    if (!grantMatches(lastGrant, { uid, tenantId }, decisionReceiptId)) return unavailable
    const lastSession = await readers.currentVerifiedTenantSession()
    if (!sessionMatches(lastSession) || lastSession.uid !== uid || lastSession.tenantId !== tenantId) return unavailable

    return { status: 'reference-only', jobId, memoryId: selected.memoryId, manifestId: selected.manifestId }
  } catch {
    return unavailable
  }
}
