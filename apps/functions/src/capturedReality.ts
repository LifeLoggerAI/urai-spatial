import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { createHash, randomBytes } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { isCanonicalStoredPolicy } from './consentPolicyAuthority'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const RUNTIME_URL_TTL_MS = 10 * 60 * 1000
const PRIVATE_CAPTURE_PREFIX = 'private-captured-reality'
const CAPTURED_REALITY_REGION = 'us-central1'
const capturedRealityFunctions = functions.region(CAPTURED_REALITY_REGION)

function requireUid(context: functions.https.CallableContext) {
  const uid = context.auth?.uid
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.')
  return uid
}

function requireToken(value: unknown, label: string, max = 128) {
  const token = String(value ?? '').trim()
  if (!token || token.length > max || !/^[A-Za-z0-9._-]+$/.test(token)) {
    throw new functions.https.HttpsError('invalid-argument', `${label} is invalid.`)
  }
  return token
}

function capturedRealityEnabled() {
  return process.env.URAI_ENABLE_CAPTURED_REALITY === 'true'
}

function capturedRealityProofEnabled() {
  return process.env.URAI_ENABLE_CAPTURED_REALITY_PROOF === 'true'
}

const sha = (value: string) => createHash('sha256').update(value).digest('hex')
const SHA256 = /^[a-f0-9]{64}$/

async function requireCurrentOwner(uid: string, bearer: string, expectedCreationTime?: string) {
  let token: admin.auth.DecodedIdToken, account: admin.auth.UserRecord
  try {
    token = await admin.auth().verifyIdToken(bearer, true)
    account = await admin.auth().getUser(uid)
  } catch { throw new functions.https.HttpsError('unauthenticated', 'Current authentication is required.') }
  if (token.uid !== uid || account.uid !== uid || account.disabled || !account.metadata.creationTime
    || (expectedCreationTime && account.metadata.creationTime !== expectedCreationTime)) {
    throw new functions.https.HttpsError('permission-denied', 'Current captured-place owner is required.')
  }
  return { token, creationTime: account.metadata.creationTime }
}

async function requireCallableOwner(context: functions.https.CallableContext) {
  const uid = requireUid(context)
  const bearer = context.rawRequest?.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!bearer) throw new functions.https.HttpsError('unauthenticated', 'Current authentication is required.')
  const current = await requireCurrentOwner(uid, bearer)
  return { uid, bearer, creationTime: current.creationTime, expiresAt: current.token.exp * 1000 }
}

