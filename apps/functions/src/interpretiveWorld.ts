import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const RUNTIME_URL_TTL_MS = 10 * 60 * 1000
const PRIVATE_WORLD_PREFIX = 'private-interpretive-worlds'
const INTERPRETIVE_WORLD_REGION = 'us-central1'
const interpretiveWorldFunctions = functions.region(INTERPRETIVE_WORLD_REGION)

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

function interpretiveWorldEnabled() {
  return process.env.URAI_ENABLE_INTERPRETIVE_WORLDS === 'true'
}

function requirePrivateRuntimeObject(uid: string, assetId: string, value: unknown) {
  const objectPath = String(value ?? '')
  const prefix = `${PRIVATE_WORLD_PREFIX}/${uid}/${assetId}/runtime/`
  if (!objectPath.startsWith(prefix) || objectPath.includes('..') || !objectPath.endsWith('.splat')) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid interpretive-world object boundary.')
  }
  return objectPath
}

function assetRevoked(snapshot: FirebaseFirestore.DocumentSnapshot) {
  return snapshot.get('revokedAt') != null
    || snapshot.get('revocationState') === 'revoked'
    || snapshot.get('state') === 'revoked'
}

function assetTruthBoundaryValid(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const sourceIds = snapshot.get('sourceIds')
  return snapshot.get('truthClass') === 'interpretive'
    && snapshot.get('autobiographical') === false
    && snapshot.get('generatedOnly') === true
    && snapshot.get('sourceTruthEligible') === false
    && Array.isArray(sourceIds)
    && sourceIds.length === 0
    && snapshot.get('exactPrivateLocationEmbedded') === false
}

function assetRuntimeReady(snapshot: FirebaseFirestore.DocumentSnapshot, deviceTier: string) {
  const releaseState = String(snapshot.get('releaseState') ?? 'hard-off')
  const certified = deviceTier === 'mobile'
    ? snapshot.get('mobileCertified') === true
    : snapshot.get('browserCertified') === true
  return snapshot.get('state') === 'ready'
    && snapshot.get('reviewState') === 'accepted'
    && snapshot.get('visualAcceptance') === 'accepted'
    && assetTruthBoundaryValid(snapshot)
    && ['private-pilot', 'private-beta', 'launch-enabled'].includes(releaseState)
    && certified
}

function publicAssetState(snapshot: FirebaseFirestore.DocumentSnapshot) {
  const data = snapshot.data() ?? {}
  return {
    assetId: snapshot.id,
    label: String(data.label ?? 'Interpretive generated world').slice(0, 160),
    truthClass: String(data.truthClass ?? 'unknown'),
    truthLabel: String(data.truthLabel ?? 'Interpretive generated world — not camera-recorded history.').slice(0, 240),
    state: String(data.state ?? 'unknown'),
    reviewState: String(data.reviewState ?? 'unreviewed'),
    visualAcceptance: String(data.visualAcceptance ?? 'pending'),
    releaseState: String(data.releaseState ?? 'hard-off'),
    browserCertified: data.browserCertified === true,
    mobileCertified: data.mobileCertified === true,
    collisionArtifactId: typeof data.collisionArtifactId === 'string' ? data.collisionArtifactId : null,
    autobiographical: false,
    sourceTruthEligible: false,
    sourceCount: 0,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  }
}

export const getInterpretiveWorldAsset = interpretiveWorldFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const assetId = requireToken(data?.assetId, 'assetId')
  const snapshot = await db.doc(`users/${uid}/interpretiveWorldAssets/${assetId}`).get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Interpretive-world asset was not found.')
  }
  if (assetRevoked(snapshot)) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_ASSET_REVOKED')
  }
  if (!assetTruthBoundaryValid(snapshot)) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_TRUTH_BOUNDARY_INVALID')
  }
  return publicAssetState(snapshot)
})

