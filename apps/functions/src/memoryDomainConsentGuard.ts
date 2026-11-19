import * as functions from 'firebase-functions/v1'
import type { firestore as FirestoreAdmin } from 'firebase-admin'

// Server-only processing guard: it does not govern owner access for export
// or correction. A current, fully-enforced memory-domain grant is required.
export async function requireMemoryDomainProcessingConsent(
  db: FirestoreAdmin.Firestore,
  uid: string,
): Promise<void> {
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