async function requireLocationRuntimeConsent(uid: string, transaction: FirebaseFirestore.Transaction) {
  const [user, policy, runtime, local, central, permanent, barrier, memoryBlock, locationBlock] = await Promise.all([
    transaction.get(db.doc(`users/${uid}`)),
    transaction.get(db.doc(`users/${uid}/privacyPolicy/current`)),
    transaction.get(db.doc(`users/${uid}/privacyRuntime/location-collection`)),
    transaction.get(db.doc(`users/${uid}/privacyRuntime/exportAuthority`)),
    transaction.get(db.doc(`privacyDeletionTombstones/${uid}`)),
    transaction.get(db.doc(`uraiPrivateLifeModelOwnerFences/${sha(uid)}`)),
    transaction.get(db.doc(`privateLifeModelOwnerBarriers/${sha(uid)}`)),
    transaction.get(db.doc(`jobConsentBlocks/${sha(uid + '\n' + 'memory.storage')}`)),
    transaction.get(db.doc(`jobConsentBlocks/${sha(uid + '\n' + 'location.context')}`)),
  ])
  const p = policy.data()
  const pending = local.get('pendingDeletions')
  const generation = local.exists ? local.get('generation') : 0
  if (!user.exists || user.get('deleted') === true || ['deleting','deleted','disabled'].includes(String(user.get('accountStatus')))
    || !policy.exists || !isCanonicalStoredPolicy(p, uid) || p.revision < 1 || p.enforcement.state !== 'fully-enforced'
    || !['granted','limited'].includes(p.domains.memory.mode) || !['granted','limited'].includes(p.domains.location.mode)
    || !runtime.exists || runtime.get('enabled') !== true
    || !Number.isSafeInteger(generation) || generation < 0 || (local.exists && (!pending || typeof pending !== 'object' || Array.isArray(pending)))
    || (pending && Object.keys(pending).length > 0) || barrier.get('blocked') === true) {
    throw new functions.https.HttpsError('permission-denied', 'CAPTURED_REALITY_MEMORY_AND_LOCATION_CONSENT_REQUIRED')
  }
  if (permanent.exists && (permanent.get('ownerHash') !== sha(uid) || permanent.get('deleted') !== false || permanent.get('deletionEpoch') !== 0)) {
    throw new functions.https.HttpsError('permission-denied', 'CAPTURED_REALITY_OWNER_DELETED')
  }
  if (central.exists) {
    const marker = central.data() ?? {}, keys = Object.keys(marker)
    const stamp = marker.updatedAt
    const released = !keys.includes('active') && keys.every(key => ['uid','updatedAt'].includes(key)) && stamp instanceof admin.firestore.Timestamp
    const expiry = marker.exportConsentExpiresAt
    const projectionExpiry = expiry instanceof admin.firestore.Timestamp ? expiry.toMillis()
      : typeof expiry === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expiry)
        && Number.isFinite(Date.parse(expiry)) && new Date(expiry).toISOString() === expiry ? Date.parse(expiry) : Number.NaN
    // Export consent shares this document with deletion authority. A canonical
    // C7 projection neither grants nor withdraws memory/location source consent.
    const exportProjection = !keys.includes('active') && keys.every(key => ['uid','updatedAt','exportConsentStatus',
      'exportConsentReceiptHash','exportConsentPolicyVersion','exportConsentExpiresAt'].includes(key))
      && ['granted','revoked'].includes(String(marker.exportConsentStatus))
      && SHA256.test(String(marker.exportConsentReceiptHash)) && marker.exportConsentPolicyVersion === '1.0.0'
      && Number.isSafeInteger(projectionExpiry)
    if (marker.uid !== uid || keys.some(key => key.startsWith('deletionPlanningLease')) || (marker.active !== false && !released && !exportProjection)) {
      throw new functions.https.HttpsError('permission-denied', 'CAPTURED_REALITY_OWNER_DELETED')
    }
  }
  for (const [block, purpose] of [[memoryBlock,'memory.storage'],[locationBlock,'location.context']] as const) {
    if (block.exists && (block.get('ownerUid') !== uid || block.get('purpose') !== purpose || block.get('active') !== false)) {
      throw new functions.https.HttpsError('permission-denied', 'CAPTURED_REALITY_CONSENT_WITHDRAWN')
    }
  }
  return { consentRevision: p.revision, deletionGeneration: generation }
}

// A captured place can stand alone. Entry from Replay additionally belongs to
// the selected, still-visible owner memory; a place binding is not that grant.
async function requireReplayMemoryAuthority(transaction: FirebaseFirestore.Transaction, uid: string, memoryId: string) {
  const [memory, policy] = await Promise.all([
    transaction.get(db.doc(`users/${uid}/memories/${memoryId}`)),
    transaction.get(db.doc(`users/${uid}/privacyPolicy/current`)),
  ])
  const value = memory.data(), p = policy.data()
  if (!memory.exists || (value?.ownerId ?? value?.userId) !== uid || value?.deleted === true
    || value?.privacy === 'hidden' || ['revoked', 'pending'].includes(String(value?.consentState))
    || !policy.exists || !isCanonicalStoredPolicy(p, uid) || p.revision < 1
    || p.enforcement.state !== 'fully-enforced' || !['granted', 'limited'].includes(p.domains.memory.mode)
    || p.domains.memory.replayVisible !== true) {
    throw new functions.https.HttpsError('permission-denied', 'CAPTURED_REALITY_REPLAY_MEMORY_UNAVAILABLE')
  }
}

