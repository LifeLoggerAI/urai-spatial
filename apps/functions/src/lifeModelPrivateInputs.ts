import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash, timingSafeEqual } from 'node:crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()
const SCHEMA = 'urai-private-life-model-inputs-v1'
const PRIVATE_REF = /^private:[A-Za-z0-9_./:-]{8,512}$/
const SOURCE_HANDLE = /^psh_[A-Za-z0-9_-]{16,256}$/
const TOKEN = /^[A-Za-z0-9._:-]{1,160}$/
const OWNER = /^[A-Za-z0-9_-]{1,128}$/
const SHA256 = /^[a-f0-9]{64}$/
const EVIDENCE = new Set(['SOURCE_CAPTURED', 'SOURCE_DERIVED', 'DIRECT_SUBJECT_TESTIMONY', 'ATTRIBUTED_TESTIMONY', 'CORROBORATED_INFERENCE', 'CONTEXTUAL_RESEARCH'])
const MAX_TRANSCRIPT_CHARS = 240000
const MAX_HANDLES = 500
const MAX_HANDLE_DELETE_BATCHES = 20

class PrivateInputError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code) }
}
function fail(code: string, status = 403): never { throw new PrivateInputError(status, code) }
function digest(value: string) { return createHash('sha256').update(value).digest('hex') }
function active(snapshot: FirebaseFirestore.DocumentSnapshot, ownerId?: string) {
  return snapshot.exists && snapshot.get('schemaVersion') === SCHEMA && snapshot.get('state') === 'current'
    && snapshot.get('synthetic') === false && snapshot.get('revokedAt') == null
    && (ownerId === undefined || snapshot.get('ownerId') === ownerId)
}
function input(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('PRIVATE_INPUT_INVALID_REQUEST', 400)
  const value = body as Record<string, unknown>
  if (Buffer.byteLength(JSON.stringify(value)) > 8192
    || Object.keys(value).some(key => !['sourceHandle', 'transcriptRef', 'provenanceRef', 'requestedPurpose', 'idempotencyKey'].includes(key))) fail('PRIVATE_INPUT_INVALID_REQUEST', 400)
  for (const field of ['sourceHandle', 'transcriptRef', 'provenanceRef', 'requestedPurpose', 'idempotencyKey']) {
    if (typeof value[field] !== 'string') fail('PRIVATE_INPUT_INVALID_REQUEST', 400)
  }
  const result = value as { sourceHandle: string; transcriptRef: string; provenanceRef: string; requestedPurpose: string; idempotencyKey: string }
  if (!SOURCE_HANDLE.test(result.sourceHandle) || !PRIVATE_REF.test(result.transcriptRef) || !PRIVATE_REF.test(result.provenanceRef)
    || result.requestedPurpose !== 'memory-index' || !/^[A-Za-z0-9._:-]{8,256}$/.test(result.idempotencyKey)) fail('PRIVATE_INPUT_INVALID_REQUEST', 400)
  return result
}
function authorize(header: unknown) {
  const secret = String(process.env.PRIVATE_SOURCE_REF_RESOLVER_TOKEN || '')
  const project = String(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '')
  if (process.env.URAI_PRIVATE_LIFE_MODEL_INPUTS_ENABLED !== 'true' || !secret.trim()
    || project !== 'urai-4dc1d' || !/^[a-f0-9]{40}$/.test(String(process.env.URAI_SOURCE_SHA || ''))) fail('PRIVATE_INPUT_RESOLVER_DISABLED', 503)
  if (typeof header !== 'string' || !timingSafeEqual(Buffer.from(digest(header), 'hex'), Buffer.from(digest(`Bearer ${secret}`), 'hex'))) fail('PRIVATE_INPUT_UNAUTHORIZED', 401)
}

