import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash, randomUUID } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const region = functions.region('us-central1')
const ID = /^[A-Za-z0-9_-]{1,128}$/
const OWNER = /^[A-Za-z0-9_.:@-]{1,128}$/
const HEX64 = /^[a-f0-9]{64}$/
const CLAIM_MS = 120_000
const MAX_ATTEMPTS = 12
const PAGE_SIZE = 20
const MAX_PAGES = 20
const SCOPES = ['speech-transcript', 'acoustic-features', 'session-baseline', 'provider-session']

type JobBinding = {
  jobId: string
  ownerId: string
  sessionId: string
  sourceId: string
  providerId: string
  leaseRevision: number
  lockToken: string
  idempotencyKey: string
}
type ProviderAcknowledgement = {
  providerId: string
  sessionId: string
  sourceId: string
  idempotencyKey: string
  status: 'deleted'
  evidenceId: string
  verifiedAtMs: number
}
type TrustedPurgePorts = {
  // ONLY server-owned adapters may implement these. Never forward client JSON
  // to either port. Adapter must enforce delete-only idempotent semantics and
  // verify deletion with the provider's authoritative API or signed receipt.
  deleteProviderSession?: (request: Readonly<JobBinding>) => Promise<unknown>
  verifyProviderAcknowledgement?: (
    returned: unknown,
    request: Readonly<JobBinding>,
  ) => Promise<ProviderAcknowledgement | null>
  now?: () => number
}
function fatal(code: string): never {
  const error = new Error(code) as Error & { code?: string }
  error.code = code
  throw error
}
function codeOf(error: unknown): string {
  const value = (error as { code?: unknown })?.code
  return typeof value === 'string' && /^[A-Z_]{3,80}$/.test(value)
    ? value : 'SPEECH_PURGE_WORKER_FAILED'
}
function jobIdFor(ownerId: string, sessionId: string) {
  return createHash('sha256')
    .update('urai:speech-purge:v1\0' + ownerId + '\0' + sessionId).digest('hex')
}
function idempotencyKey(jobId: string) {
  return createHash('sha256').update('urai:speech-purge-request:v1:' + jobId).digest('hex')
}
function positiveCounter(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0
}
function noAuthority(lease: FirebaseFirestore.DocumentSnapshot, binding: JobBinding): boolean {
  return !lease.exists || lease.get('schemaVersion') !== 'urai-speech-lease-v1'
    || lease.get('ownerId') !== binding.ownerId
    || lease.get('sessionId') !== binding.sessionId
    || lease.get('sourceId') !== binding.sourceId
    || lease.get('providerId') !== binding.providerId
    || lease.get('revision') !== binding.leaseRevision
    || lease.get('active') !== false || lease.get('transcription') !== false
    || lease.get('inference') !== false || lease.get('sessionBaseline') !== false
}
function matchesJob(snapshot: FirebaseFirestore.DocumentSnapshot, binding: JobBinding) {
  return snapshot.exists
    && snapshot.get('schemaVersion') === 'urai-speech-purge-job-v1'
    && snapshot.id === binding.jobId
    && snapshot.get('purgeJobId') === binding.jobId
    && snapshot.get('ownerId') === binding.ownerId
    && snapshot.get('sessionId') === binding.sessionId
    && snapshot.get('providerId') === binding.providerId
    && snapshot.get('sourceId') === binding.sourceId
    && snapshot.get('leaseRevision') === binding.leaseRevision
    && snapshot.get('lockToken') === binding.lockToken
    && snapshot.get('state') === 'in-progress'
}
function retryDelay(attempts: number) {
  return Math.min(24 * 60 * 60_000, 15_000 * 2 ** Math.min(attempts, 10))
}

/**
 * One job claim is fenced with a random token and 120-second deadline.
 * Existing completed jobs and active claims are never resubmitted.
 * A stale claim may retry with the SAME provider idempotency key.
 * The provider adapter MUST support idempotent deletion and read-back.
 */