async function requireSourceBindings(transaction: FirebaseFirestore.Transaction, uid: string, asset: FirebaseFirestore.DocumentSnapshot) {
  const bindings = asset.get('sourceBindings')
  if (!Array.isArray(bindings) || !bindings.length || bindings.length > 32 || new Set(bindings.map(row => row?.sourceReceiptRef)).size !== bindings.length) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_CURRENT_SOURCE_BINDING_REQUIRED')
  }
  const values = []
  for (const row of bindings) {
    if (!row || typeof row.sourceReceiptRef !== 'string' || !/^psr_[A-Za-z0-9_-]{16,128}$/.test(row.sourceReceiptRef)
      || !Number.isSafeInteger(row.sourceRevision) || row.sourceRevision < 1 || !SHA256.test(row.sourceSha256) || !SHA256.test(row.sourceConsentSha256)
      || !Number.isSafeInteger(row.sourceByteLength) || row.sourceByteLength < 1
      || typeof row.sourceFixityRef !== 'string' || !/^private:[A-Za-z0-9_./:-]{8,512}$/.test(row.sourceFixityRef)) {
      throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_CURRENT_SOURCE_BINDING_REQUIRED')
    }
    const source = await transaction.get(db.doc(`uraiPrivateSourceReceipts/${sha(row.sourceReceiptRef)}`))
    const grant = source.data()
    if (!source.exists || grant?.schemaVersion !== 'urai-private-source-receipt-v2' || grant.ownerUid !== uid || grant.status !== 'ACTIVE'
      || grant.synthetic !== false || grant.fixtureOnly === true || !Array.isArray(grant.purposes) || !grant.purposes.includes('reconstruct-place')
      || ['sourceReceiptRef','sourceRevision','sourceSha256','sourceByteLength','sourceFixityRef'].some(key => grant[key] !== row[key])
      || !Array.isArray(grant.consents) || grant.consents.length !== 2 || !['memory.storage','location.context'].every(purpose =>
        grant.consents.filter((consent: { purpose?: unknown }) => consent?.purpose === purpose).length === 1)
      || sha(JSON.stringify(grant.consents)) !== row.sourceConsentSha256
      || grant.consents.some((consent: { policyVersion?: unknown; decisionReceiptId?: unknown }) => typeof consent.policyVersion !== 'string'
        || !consent.policyVersion || typeof consent.decisionReceiptId !== 'string' || !consent.decisionReceiptId)) {
      throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_SOURCE_CHANGED_OR_DELETED')
    }
    values.push({ ...row, grantConsentSha256: sha(JSON.stringify(grant.consents)) })
  }
  return values
}

function requirePrivateRuntimeObject(uid: string, assetId: string, value: unknown) {
  const objectPath = String(value ?? '')
  const prefix = `${PRIVATE_CAPTURE_PREFIX}/${uid}/${assetId}/runtime/`
  if (!objectPath.startsWith(prefix) || objectPath.includes('..')) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid captured-reality object boundary.')
  }
  return objectPath
}

function assetRevoked(snapshot: FirebaseFirestore.DocumentSnapshot) {
  return snapshot.get('revokedAt') != null
    || snapshot.get('revocationState') === 'revoked'
    || snapshot.get('state') === 'revoked'
}

