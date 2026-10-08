import type { Firestore, Transaction } from 'firebase-admin/firestore';

type CurrentAuthAccount = { uid: string; disabled: boolean; metadata: { creationTime: string } };
export type StripeAccountAuthority =
  | { allowed: true; creationTime: number }
  | { allowed: false; reason: 'current-account-denied' | 'current-account-unavailable'; retryable?: boolean };

// These are the existing privacyOperations/C7 deletion paths. Billing may retain
// separate financial records, but it cannot recreate active access after cleanup.
export async function readStripeAccountAuthority(
  db: Firestore,
  transaction: Transaction,
  uid: string,
  eventCreated: number,
  getCurrentUser: (uid: string) => Promise<CurrentAuthAccount>,
  expectedCreationTime?: number,
): Promise<StripeAccountAuthority> {
  const denied = { allowed: false, reason: 'current-account-denied' } as const;
  if (!uid || uid.includes('/') || !Number.isSafeInteger(eventCreated) || eventCreated <= 0) return denied;
  const [owner, fence, tombstone, deletions] = await Promise.all([
    transaction.get(db.doc(`users/${uid}`)),
    transaction.get(db.doc(`users/${uid}/privacyRuntime/exportAuthority`)),
    transaction.get(db.doc(`privacyDeletionTombstones/${uid}`)),
    transaction.get(db.collection(`users/${uid}/deletionJobs`)
      .where('state', 'in', ['awaiting-grace', 'queued', 'in-progress', 'failed']).limit(1)),
  ]);
  const account = owner.data();
  const epoch = fence.data();
  const canonical = tombstone.data();
  if (!owner.exists || account?.deleted === true
    || ['deleting', 'deleted', 'disabled'].includes(String(account?.accountStatus ?? ''))
    || !deletions.empty) return denied;
  if (fence.exists && (!epoch || !Number.isSafeInteger(epoch.generation) || epoch.generation < 0
    || !epoch.pendingDeletions || typeof epoch.pendingDeletions !== 'object'
    || Array.isArray(epoch.pendingDeletions) || Object.keys(epoch.pendingDeletions).length > 0)) return denied;
  if (tombstone.exists && (canonical?.uid !== uid || canonical.active !== false)) return denied;

  let authAccount: CurrentAuthAccount;
  try {
    authAccount = await getCurrentUser(uid);
  } catch (error) {
    if ((error as { code?: string })?.code === 'auth/user-not-found') return denied;
    return { allowed: false, reason: 'current-account-unavailable', retryable: true };
  }
  const creationTime = Date.parse(authAccount.metadata?.creationTime);
  // Firebase Auth creationTime binds the UID incarnation without adding another
  // user schema. A callback created before a recreated account cannot grant it.
  if (authAccount.uid !== uid || authAccount.disabled !== false
    || !Number.isSafeInteger(creationTime) || creationTime < 0
    || eventCreated < Math.floor(creationTime / 1000)
    || (expectedCreationTime !== undefined && expectedCreationTime !== creationTime)) return denied;
  return { allowed: true, creationTime };
}
