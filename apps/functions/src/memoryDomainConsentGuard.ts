import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import type { firestore as FirestoreAdmin } from 'firebase-admin'

// Server-only processing guard: it does not govern owner access for export
// or correction. A current, fully-enforced memory-domain grant is required.
export async function requireMemoryDomainProcessingConsent(
  db: FirestoreAdmin.Firestore,
  uid: string,
  context: functions.https.CallableContext,
): Promise<void> {
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
  const tombstone = await db.doc('privacyDeletionTombstones/' + uid).get()
  if (tombstone.get('active') === true) {
    throw new functions.https.HttpsError('permission-denied', 'Owner deletion fence active.')
  }
  const snapshot = await db.doc(`users/${uid}/privacyPolicy/current`).get()
  if (!snapshot.exists || snapshot.get('ownerId') !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'MEMORY_DOMAIN_CONSENT_REQUIRED')
  }
  const mode = snapshot.get('domains.memory.mode')
  const enforcement = snapshot.get('enforcement.state')
  if ((mode !== 'granted' && mode !== 'limited') || enforcement !== 'fully-enforced') {
    throw new functions.https.HttpsError('permission-denied', 'MEMORY_DOMAIN_CONSENT_NOT_ACTIVE')
  }
}