function publicAssetState(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const data = snapshot.data() ?? {}
  return {
    assetId: snapshot.id,
    label: String(data.label ?? 'Private captured place').slice(0, 160),
    truthClass: String(data.truthClass ?? 'unknown'),
    state: String(data.state ?? 'unknown'),
    reconstructionMethod: String(data.reconstructionMethod ?? 'unknown'),
    reviewState: String(data.reviewState ?? 'unreviewed'),
    proofState: String(data.proofState ?? 'hard-off'),
    releaseState: String(data.releaseState ?? 'hard-off'),
    browserCertified: data.browserCertified === true,
    mobileCertified: data.mobileCertified === true,
    sourceCount: Array.isArray(data.sourceIds) ? data.sourceIds.length : 0,
    truthLabel: String(data.truthLabel ?? 'Unknown / unresolved reconstruction').slice(0, 240),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

/**
 * Owner-only metadata read. Raw source locators, exact location, storage object
 * names and provider credentials are deliberately omitted from the response.
 */
export const getCapturedRealityAsset = capturedRealityFunctions.https.onCall(async (data, context) => {
  const actor = await requireCallableOwner(context)
  const assetId = requireToken(data?.assetId, 'assetId')
  const result = await db.runTransaction(async transaction => {
    await requireLocationRuntimeConsent(actor.uid, transaction)
    const snapshot = await transaction.get(db.doc(`users/${actor.uid}/capturedRealityAssets/${assetId}`))
    if (!snapshot.exists || snapshot.get('ownerId') !== actor.uid) throw new functions.https.HttpsError('not-found', 'Captured-reality asset was not found.')
    if (assetRevoked(snapshot)) throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_ASSET_REVOKED')
    return publicAssetState(snapshot)
  })
  await requireCurrentOwner(actor.uid, actor.bearer, actor.creationTime)
  return result
})

/**
 * Issues a short-lived URL only when the feature is enabled, the authenticated
 * owner still has effective location consent, and the asset is explicitly
 * reviewed/ready for private runtime delivery.
 */
async function readRuntimeAuthority(transaction: FirebaseFirestore.Transaction, uid: string, data: Record<string, unknown>) {
  if (!capturedRealityEnabled()) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_RELEASE_DISABLED')
  }

  const privacy = await requireLocationRuntimeConsent(uid, transaction)
  const assetId = requireToken(data?.assetId, 'assetId')
  const deviceTier = requireToken(data?.deviceTier, 'deviceTier', 16)
  const accessMode = data?.accessMode === 'proof' ? 'proof' : 'runtime'
  if (accessMode === 'proof' && !capturedRealityProofEnabled()) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_PROOF_DISABLED')
  }
  if (deviceTier !== 'desktop' && deviceTier !== 'mobile') {
    throw new functions.https.HttpsError('invalid-argument', 'CAPTURED_REALITY_BROWSER_DEVICE_TIER_REQUIRED')
  }
  const snapshot = await transaction.get(db.doc(`users/${uid}/capturedRealityAssets/${assetId}`))
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Captured-reality asset was not found.')
  }
  if (assetRevoked(snapshot)) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_ASSET_REVOKED')
  }

  const state = String(snapshot.get('state') ?? 'unknown')
  const reviewState = String(snapshot.get('reviewState') ?? 'unreviewed')
  const proofState = String(snapshot.get('proofState') ?? 'hard-off')

  if (accessMode === 'runtime' && (state !== 'ready' || reviewState !== 'accepted')) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_ASSET_NOT_ACCEPTED')
  }

  if (accessMode === 'proof') {
    if (state !== 'proof-ready' && state !== 'ready') {
      throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_PROOF_ASSET_NOT_READY')
    }
    if (
      proofState !== 'technical-preview' ||
      snapshot.get('proofIntegrityVerified') !== true ||
      snapshot.get('proofPrivacyReviewed') !== true
    ) {
      throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_PROOF_ASSET_NOT_AUTHORIZED')
    }
  }

  const releaseState = String(snapshot.get('releaseState') ?? 'hard-off')
  if (!['private-pilot', 'private-beta', 'launch-enabled'].includes(releaseState)) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_ASSET_HARD_OFF')
  }

  if (accessMode === 'proof' && releaseState !== 'private-pilot') {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_PROOF_REQUIRES_PRIVATE_PILOT')
  }

  const certified = deviceTier === 'mobile' ? snapshot.get('mobileCertified') === true : snapshot.get('browserCertified') === true
  if (accessMode === 'runtime' && !certified) {
    throw new functions.https.HttpsError('failed-precondition', deviceTier === 'mobile' ? 'CAPTURED_REALITY_MOBILE_NOT_CERTIFIED' : 'CAPTURED_REALITY_BROWSER_NOT_CERTIFIED')
  }

  const truthClass = String(snapshot.get('truthClass') ?? 'unknown')
  if (truthClass !== 'spatially-reconstructable') {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_TRUTH_CLASS_NOT_RUNTIME_ELIGIBLE')
  }

  const objectPath = requirePrivateRuntimeObject(uid, assetId, snapshot.get('runtimeObject'))
  const storageBucket = String(snapshot.get('storageBucket') ?? '')
  const configuredBucket = String(process.env.FIREBASE_STORAGE_BUCKET ?? '').trim()
  if (!configuredBucket) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_STORAGE_BUCKET_UNCONFIGURED')
  }
  if (!storageBucket || storageBucket !== configuredBucket) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_STORAGE_BUCKET_MISMATCH')
  }
  const runtimeSha256 = String(snapshot.get('runtimeSha256') ?? '').toLowerCase()
  const approvedSha256 = String(snapshot.get(
    accessMode === 'proof' ? 'proofApprovedRuntimeSha256' : 'reviewApprovedRuntimeSha256',
  ) ?? '').toLowerCase()
  const approvedGeneration = String(snapshot.get(
    accessMode === 'proof' ? 'proofApprovedStorageGeneration' : 'reviewApprovedStorageGeneration',
  ) ?? '')

  if (
    !/^[a-f0-9]{64}$/.test(runtimeSha256) ||
    runtimeSha256 !== approvedSha256 ||
    !/^\d+$/.test(approvedGeneration) ||
    !objectPath.endsWith(`/${runtimeSha256}.splat`)
  ) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      accessMode === 'proof'
        ? 'CAPTURED_REALITY_PROOF_ARTIFACT_NOT_BOUND'
        : 'CAPTURED_REALITY_RUNTIME_ARTIFACT_NOT_BOUND',
    )
  }

  const sourceBindings = await requireSourceBindings(transaction, uid, snapshot)
  const sourceManifestSha256 = String(snapshot.get('sourceManifestSha256') ?? '')
  const approvedSourceManifestSha256 = String(snapshot.get(accessMode === 'proof' ? 'proofApprovedSourceManifestSha256' : 'reviewApprovedSourceManifestSha256') ?? '')
  const runtimeByteLength = Number(snapshot.get('runtimeBytes'))
  const maximumBytes = deviceTier === 'mobile' ? 64 * 1024 * 1024 : 160 * 1024 * 1024
  if (!SHA256.test(sourceManifestSha256) || sourceManifestSha256 !== approvedSourceManifestSha256
    || !Number.isSafeInteger(runtimeByteLength) || runtimeByteLength < 32 || runtimeByteLength % 32 !== 0 || runtimeByteLength > maximumBytes) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_SOURCE_OR_RUNTIME_SIZE_NOT_BOUND')
  }
  const authorityHash = sha(JSON.stringify({ uid, assetId, deviceTier, accessMode, storageBucket, objectPath, runtimeSha256, approvedGeneration,
    runtimeByteLength, sourceManifestSha256, sourceBindings, privacy, assetRevision: snapshot.updateTime?.toMillis() ?? null }))
  return { assetId, deviceTier, accessMode, storageBucket, objectPath, runtimeSha256, storageGeneration: approvedGeneration,
    runtimeByteLength, authorityHash, truthLabel: String(snapshot.get('truthLabel') ?? 'Spatial reconstruction from recorded sources').slice(0,240) }
}

