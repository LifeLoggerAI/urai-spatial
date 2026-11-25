import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import type { firestore as FirestoreAdmin } from 'firebase-admin'

// Server-only processing guard: it does not govern owner access for export
// or correction. A current, fully-enforced memory-domain grant is required.
export async function requireMemoryDomainProcessingConsent(
  db: FirestoreAdmin.Firestore,
  uid: string,
  context: functions.https.CallableContext,
  transaction?: FirestoreAdmin.Transaction,
): Promise<string> {
  // Admin SDK bypasses client Firestore rules. Revalidate both account and
  // credential before reading private data for processing.
  if (!context.auth || context.auth.uid !== uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Current owner credential required.')
  }
  const authTime = Number(context.auth.token.auth_time ?? 0)
  if (!Number.isFinite(authTime) || authTime <= 0) {
    throw new functions.https.HttpsError('unauthenticated', 'Owner credential is invalid.')
  }
  let user: admin.auth.UserRecord
  try {
    user = await admin.auth().getUser(uid)
  } catch {
    throw new functions.https.HttpsError('permission-denied', 'Current owner identity unavailable.')
  }
  if (user.disabled) {
    throw new functions.https.HttpsError('permission-denied', 'Owner account disabled.')
  }
  const validAfter = user.tokensValidAfterTime ? Date.parse(user.tokensValidAfterTime) : Number.NaN
  if (Number.isFinite(validAfter) && authTime * 1000 < validAfter) {
    throw new functions.https.HttpsError('permission-denied', 'Owner credential revoked.')
  }
  const read = (path: string) => transaction ? transaction.get(db.doc(path)) : db.doc(path).get()
  const [root, accountFence, tombstone, grant, snapshot] = await Promise.all([
    read(`users/${uid}`), read(`accountDeletionFences/${uid}`),
    read(`privacyDeletionTombstones/${uid}`), read(`consentRecords/${uid}_memory_storage`),
    read(`users/${uid}/privacyPolicy/current`),
  ])
  if (!root.exists || root.get('uid') !== uid || root.get('deleted') === true
    || root.get('markedForDeletion') === true || ['deleting', 'deleted', 'disabled'].includes(root.get('accountStatus'))
    || accountFence.exists || tombstone.get('active') === true) {
    throw new functions.https.HttpsError('permission-denied', 'Owner deletion fence active or current owner unavailable.')
  }
  const expiry = grant.get('expiresAt')
  let expiresAt = Number.NaN
  try { expiresAt = expiry && typeof expiry.toMillis === 'function' ? expiry.toMillis() : Number.NaN } catch { /* deny malformed authority */ }
  const receiptHash = grant.get('receiptHash')
  if (!grant.exists || grant.get('uid') !== uid || grant.get('purpose') !== 'memory.storage'
    || grant.get('consentTier') !== 'C1' || grant.get('policyVersion') !== '1.0.0'
    || grant.get('status') !== 'granted' || !Number.isFinite(expiresAt) || expiresAt <= Date.now()
    || typeof receiptHash !== 'string' || !/^[a-f0-9]{64}$/.test(receiptHash)) {
    throw new functions.https.HttpsError('permission-denied', 'CANONICAL_MEMORY_STORAGE_CONSENT_REQUIRED')
  }
  if (!snapshot.exists || snapshot.get('ownerId') !== uid || snapshot.get('version') !== 2
    || !Number.isSafeInteger(snapshot.get('revision')) || snapshot.get('revision') < 1) {
    throw new functions.https.HttpsError('permission-denied', 'MEMORY_DOMAIN_CONSENT_REQUIRED')
  }
  const mode = snapshot.get('domains.memory.mode')
  const enforcement = snapshot.get('enforcement.state')
  if ((mode !== 'granted' && mode !== 'limited') || enforcement !== 'fully-enforced') {
    throw new functions.https.HttpsError('permission-denied', 'MEMORY_DOMAIN_CONSENT_NOT_ACTIVE')
  }
  return JSON.stringify([uid, receiptHash, expiresAt, snapshot.get('revision'), mode])
}