async function resolveCurrent(request: ReturnType<typeof input>) {
  return db.runTransaction(async transaction => {
    // A caller never supplies an owner, database path, private object locator or source text.
    const handle = await transaction.get(db.doc(`privateLifeModelSourceHandles/${digest(request.sourceHandle)}`))
    if (!active(handle)) fail('PRIVATE_SOURCE_HANDLE_UNAVAILABLE')
    const ownerId = handle.get('ownerId'), sourceId = handle.get('sourceId')
    if (typeof ownerId !== 'string' || !OWNER.test(ownerId) || typeof sourceId !== 'string' || !TOKEN.test(sourceId)) fail('PRIVATE_SOURCE_BINDING_INVALID')
    const prefix = `users/${ownerId}`
    const [barrier, policy, provider, source, transcript, provenance] = await transaction.getAll(
      db.doc(`privateLifeModelOwnerBarriers/${digest(ownerId)}`),
      db.doc(`${prefix}/privacyPolicy/current`),
      db.doc(`${prefix}/providerConnections/openai`),
      db.doc(`${prefix}/privateLifeModelSources/${sourceId}`),
      db.doc(`${prefix}/privateLifeModelTranscripts/${digest(request.transcriptRef)}`),
      db.doc(`${prefix}/privateLifeModelProvenance/${digest(request.provenanceRef)}`),
    )
    if (barrier.get('blocked') === true) fail('PRIVATE_SOURCE_OWNER_DELETED')
    const epoch = barrier.exists ? barrier.get('epoch') : 0
    if (!Number.isSafeInteger(epoch) || epoch < 0 || handle.get('ownerDataEpoch') !== epoch) fail('PRIVATE_SOURCE_OWNER_EPOCH_CHANGED')
    if (!policy.exists || policy.get('ownerId') !== ownerId || !Number.isSafeInteger(policy.get('revision'))
      || policy.get('revision') < 1 || policy.get('enforcement.state') !== 'fully-enforced') fail('PRIVATE_SOURCE_POLICY_UNENFORCED')
    for (const domain of ['memory', 'models', 'identity']) {
      if (!['granted', 'limited'].includes(String(policy.get(`domains.${domain}.mode`)))) fail('PRIVATE_SOURCE_CONSENT_DENIED')
    }
    if (policy.get('domains.memory.modelContext') !== true || policy.get('domains.models.modelContext') !== true) fail('PRIVATE_SOURCE_MODEL_CONTEXT_DENIED')
    if (!provider.exists || provider.get('processingAllowed') !== true
      || ['requested', 'pending', 'complete'].includes(String(provider.get('revocationState')))) fail('PRIVATE_SOURCE_PROVIDER_CONSENT_DENIED')
    if (![source, transcript, provenance].every(record => active(record, ownerId))) fail('PRIVATE_SOURCE_ARTIFACT_UNAVAILABLE')
    const sourceSha256 = source.get('sourceSha256'), sourceFixityRef = source.get('sourceFixityRef')
    const sourceReceiptRef = source.get('sourceReceiptRef'), sourceEvidenceClass = source.get('sourceEvidenceClass')
    if (typeof sourceSha256 !== 'string' || !SHA256.test(sourceSha256) || !PRIVATE_REF.test(String(sourceFixityRef))
      || !PRIVATE_REF.test(String(sourceReceiptRef)) || !EVIDENCE.has(String(sourceEvidenceClass))) fail('PRIVATE_SOURCE_RECEIPT_INVALID')
    if (handle.get('sourceSha256') !== sourceSha256 || handle.get('sourceReceiptRef') !== sourceReceiptRef
      || handle.get('sourceRevision') !== source.get('revision') || !Number.isSafeInteger(source.get('revision')) || source.get('revision') < 1) fail('PRIVATE_SOURCE_RECEIPT_CHANGED')
    if (source.get('consentRevision') !== policy.get('revision') || source.get('consentState') !== 'authorized'
      || source.get('externalProcessingConsent') !== true || !Array.isArray(source.get('purposes'))
      || !source.get('purposes').includes('memory-index')) fail('PRIVATE_SOURCE_PURPOSE_NOT_AUTHORIZED')
    if (handle.get('transcriptRef') !== request.transcriptRef || handle.get('provenanceRef') !== request.provenanceRef
      || source.get('transcriptRef') !== request.transcriptRef || source.get('provenanceRef') !== request.provenanceRef
      || transcript.get('opaqueRef') !== request.transcriptRef || provenance.get('opaqueRef') !== request.provenanceRef) fail('PRIVATE_SOURCE_REF_MISMATCH')
    for (const artifact of [transcript, provenance]) {
      if (artifact.get('sourceId') !== sourceId || artifact.get('sourceSha256') !== sourceSha256
        || artifact.get('sourceReceiptRef') !== sourceReceiptRef || artifact.get('sourceRevision') !== source.get('revision')) fail('PRIVATE_SOURCE_ARTIFACT_LINEAGE_CHANGED')
    }
    const transcriptText = transcript.get('text')
    if (typeof transcriptText !== 'string' || !transcriptText.length || transcriptText.length > MAX_TRANSCRIPT_CHARS
      || Buffer.byteLength(transcriptText) > 768000 || digest(transcriptText) !== transcript.get('sha256')
      || transcript.get('sha256') !== source.get('transcriptSha256') || provenance.get('transcriptSha256') !== transcript.get('sha256')) fail('PRIVATE_SOURCE_TRANSCRIPT_FIXITY_INVALID')
    return {
      schemaVersion: SCHEMA, authorized: true, synthetic: false, ownerUid: ownerId,
      ownerDataEpoch: epoch, consentRevision: policy.get('revision'), sourceRevision: source.get('revision'),
      sourceHandle: request.sourceHandle, sourceEvidenceClass,
      transcriptRef: request.transcriptRef, provenanceRef: request.provenanceRef,
      transcriptText, transcriptSha256: transcript.get('sha256'), sourceSha256, sourceFixityRef,
      sourceReceiptRef, resolverSourceSha: String(process.env.URAI_SOURCE_SHA),
    }
  })
}