function runtimeProject() {
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
  if (project === 'urai-4dc1d' || (process.env.FUNCTIONS_EMULATOR === 'true' && project && /^demo-[a-z0-9-]{1,50}$/.test(project))) return project
  throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_PROJECT_UNBOUND')
}
function runtimeEndpoint(host?: string) {
  const project = runtimeProject()
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    if (!host || !/^(?:localhost|127\.0\.0\.1):[0-9]{2,5}$/.test(host)) throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_LOCAL_ENDPOINT_UNBOUND')
    return `http://${host}/${project}/${CAPTURED_REALITY_REGION}/streamCapturedRealityRuntime`
  }
  return `https://${CAPTURED_REALITY_REGION}-${project}.cloudfunctions.net/streamCapturedRealityRuntime`
}
function validateRuntimeMetadata(metadata: { generation?: unknown; size?: unknown; contentType?: unknown; metadata?: Record<string, unknown> }, authority: Awaited<ReturnType<typeof readRuntimeAuthority>>) {
  if (String(metadata.generation) !== authority.storageGeneration || Number(metadata.size) !== authority.runtimeByteLength
    || metadata.contentType !== 'application/octet-stream' || metadata.metadata?.uraiRuntimeSha256 !== authority.runtimeSha256
    || metadata.metadata?.firebaseStorageDownloadTokens != null) {
    throw new functions.https.HttpsError('failed-precondition', authority.accessMode === 'proof' ? 'CAPTURED_REALITY_PROOF_ARTIFACT_CHANGED' : 'CAPTURED_REALITY_RUNTIME_ARTIFACT_CHANGED')
  }
}
async function requirePrivateRuntimeBucket(bucket: ReturnType<ReturnType<typeof admin.storage>['bucket']>) {
  const [metadata] = await bucket.getMetadata()
  if (metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled !== true || metadata.iamConfiguration?.publicAccessPrevention !== 'enforced') {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_PRIVATE_BUCKET_REQUIRED')
  }
}