export const getInterpretiveWorldRuntimeUrl = interpretiveWorldFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  if (!interpretiveWorldEnabled()) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_RELEASE_DISABLED')
  }

  const assetId = requireToken(data?.assetId, 'assetId')
  const deviceTier = requireToken(data?.deviceTier, 'deviceTier', 16)
  if (deviceTier !== 'desktop' && deviceTier !== 'mobile') {
    throw new functions.https.HttpsError('invalid-argument', 'INTERPRETIVE_WORLD_BROWSER_DEVICE_TIER_REQUIRED')
  }

  const snapshot = await db.doc(`users/${uid}/interpretiveWorldAssets/${assetId}`).get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Interpretive-world asset was not found.')
  }
  if (assetRevoked(snapshot)) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_ASSET_REVOKED')
  }
  if (!assetTruthBoundaryValid(snapshot)) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_TRUTH_BOUNDARY_INVALID')
  }
  if (!assetRuntimeReady(snapshot, deviceTier)) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_ASSET_NOT_CERTIFIED')
  }

  const objectPath = requirePrivateRuntimeObject(uid, assetId, snapshot.get('runtimeObject'))
  const storageBucket = String(snapshot.get('storageBucket') ?? '')
  const configuredBucket = String(process.env.FIREBASE_STORAGE_BUCKET ?? '').trim()
  if (!configuredBucket) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_STORAGE_BUCKET_UNCONFIGURED')
  }
  if (!storageBucket || storageBucket !== configuredBucket) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_STORAGE_BUCKET_MISMATCH')
  }

  const runtimeFile = admin.storage().bucket(storageBucket).file(objectPath)
  const runtimeSha256 = String(snapshot.get('runtimeSha256') ?? '').toLowerCase()
  const approvedSha256 = String(snapshot.get('reviewApprovedRuntimeSha256') ?? '').toLowerCase()
  const approvedGeneration = String(snapshot.get('reviewApprovedStorageGeneration') ?? '')
  if (
    !/^[a-f0-9]{64}$/.test(runtimeSha256)
    || runtimeSha256 !== approvedSha256
    || !/^\d+$/.test(approvedGeneration)
    || !objectPath.endsWith(`/${runtimeSha256}.splat`)
  ) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_RUNTIME_ARTIFACT_NOT_BOUND')
  }

  const [metadata] = await runtimeFile.getMetadata()
  const liveGeneration = String(metadata.generation ?? '')
  const storedSha256 = String(metadata.metadata?.uraiRuntimeSha256 ?? '').toLowerCase()
  if (liveGeneration !== approvedGeneration || storedSha256 !== runtimeSha256) {
    throw new functions.https.HttpsError('failed-precondition', 'INTERPRETIVE_WORLD_RUNTIME_ARTIFACT_CHANGED')
  }

  const expiresAt = Date.now() + RUNTIME_URL_TTL_MS
  const [url] = await runtimeFile.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt,
    queryParams: { generation: approvedGeneration },
  })

  await db.collection(`users/${uid}/privacyAudit`).add({
    ownerId: uid,
    kind: 'interpretive_world.runtime_accessed',
    assetId,
    truthClass: 'interpretive',
    autobiographical: false,
    sourceCount: 0,
    deviceTier,
    recordedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return {
    assetId,
    deviceTier,
    url,
    expiresAt: new Date(expiresAt).toISOString(),
    truthLabel: String(snapshot.get('truthLabel') ?? 'Interpretive generated world — not camera-recorded history.').slice(0, 240),
    autobiographical: false,
    collisionArtifactId: typeof snapshot.get('collisionArtifactId') === 'string' ? snapshot.get('collisionArtifactId') : null,
  }
})

export const getInterpretiveWorldReplayEntry = interpretiveWorldFunctions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  if (!interpretiveWorldEnabled()) return { available: false }

  const memoryId = requireToken(data?.memoryId, 'memoryId')
  const deviceTier = requireToken(data?.deviceTier, 'deviceTier', 16)
  if (deviceTier !== 'desktop' && deviceTier !== 'mobile') {
    throw new functions.https.HttpsError('invalid-argument', 'INTERPRETIVE_WORLD_BROWSER_DEVICE_TIER_REQUIRED')
  }

  const binding = await db.doc(`users/${uid}/interpretiveWorldReplayBindings/${memoryId}`).get()
  if (
    !binding.exists
    || binding.get('ownerId') !== uid
    || binding.get('memoryId') !== memoryId
    || binding.get('state') !== 'accepted'
  ) {
    return { available: false }
  }

  const assetId = requireToken(binding.get('interpretiveWorldAssetId'), 'interpretiveWorldAssetId')
  const asset = await db.doc(`users/${uid}/interpretiveWorldAssets/${assetId}`).get()
  if (!asset.exists || asset.get('ownerId') !== uid || assetRevoked(asset)) return { available: false }
  if (!assetRuntimeReady(asset, deviceTier)) return { available: false }

  return {
    available: true,
    assetId,
    truthLabel: String(asset.get('truthLabel') ?? 'Interpretive generated world — not camera-recorded history.').slice(0, 240),
    autobiographical: false,
  }
})
