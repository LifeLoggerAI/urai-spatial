/**
 * R1716 HOLD: an inert, read-only projection of one existing Jobs render record.
 *
 * This is NOT the missing Memory/manifest -> Jobs provenance issuer. Jobs #538
 * persists Studio project/scene-truth and idempotency bindings, but these do
 * NOT bind a Spatial Memory Star plus its manifest version to the render job.
 * A future caller MUST obtain jobId ONLY from a separately approved,
 * immutable, server-authenticated canonical Memory binding and must use a
 * Jobs-project server reader with independently verified credentials. Never
 * pass a jobId read from the browser or a Studio public-safe status response.
 *
 * No default SDK, credential, HTTP route, writer, GCS client, signer or grant.
 */

type Snapshot = { exists: boolean; data(): Record<string, unknown> | undefined }
export type ProtectedJobsReader = { doc(path: string): { get(): Promise<Snapshot> } }
export type ReadOnlyJobsMovieRecord = {
  jobId: string
  ownerUid: string
  tenantId: string
  sourceSystem: 'urai-studio'
  jobType: 'studio.render.video'
  status: 'SUCCESS'
  outputDeletedAt: null
  output: { renderPlanDigest: string }
  consent: {
    purpose: 'life-movie.render'
    policyVersion: '1.1.0'
    decisionReceiptId: string
  }
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/
const JOB_ID = /^[A-Za-z0-9_-]{10,64}$/
const SHA256 = /^[a-f0-9]{64}$/
const RECEIPT = /^str_[A-Za-z0-9_-]{16,64}_[a-z0-9]{8,16}_[A-Za-z0-9_-]{40,64}$/

function dataRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) return false
  return Reflect.ownKeys(value).every(key => {
    if (typeof key !== 'string') return false
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return Boolean(descriptor && Object.hasOwn(descriptor, 'value'))
  })
}

function containsScopedVideoArtifact(
  artifacts: unknown, tenant: string, project: string,
): boolean {
  if (!Array.isArray(artifacts) || !artifacts.length || artifacts.length > 24) return false
  return artifacts.some(artifact => {
    if (!dataRecord(artifact) || artifact.kind !== 'mp4'
      || artifact.mimeType !== 'video/mp4' || typeof artifact.ref !== 'string') return false
    const uri = artifact.ref
    if (!uri.startsWith('gs://')) return false
    const raw = uri.slice(5)
    const slash = raw.indexOf('/')
    if (slash < 3) return false
    const bucket = raw.slice(0, slash)
    const objectName = raw.slice(slash + 1)
    // This is NOT an allowed-bucket IAM check. Jobs' signedMovieAccess is
    // the only signing policy and must separately check the active allowlist.
    return /^[a-z0-9][a-z0-9._-]+[a-z0-9]$/.test(bucket)
      && objectName.startsWith(`tenants/${tenant}/life-movies/${project}/`)
      && objectName.length > `tenants/${tenant}/life-movies/${project}/`.length
      && !objectName.includes('..') && !objectName.includes('\\')
  })
}

/**
 * Read only the JOBS-issued job document from its canonical jobs/{jobId} path.
 * Output is redacted; it cannot be used as a grant or final delivery authority.
 * 
 * The signed-media service MUST separately reverify the original Firebase
 * actor, Studio membership, canonical Privacy render permission, current
 * owner deletion state, job state, signed object scope and URL lifetime.
 */
export async function readProtectedJobsMovieRecord(
  verifiedOwnerUid: unknown, verifiedTenantId: unknown, serverBoundJobId: unknown,
  reader: ProtectedJobsReader,
): Promise<ReadOnlyJobsMovieRecord | null> {
  if (typeof verifiedOwnerUid !== 'string' || !ID.test(verifiedOwnerUid)
    || typeof verifiedTenantId !== 'string' || !ID.test(verifiedTenantId)
    || typeof serverBoundJobId !== 'string' || !JOB_ID.test(serverBoundJobId)) return null
  const uid = verifiedOwnerUid
  const tenant = verifiedTenantId
  const id = serverBoundJobId
  try {
    const snapshot = await reader.doc(`jobs/${id}`).get()
    if (!snapshot.exists) return null
    const job = snapshot.data()
    if (!dataRecord(job) || !dataRecord(job.payload)
      || !dataRecord(job.output) || !dataRecord(job.consent)) return null
    const payload = job.payload
    const output = job.output
    const consent = job.consent
    if (job.jobId !== id || job.ownerUid !== uid || job.tenantId !== tenant
      || job.sourceSystem !== 'urai-studio' || job.sourceProject !== 'urai-studio'
      || job.jobType !== 'studio.render.video' || job.type !== 'studio.render.video'
      || job.status !== 'SUCCESS' || job.outputDeletedAt != null
      || payload.schemaVersion !== 'urai-life-movie-render-v1'
      || typeof payload.projectId !== 'string' || !ID.test(payload.projectId)
      || typeof payload.renderPlanDigest !== 'string' || !SHA256.test(payload.renderPlanDigest)
      || output.renderPlanDigest !== payload.renderPlanDigest
      || typeof payload.sceneTruthReceiptRef !== 'string' || !RECEIPT.test(payload.sceneTruthReceiptRef)
      || typeof payload.sceneTruthDigest !== 'string' || !SHA256.test(payload.sceneTruthDigest)
      || payload.providerGenerationAuthorized !== false
      || payload.publicReleaseAuthorized !== false || payload.spatialRequired !== false
      || consent.purpose !== 'life-movie.render' || consent.policyVersion !== '1.1.0'
      || typeof consent.decisionReceiptId !== 'string' || !SHA256.test(consent.decisionReceiptId)
      || !containsScopedVideoArtifact(output.outputs, tenant, payload.projectId)) return null

    // Do NOT surface raw job payload, source paths, GCS refs or output metadata.
    return {
      jobId: id, ownerUid: uid, tenantId: tenant,
      sourceSystem: 'urai-studio', jobType: 'studio.render.video',
      status: 'SUCCESS', outputDeletedAt: null,
      output: { renderPlanDigest: payload.renderPlanDigest },
      consent: { purpose: 'life-movie.render', policyVersion: '1.1.0',
        decisionReceiptId: consent.decisionReceiptId },
    }
  } catch {
    return null
  }
}

/** Only an approved server host may inject its Jobs Firestore reader. */
export function makeReadOnlyJobsMovieReader(reader: ProtectedJobsReader) {
  return (uid: string, tenantId: string, jobId: string) =>
    readProtectedJobsMovieRecord(uid, tenantId, jobId, reader)
}