// Used only by the canonical owner-authenticated private export executor.
export async function exportPrivateLifeModelHandles(database: FirebaseFirestore.Firestore, ownerId: string) {
  if (!OWNER.test(ownerId)) fail('PRIVATE_INPUT_OWNER_INVALID', 400)
  const handles = await database.collection('privateLifeModelSourceHandles').where('ownerId', '==', ownerId).limit(MAX_HANDLES + 1).get()
  if (handles.size > MAX_HANDLES) fail('PRIVATE_INPUT_EXPORT_LIMIT', 409)
  return handles.docs.map(handle => ({ id: handle.id, ...handle.data() }))
}

// Called by the canonical owner-authenticated deletion executor before source erasure.
// Tombstones carry only hashes and prevent delayed readers/writers from reviving old handles.
export async function tombstonePrivateLifeModelInputs(database: FirebaseFirestore.Firestore, ownerId: string, timestamp: unknown) {
  if (!OWNER.test(ownerId)) fail('PRIVATE_INPUT_OWNER_INVALID', 400)
  const ownerHash = digest(ownerId), barrierRef = database.doc(`privateLifeModelOwnerBarriers/${ownerHash}`)
  await database.runTransaction(async transaction => {
    const old = await transaction.get(barrierRef)
    const epoch = old.exists ? old.get('epoch') : 0
    if (!Number.isSafeInteger(epoch) || epoch < 0 || epoch >= Number.MAX_SAFE_INTEGER) fail('PRIVATE_INPUT_OWNER_EPOCH_INVALID', 409)
    if (old.get('blocked') === true) return
    transaction.set(barrierRef, { schemaVersion: SCHEMA, ownerHash, epoch: epoch + 1, blocked: true, tombstonedAt: timestamp })
  })
  let handlesTombstoned = 0
  // A committed batch removes ownerId from every matched handle. Querying again
  // advances over remaining records without relying on a mutable cursor.
  for (let page = 0; page < MAX_HANDLE_DELETE_BATCHES; page++) {
    const handles = await database.collection('privateLifeModelSourceHandles').where('ownerId', '==', ownerId).limit(MAX_HANDLES).get()
    if (!handles.size) return { ownerHash, handlesTombstoned }
    const batch = database.batch()
    for (const handle of handles.docs) {
      if (handle.get('ownerId') !== ownerId) fail('PRIVATE_INPUT_DELETE_OWNER_MISMATCH', 409)
      batch.set(handle.ref, { schemaVersion: SCHEMA, state: 'revoked', ownerHash, tombstonedAt: timestamp })
    }
    await batch.commit()
    handlesTombstoned += handles.size
  }
  const remaining = await database.collection('privateLifeModelSourceHandles').where('ownerId', '==', ownerId).limit(1).get()
  if (remaining.size) fail('PRIVATE_INPUT_DELETE_LIMIT', 409)
  return { ownerHash, handlesTombstoned }
}

export const resolveLifeModelPrivateInputs = functions.region('us-central1').runWith({
  secrets: ['PRIVATE_SOURCE_REF_RESOLVER_TOKEN'], timeoutSeconds: 30, memory: '256MB',
}).https.onRequest(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store, max-age=0')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.status(405).json({ authorized: false, code: 'PRIVATE_INPUT_METHOD_NOT_ALLOWED' }); return }
  if (request.path !== '/' && request.path !== '/resolve-life-model-inputs') { response.status(404).json({ authorized: false, code: 'PRIVATE_INPUT_NOT_FOUND' }); return }
  try {
    authorize(request.headers.authorization)
    const requested = input(request.body)
    const resolved = await resolveCurrent(requested)
    // A second fresh snapshot closes changes during the first read before private bytes are sent.
    const current = await resolveCurrent(requested)
    if (JSON.stringify(current) !== JSON.stringify(resolved)) fail('PRIVATE_SOURCE_AUTHORITY_CHANGED', 409)
    response.status(200).json(current)
  } catch (error) {
    const code = error instanceof PrivateInputError ? error.code : 'PRIVATE_INPUT_RESOLUTION_FAILED'
    // Error text and database paths may contain private content; only fixed codes are emitted.
    console.warn(JSON.stringify({ event: 'life-model.private-input-denied', code }))
    response.status(error instanceof PrivateInputError ? error.status : 503).json({ authorized: false, code })
  }
})