// The issued descriptor is not a credential; every GET still requires a current owner token.
export const getCapturedRealityRuntimeUrl = capturedRealityFunctions.https.onCall(async (data, context) => {
  const actor = await requireCallableOwner(context)
  const endpoint = runtimeEndpoint(context.rawRequest?.get('host'))
  const authority = await db.runTransaction(transaction => readRuntimeAuthority(transaction, actor.uid, data ?? {}))
  const bucket = admin.storage().bucket(authority.storageBucket)
  await requirePrivateRuntimeBucket(bucket)
  const object = bucket.file(authority.objectPath, { generation: authority.storageGeneration })
  const [metadata] = await object.getMetadata()
  validateRuntimeMetadata(metadata, authority)
  await requireCurrentOwner(actor.uid, actor.bearer, actor.creationTime)
  const expiresAt = Math.min(Date.now() + RUNTIME_URL_TTL_MS, actor.expiresAt)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) throw new functions.https.HttpsError('unauthenticated', 'Current authentication is required.')
  const deliveryId = randomBytes(32).toString('hex')
  await db.runTransaction(async transaction => {
    const current = await readRuntimeAuthority(transaction, actor.uid, data ?? {})
    if (current.authorityHash !== authority.authorityHash) throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_AUTHORITY_CHANGED')
    transaction.create(db.doc(`users/${actor.uid}/capturedRealityRuntimeDeliveries/${deliveryId}`), {
      ownerId: actor.uid, assetId: authority.assetId, deviceTier: authority.deviceTier, accessMode: authority.accessMode,
      authorityHash: authority.authorityHash, accountCreationTime: actor.creationTime, expiresAt, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    transaction.create(db.doc(`users/${actor.uid}/privacyAudit/captured_runtime_${deliveryId}`), {
      ownerId: actor.uid, kind: 'captured_reality.runtime_descriptor_created', assetId: authority.assetId,
      accessMode: authority.accessMode, deviceTier: authority.deviceTier, transport: 'authenticated-function',
      releaseGate: authority.accessMode === 'proof' ? 'proof-only' : 'enabled', recordedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  })
  await requireCurrentOwner(actor.uid, actor.bearer, actor.creationTime)
  const query = new URLSearchParams({ assetId: authority.assetId, deviceTier: authority.deviceTier, accessMode: authority.accessMode, deliveryId })
  return { assetId: authority.assetId, deviceTier: authority.deviceTier, accessMode: authority.accessMode, url: `${endpoint}?${query}`,
    requiresAuthorization: true, expiresAt: new Date(expiresAt).toISOString(), truthLabel: authority.truthLabel,
    runtimeSha256: authority.runtimeSha256, runtimeByteLength: authority.runtimeByteLength, storageGeneration: authority.storageGeneration }
})

async function readIssuedRuntime(transaction: FirebaseFirestore.Transaction, uid: string, data: Record<string, unknown>, deliveryId: string) {
  const [issued, current] = await Promise.all([
    transaction.get(db.doc(`users/${uid}/capturedRealityRuntimeDeliveries/${deliveryId}`)), readRuntimeAuthority(transaction, uid, data),
  ])
  if (!issued.exists || issued.get('ownerId') !== uid || issued.get('assetId') !== current.assetId || issued.get('deviceTier') !== current.deviceTier
    || issued.get('accessMode') !== current.accessMode || issued.get('authorityHash') !== current.authorityHash
    || !Number.isSafeInteger(issued.get('expiresAt')) || issued.get('expiresAt') <= Date.now()) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_DESCRIPTOR_EXPIRED_OR_CHANGED')
  }
  return { ...current, accountCreationTime: String(issued.get('accountCreationTime')) }
}
function allowedRuntimeOrigin(origin: string, project: string) {
  if (['https://urai.app','https://www.urai.app','https://urai.life','https://uraispatial.com','https://localhost','capacitor://localhost','http://localhost',
    `https://${project}.web.app`,`https://${project}.firebaseapp.com`].includes(origin)) return true
  if (process.env.FUNCTIONS_EMULATOR === 'true' && ['http://localhost:4173','http://127.0.0.1:4173'].includes(origin)) return true
  return new RegExp(`^https://${project}--[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.web\\.app$`).test(origin)
    && new URL(origin).hostname.split('.')[0].length <= 63
}

export const streamCapturedRealityRuntime = capturedRealityFunctions.runWith({ timeoutSeconds: 540, memory: '512MB' }).https.onRequest(async (request, response) => {
  response.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin' })
  try {
    const project = runtimeProject(), origin = request.get('origin')
    if (origin && !allowedRuntimeOrigin(origin, project)) throw new functions.https.HttpsError('permission-denied', 'Captured-place origin is not admitted.')
    if (request.method === 'OPTIONS') {
      const headers = request.get('access-control-request-headers')
      if (!origin || request.get('access-control-request-method') !== 'GET' || !headers || !headers.split(',').every(header => header.trim().toLowerCase() === 'authorization')) {
        throw new functions.https.HttpsError('permission-denied', 'Captured-place preflight is not admitted.')
      }
      response.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Authorization', 'Access-Control-Max-Age': '0' }).status(204).end()
      return
    }
    if (origin) response.set({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': 'Content-Length, Content-Type, X-URAI-Checksum-SHA256, X-URAI-Storage-Generation' })
    if (request.method !== 'GET') { response.set('Allow','GET, OPTIONS').status(405).json({ error: 'method_not_allowed' }); return }
    const bearer = request.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]
    if (!bearer) throw new functions.https.HttpsError('unauthenticated', 'Current authentication is required.')
    let token: admin.auth.DecodedIdToken
    try { token = await admin.auth().verifyIdToken(bearer, true) } catch { throw new functions.https.HttpsError('unauthenticated','Current authentication is required.') }
    const deliveryId = request.query.deliveryId
    if (typeof deliveryId !== 'string' || !SHA256.test(deliveryId) || Object.keys(request.query).some(key => !['assetId','deviceTier','accessMode','deliveryId'].includes(key))) {
      throw new functions.https.HttpsError('invalid-argument', 'Captured-place descriptor is invalid.')
    }
    const authority = await db.runTransaction(transaction => readIssuedRuntime(transaction, token.uid, request.query as Record<string,unknown>, deliveryId))
    const requireCurrent = async () => {
      await requireCurrentOwner(token.uid, bearer, authority.accountCreationTime)
      const current = await db.runTransaction(transaction => readIssuedRuntime(transaction, token.uid, request.query as Record<string,unknown>, deliveryId))
      if (current.authorityHash !== authority.authorityHash || request.aborted || response.destroyed) throw new functions.https.HttpsError('permission-denied','Captured-place authority changed.')
      await requireCurrentOwner(token.uid, bearer, authority.accountCreationTime)
    }
    await requireCurrent()
    const bucket = admin.storage().bucket(authority.storageBucket)
    await requirePrivateRuntimeBucket(bucket)
    const object = bucket.file(authority.objectPath, { generation: authority.storageGeneration })
    const [metadata] = await object.getMetadata()
    validateRuntimeMetadata(metadata, authority)
    await requireCurrent()
    response.set({ 'Content-Type': 'application/octet-stream', 'Content-Length': String(authority.runtimeByteLength),
      'X-URAI-Checksum-SHA256': authority.runtimeSha256, 'X-URAI-Storage-Generation': authority.storageGeneration })
    const stream = object.createReadStream({ validation: 'crc32c' })
    response.once('close', () => { if (!response.writableFinished) stream.destroy() })
    const digest = createHash('sha256'); let delivered = 0
    async function* guardedChunks(source: AsyncIterable<Buffer>) {
      for await (const incoming of source) {
        const bytes = Buffer.isBuffer(incoming) ? incoming : Buffer.from(incoming)
        for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
          await requireCurrent()
          const chunk = bytes.subarray(offset, offset + 64 * 1024)
          delivered += chunk.length
          if (delivered > authority.runtimeByteLength) throw new functions.https.HttpsError('failed-precondition','Captured-place length changed.')
          digest.update(chunk); yield chunk
        }
      }
      await requireCurrent()
      if (delivered !== authority.runtimeByteLength || digest.digest('hex') !== authority.runtimeSha256) throw new functions.https.HttpsError('failed-precondition','Captured-place fixity changed.')
    }
    await pipeline(stream, guardedChunks, response)
  } catch (error) {
    if (response.headersSent || response.destroyed) return
    const status = error instanceof functions.https.HttpsError ? ({unauthenticated:401,'permission-denied':403,'not-found':404,'invalid-argument':400,'failed-precondition':409} as Record<string,number>)[error.code] ?? 500 : 500
    response.status(status).json({ error: 'captured_reality_unavailable' })
  }
})


async function requireCapturedRealityLifeModelAuthority(
  uid: string,
  binding: FirebaseFirestore.DocumentSnapshot,
) {
  if (binding.get('lifeModelSchemaVersion') !== 'urai-life-model-v1') return false
  const sceneTruthPacketId = binding.get('sceneTruthPacketId')
  if (typeof sceneTruthPacketId !== 'string' || !sceneTruthPacketId) return false
  const bundleIds = Array.isArray(binding.get('personModelBundleIds'))
    ? [...new Set(binding.get('personModelBundleIds').filter((value: unknown): value is string => typeof value === 'string' && value.length > 0))]
    : []

  const [scene, bundles] = await Promise.all([
    db.doc(`users/${uid}/sceneTruthPackets/${sceneTruthPacketId}`).get(),
    bundleIds.length
      ? db.getAll(...bundleIds.map((id) => db.doc(`users/${uid}/personModelBundles/${id}`)))
      : [],
  ])
  if (
    !scene.exists
    || scene.get('ownerId') !== uid
    || scene.get('schemaVersion') !== 'urai-life-model-v1'
    || scene.get('state') !== 'current'
    || scene.get('syntheticOutputMayBecomeHistoricalSource') !== false
    || !['READY','READY_WITH_OCCLUSION','READY_INTERPRETIVE'].includes(String(scene.get('decision') ?? ''))
  ) return false

  return bundles.every((bundle) =>
    bundle.exists
    && bundle.get('ownerId') === uid
    && bundle.get('schemaVersion') === 'urai-life-model-v1'
    && bundle.get('state') === 'current'
    && bundle.get('synthetic') === false
  )
}

/**
 * Resolves an authenticated Replay memory to a reviewed private Captured
 * Reality asset. No source IDs, storage locators, exact location, or provider
 * details are returned to the client.
 */
export const getCapturedRealityReplayEntry = capturedRealityFunctions.https.onCall(async (data, context) => {
  const actor = await requireCallableOwner(context), uid = actor.uid
  if (!capturedRealityEnabled()) return { available: false }

  const memoryId = requireToken(data?.memoryId, 'memoryId')
  const deviceTier = requireToken(data?.deviceTier, 'deviceTier', 16)
  if (deviceTier !== 'desktop' && deviceTier !== 'mobile') {
    throw new functions.https.HttpsError('invalid-argument', 'CAPTURED_REALITY_BROWSER_DEVICE_TIER_REQUIRED')
  }

  await db.runTransaction(async transaction => {
    await requireLocationRuntimeConsent(uid, transaction)
    await requireReplayMemoryAuthority(transaction, uid, memoryId)
  })

  const binding = await db.doc(`users/${uid}/capturedRealityReplayBindings/${memoryId}`).get()
  if (!binding.exists) return { available: false }
  if (
    binding.get('ownerId') !== uid ||
    binding.get('memoryId') !== memoryId ||
    binding.get('state') !== 'accepted'
  ) {
    return { available: false }
  }
  const bindingHash = sha(JSON.stringify(binding.data()))

  const assetId = requireToken(binding.get('capturedRealityAssetId'), 'capturedRealityAssetId')
  const asset = await db.doc(`users/${uid}/capturedRealityAssets/${assetId}`).get()
  if (!asset.exists || asset.get('ownerId') !== uid) return { available: false }
  if (assetRevoked(asset)) return { available: false }

  const placeEntityId = binding.get('placeEntityId')
  if (
    typeof placeEntityId !== 'string' ||
    !placeEntityId.trim() ||
    asset.get('state') !== 'ready' ||
    asset.get('reviewState') !== 'accepted' ||
    asset.get('truthClass') !== 'spatially-reconstructable' ||
    asset.get('anchorEntityId') !== placeEntityId
  ) {
    return { available: false }
  }

  const releaseState = String(asset.get('releaseState') ?? 'hard-off')
  if (!['private-pilot', 'private-beta', 'launch-enabled'].includes(releaseState)) {
    return { available: false }
  }
  if (releaseState === 'launch-enabled' && !(await requireCapturedRealityLifeModelAuthority(uid, binding))) {
    return { available: false }
  }

  const certified = deviceTier === 'mobile'
    ? asset.get('mobileCertified') === true
    : asset.get('browserCertified') === true
  if (!certified) return { available: false }

  const requireCurrentEntry = () => db.runTransaction(async transaction => {
    await requireReplayMemoryAuthority(transaction, uid, memoryId)
    const currentBinding = await transaction.get(db.doc(`users/${uid}/capturedRealityReplayBindings/${memoryId}`))
    if (!currentBinding.exists || sha(JSON.stringify(currentBinding.data())) !== bindingHash) {
      throw new functions.https.HttpsError('permission-denied', 'CAPTURED_REALITY_REPLAY_BINDING_CHANGED')
    }
    const currentAsset = await transaction.get(db.doc(`users/${uid}/capturedRealityAssets/${assetId}`))
    if (!currentAsset.exists || currentAsset.get('ownerId') !== uid || currentAsset.get('anchorEntityId') !== placeEntityId
      || currentAsset.get('truthClass') !== 'spatially-reconstructable') {
      throw new functions.https.HttpsError('permission-denied', 'CAPTURED_REALITY_REPLAY_PLACE_CHANGED')
    }
    return readRuntimeAuthority(transaction, uid, { assetId, deviceTier, accessMode: 'runtime' })
  })
  await requireCurrentEntry()
  await requireCurrentOwner(uid, actor.bearer, actor.creationTime)
  // Current authentication is an external await. Re-read the memory and all
  // runtime fences afterwards so withdrawal there cannot reopen the entry.
  await requireCurrentEntry()
  return {
    available: true,
    assetId,
    truthLabel: String(asset.get('truthLabel') ?? 'Spatial reconstruction from recorded sources').slice(0, 240),
  }
})
