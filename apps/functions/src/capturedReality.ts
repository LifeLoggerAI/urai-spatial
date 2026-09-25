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
  const mode = String(location?.mode ?? 'denied')
  const policyAllowed = mode === 'granted' || mode === 'limited'
  const runtimeAllowed = runtime.exists && runtime.get('enabled') === true

  if (!policyAllowed || !runtimeAllowed) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'LOCATION_CONTEXT_CONSENT_REQUIRED',
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
  const snapshot = await db.doc(`users/${uid}/capturedRealityAssets/${assetId}`).get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('not-found', 'Captured-reality asset was not found.')
  }

  if (snapshot.get('state') !== 'ready' || snapshot.get('reviewState') !== 'accepted') {
    throw new functions.https.HttpsError('failed-precondition', 'CAPTURED_REALITY_ASSET_NOT_ACCEPTED')
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
    url,
    expiresAt: new Date(expiresAt).toISOString(),
    truthLabel: String(snapshot.get('truthLabel') ?? 'Spatial reconstruction from recorded sources').slice(0, 240),
  }
})