async function claim(jobId: string, now: number): Promise<JobBinding | null> {
  const ref = db.doc('speechProviderPurgeQueue/' + jobId)
  const untrusted = await ref.get()
  if (!untrusted.exists) return null
  const ownerId = untrusted.get('ownerId')
  const sessionId = untrusted.get('sessionId')
  const sourceId = untrusted.get('sourceId')
  const providerId = untrusted.get('providerId')
  if (typeof ownerId !== 'string' || !OWNER.test(ownerId)
    || typeof sessionId !== 'string' || !ID.test(sessionId)
    || typeof sourceId !== 'string' || !ID.test(sourceId)
    || typeof providerId !== 'string' || !ID.test(providerId)
    || jobIdFor(ownerId, sessionId) !== jobId) fatal('SPEECH_PURGE_INVALID_JOB_IDENTITY')
  const leaseRef = db.doc(`users/${ownerId}/speechPurposeLeases/${sessionId}`)
  const lockToken = randomUUID()
  const accepted = await db.runTransaction(async tx => {
    const [job, lease] = await Promise.all([tx.get(ref), tx.get(leaseRef)])
    const revision = job.get('leaseRevision')
    const binding: JobBinding = {
      jobId, ownerId, sessionId, sourceId, providerId,
      leaseRevision: revision, lockToken, idempotencyKey: idempotencyKey(jobId),
    }
    if (!positiveCounter(revision) || !matchesJobIdentity(job, binding)
      || noAuthority(lease, binding)) fatal('SPEECH_PURGE_AUTHORITY_INVALID')
    const state = job.get('state')
    if (state === 'verified') return false
    if (!['requested', 'failed', 'pending-acknowledgement', 'in-progress'].includes(state))
      fatal('SPEECH_PURGE_UNKNOWN_STATE')
    const leaseUntil = job.get('lockExpiresAtMs')
    if (state === 'in-progress' && typeof leaseUntil === 'number' && leaseUntil > now) return false
    const next = job.get('nextAttemptAtMs')
    if (state !== 'in-progress' && typeof next === 'number' && next > now) return false
    const attempts = job.get('attempts')
    if (!Number.isSafeInteger(attempts) || attempts < 0 || attempts >= MAX_ATTEMPTS) return false
    tx.update(ref, {
      state: 'in-progress', attempts: attempts + 1,
      lockToken, lockExpiresAtMs: now + CLAIM_MS,
      nextAttemptAtMs: null,
      failureCode: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    return binding
  })
  return accepted || null
}
function matchesJobIdentity(job: FirebaseFirestore.DocumentSnapshot, b: JobBinding) {
  return job.exists && job.get('schemaVersion') === 'urai-speech-purge-job-v1'
    && job.get('purgeJobId') === b.jobId
    && job.get('ownerId') === b.ownerId
    && job.get('sessionId') === b.sessionId
    && job.get('sourceId') === b.sourceId
    && job.get('providerId') === b.providerId
    && job.get('leaseRevision') === b.leaseRevision
    && Array.isArray(job.get('scopes'))
    && SCOPES.every((s, i) => job.get('scopes')[i] === s)
    && job.get('providerPurgeVerified') === false
}

/**
 * The only local deletion namespace supported by this version is the
 * server-owned per-speech-session derivatives collection. Neither arbitrary
 * user paths nor browser/storage buckets are traversed.
 *
 * Each batch rechecks the revoked lease and worker lock IN the transaction.
 * An unfamiliar or mismatched derivative blocks cleanup instead of erasing
 * somebody else's data. Producers must check current lease before writing.
 */
async function purgeLocalDerivatives(b: JobBinding) {
  const ref = db.doc('speechProviderPurgeQueue/' + b.jobId)
  const leaseRef = db.doc(`users/${b.ownerId}/speechPurposeLeases/${b.sessionId}`)
  const collection = leaseRef.collection('derivatives')
  for (let page = 0; page < MAX_PAGES; page++) {
    const remaining = await db.runTransaction(async tx => {
      const [job, lease, items] = await Promise.all([
        tx.get(ref), tx.get(leaseRef), tx.get(collection.limit(PAGE_SIZE)),
      ])
      if (!matchesJob(job, b) || noAuthority(lease, b)) fatal('SPEECH_PURGE_LOCK_LOST')
      if (items.empty) {
        tx.update(ref, {
          localCacheState: 'verified',
          localFirestorePurgedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return false
      }
      for (const item of items.docs) {
        if (item.get('ownerId') !== b.ownerId
          || item.get('sessionId') !== b.sessionId
          || item.get('sourceId') !== b.sourceId
          || item.get('providerId') !== b.providerId
          || item.get('leaseRevision') !== b.leaseRevision - 1)
          fatal('SPEECH_PURGE_FOREIGN_DERIVATIVE')
        tx.delete(item.ref)
      }
      return true
    })
    if (!remaining) return
  }
  fatal('SPEECH_PURGE_LOCAL_PAGE_BUDGET')
}

async function finish(b: JobBinding, receipt: ProviderAcknowledgement) {
  const ref = db.doc('speechProviderPurgeQueue/' + b.jobId)
  const leaseRef = db.doc(`users/${b.ownerId}/speechPurposeLeases/${b.sessionId}`)
  const evidenceDigest = createHash('sha256')
    .update(`urai:purge-evidence:v1:${receipt.providerId}:${receipt.evidenceId}:${receipt.idempotencyKey}`)
    .digest('hex')
  await db.runTransaction(async tx => {
    const [job, lease, local] = await Promise.all([
      tx.get(ref), tx.get(leaseRef), tx.get(leaseRef.collection('derivatives').limit(1)),
    ])
    if (!matchesJob(job, b) || noAuthority(lease, b)
      || job.get('localCacheState') !== 'verified' || !local.empty)
      fatal('SPEECH_PURGE_FINALIZE_AUTHORITY_INVALID')
    tx.update(ref, {
      state: 'verified', providerState: 'verified',
      providerPurgeVerified: true,
      providerEvidenceDigest: evidenceDigest,
      providerVerifiedAtMs: receipt.verifiedAtMs,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      lockToken: null, lockExpiresAtMs: null,
      nextAttemptAtMs: null, failureCode: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })
}
async function failJob(b: JobBinding, code: string, now: number) {
  const ref = db.doc('speechProviderPurgeQueue/' + b.jobId)
  await db.runTransaction(async tx => {
    const job = await tx.get(ref)
    if (!matchesJob(job, b)) return
    const attempts = job.get('attempts') as number
    tx.update(ref, {
      state: 'failed',
      providerState: 'pending',
      providerPurgeVerified: false,
      failureCode: code, nextAttemptAtMs: now + retryDelay(attempts),
      lockToken: null, lockExpiresAtMs: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })
}

/**
 * Trusted internal API only. No provider port is wired by default.
 * Returned data from the external provider is never accepted directly:
 * the second port must independently verify a provider-authoritative
 * deletion receipt/read-back and return a tightly scoped attestation.
 */
export async function processTrustedSpeechPurgeJob(
  jobId: string, ports: TrustedPurgePorts = {},
): Promise<'verified' | 'pending'> {
  if (!HEX64.test(jobId)) fatal('SPEECH_PURGE_JOB_ID_REQUIRED')
  const clock = ports.now || Date.now
  const started = clock()
  if (!Number.isSafeInteger(started) || started <= 0) fatal('SPEECH_PURGE_INVALID_CLOCK')
  const binding = await claim(jobId, started)
  if (!binding) return 'pending'
  try {
    await purgeLocalDerivatives(binding)
    if (typeof ports.deleteProviderSession !== 'function'
      || typeof ports.verifyProviderAcknowledgement !== 'function')
      fatal('SPEECH_PURGE_TRUSTED_PROVIDER_PORT_UNAVAILABLE')
    const returned = await ports.deleteProviderSession(Object.freeze({ ...binding }))
    const receipt = await ports.verifyProviderAcknowledgement(returned, Object.freeze({ ...binding }))
    if (!receipt || receipt.status !== 'deleted'
      || receipt.providerId !== binding.providerId
      || receipt.sourceId !== binding.sourceId
      || receipt.sessionId !== binding.sessionId
      || receipt.idempotencyKey !== binding.idempotencyKey
      || !ID.test(receipt.evidenceId)
      || !Number.isSafeInteger(receipt.verifiedAtMs)
      || receipt.verifiedAtMs < started - 300_000
      || receipt.verifiedAtMs > clock() + 60_000)
      fatal('SPEECH_PURGE_PROVIDER_ACK_UNVERIFIED')
    await finish(binding, receipt)
    return 'verified'
  } catch (error) {
    await failJob(binding, codeOf(error), clock())
    return 'pending'
  }
}

// Trigger and scheduler use empty, non-operational provider ports until
// an independently reviewed provider-specific adapter is registered.
// In particular they NEVER synthesize a verified provider deletion.
export const processSpeechPurgeQueueItem = region.firestore
  .document('speechProviderPurgeQueue/{jobId}')
  .onCreate(async snapshot => { await processTrustedSpeechPurgeJob(snapshot.id) })

export const retrySpeechPurgeQueue = region.pubsub
  .schedule('every 15 minutes')
  .onRun(async () => {
    // Two single-field queries need no compound index. Bound work per run.
    for (const state of ['requested', 'failed', 'pending-acknowledgement', 'in-progress']) {
      const jobs = await db.collection('speechProviderPurgeQueue')
        .where('state', '==', state).limit(10).get()
      for (const job of jobs.docs) {
        await processTrustedSpeechPurgeJob(job.id)
      }
    }
  })
