import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const RUNTIME_URL_TTL_MS = 10 * 60 * 1000
const PRIVATE_CAPTURE_PREFIX = 'private-captured-reality'

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

async function requireLocationRuntimeConsent(uid: string) {
  const [policy, runtime] = await Promise.all([
    db.doc(`users/${uid}/privacyPolicy/current`).get(),
    db.doc(`users/${uid}/privacyRuntime/location-collection`).get(),
  ])

  const location = policy.get('domains.location') as Record<string, unknown> | undefined
  const memory = policy.get('domains.memory') as Record<string, unknown> | undefined
  const locationMode = String(location?.mode ?? 'denied')
  const memoryMode = String(memory?.mode ?? 'denied')
  const locationAllowed = locationMode === 'granted' || locationMode === 'limited'
  const memoryAllowed = memoryMode === 'granted' || memoryMode === 'limited'
  const runtimeAllowed = runtime.exists && runtime.get('enabled') === true

  if (!locationAllowed || !memoryAllowed || !runtimeAllowed) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'CAPTURED_REALITY_MEMORY_AND_LOCATION_CONSENT_REQUIRED',
    )
  }
}

function requirePrivateRuntimeObject(uid: string, assetId: string, value: unknown) {
  const objectPath = String(value ?? '')
  const prefix = `${PRIVATE_CAPTURE_PREFIX}/${uid}/${assetId}/runtime/`
  if (!objectPath.startsWith(prefix) || objectPath.includes('..')) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid captured-reality object boundary.')
  }
  return objectPath
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
export const getCapturedRealityAsset = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  const assetId = requireToken(data?.assetId, 'assetId')
  const snapshot = await db.doc(`users/${uid}/capturedRealityAssets/${assetId}`).get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Captured-reality asset was not found.')
  }
  return publicAssetState(snapshot)
})

/**
 * Issues a short-lived URL only when the feature is enabled, the authenticated
 * owner still has effective location consent, and the asset is explicitly
 * reviewed/ready for private runtime delivery.
 */
export const getCapturedRealityRuntimeUrl = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  if (!capturedRealityEnabled()) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_RELEASE_DISABLED')
  }

  await requireLocationRuntimeConsent(uid)
  const assetId = requireToken(data?.assetId, 'assetId')
  const deviceTier = requireToken(data?.deviceTier, 'deviceTier', 16)
  if (deviceTier !== 'desktop' && deviceTier !== 'mobile') {
    throw new functions.https.HttpsError('invalid-argument', 'CAPTURED_REALITY_BROWSER_DEVICE_TIER_REQUIRED')
  }
  const snapshot = await db.doc(`users/${uid}/capturedRealityAssets/${assetId}`).get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Captured-reality asset was not found.')
  }

  if (snapshot.get('state') !== 'ready' || snapshot.get('reviewState') !== 'accepted') {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_ASSET_NOT_ACCEPTED')
  }

  const releaseState = String(snapshot.get('releaseState') ?? 'hard-off')
  if (!['private-pilot', 'private-beta', 'launch-enabled'].includes(releaseState)) {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_ASSET_HARD_OFF')
  }

  const certified = deviceTier === 'mobile' ? snapshot.get('mobileCertified') === true : snapshot.get('browserCertified') === true
  if (!certified) {
    throw new functions.https.HttpsError('failed-precondition', deviceTier === 'mobile' ? 'CAPTURED_REALITY_MOBILE_NOT_CERTIFIED' : 'CAPTURED_REALITY_BROWSER_NOT_CERTIFIED')
  }

  const truthClass = String(snapshot.get('truthClass') ?? 'unknown')
  if (truthClass !== 'spatially-reconstructable') {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_TRUTH_CLASS_NOT_RUNTIME_ELIGIBLE')
  }

  const objectPath = requirePrivateRuntimeObject(uid, assetId, snapshot.get('runtimeObject'))
  const expiresAt = Date.now() + RUNTIME_URL_TTL_MS
  const [url] = await admin.storage().bucket().file(objectPath).getSignedUrl({
    action: 'read',
    expires: expiresAt,
  })

  await db.doc(`users/${uid}/privacyAudit/captured-reality-runtime-${assetId}`).set({
    ownerId: uid,
    kind: 'captured_reality.runtime_accessed',
    assetId,
    truthClass,
    releaseGate: 'enabled',
    recordedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  return {
    assetId,
    deviceTier,
    url,
    expiresAt: new Date(expiresAt).toISOString(),
    truthLabel: String(snapshot.get('truthLabel') ?? 'Spatial reconstruction from recorded sources').slice(0, 240),
  }
})


/**
 * Resolves an authenticated Replay memory to a reviewed private Captured
 * Reality asset. No source IDs, storage locators, exact location, or provider
 * details are returned to the client.
 */
export const getCapturedRealityReplayEntry = functions.https.onCall(async (data, context) => {
  const uid = requireUid(context)
  if (!capturedRealityEnabled()) return { available: false }

  await requireLocationRuntimeConsent(uid)
  const memoryId = requireToken(data?.memoryId, 'memoryId')
  const deviceTier = requireToken(data?.deviceTier, 'deviceTier', 16)
  if (deviceTier !== 'desktop' && deviceTier !== 'mobile') {
    throw new functions.https.HttpsError('invalid-argument', 'CAPTURED_REALITY_BROWSER_DEVICE_TIER_REQUIRED')
  }

  const binding = await db.doc(`users/${uid}/capturedRealityReplayBindings/${memoryId}`).get()
  if (!binding.exists) return { available: false }
  if (
    binding.get('ownerId') !== uid ||
    binding.get('memoryId') !== memoryId ||
    binding.get('state') !== 'accepted'
  ) {
    return { available: false }
  }

  const assetId = requireToken(binding.get('capturedRealityAssetId'), 'capturedRealityAssetId')
  const asset = await db.doc(`users/${uid}/capturedRealityAssets/${assetId}`).get()
  if (!asset.exists || asset.get('ownerId') !== uid) return { available: false }

  if (
    asset.get('state') !== 'ready' ||
    asset.get('reviewState') !== 'accepted' ||
    asset.get('truthClass') !== 'spatially-reconstructable' ||
    asset.get('anchorEntityId') !== binding.get('placeEntityId')
  ) {
    return { available: false }
  }

  const releaseState = String(asset.get('releaseState') ?? 'hard-off')
  if (!['private-pilot', 'private-beta', 'launch-enabled'].includes(releaseState)) {
    return { available: false }
  }

  const certified = deviceTier === 'mobile'
    ? asset.get('mobileCertified') === true
    : asset.get('browserCertified') === true
  if (!certified) return { available: false }

  return {
    available: true,
    assetId,
    truthLabel: String(asset.get('truthLabel') ?? 'Spatial reconstruction from recorded sources').slice(0, 240),
  }
})
