import { randomUUID } from 'node:crypto';
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
  // Creation time is a lower-bound/current-Auth check only. Provider incarnation
  // association below is also required; timestamps alone do not bind callbacks.
  if (authAccount.uid !== uid || authAccount.disabled !== false
    || !Number.isSafeInteger(creationTime) || creationTime < 0
    || eventCreated < Math.floor(creationTime / 1000)
    || (expectedCreationTime !== undefined && expectedCreationTime !== creationTime)) return denied;
  return { allowed: true, creationTime };
}

export type StripeCustomerTransport = {
  retrieve: (id: string) => Promise<{ id: string; livemode?: boolean; deleted?: boolean | void; metadata?: Record<string, string> }>;
  create: (params: { metadata: { userId: string; uraiAccountIncarnation: string } },
    options: { idempotencyKey: string }) => Promise<{ id: string; livemode?: boolean; deleted?: boolean | void; metadata?: Record<string, string> }>;
};
export async function prepareStripeCheckoutBinding(
  db: Firestore, uid: string, getCurrentUser: (uid: string) => Promise<CurrentAuthAccount>,
  customers: StripeCustomerTransport, isRequestCurrent: () => Promise<boolean>,
): Promise<StripeBillingAuthority> {
  if (!await isRequestCurrent()) return deniedBilling;
  const current = await ensureStripeCheckoutAuthority(db, uid, getCurrentUser);
  if (!current.allowed || !await isRequestCurrent()) return current.allowed ? deniedBilling : current;
  const dispatch = await db.runTransaction(transaction => readStripeBillingAuthority(db, transaction, uid, getCurrentUser,
    { incarnationId: current.binding.incarnationId, creationTime: current.binding.creationTime, requireCustomer: false }));
  if (!dispatch.allowed) return dispatch;
  // A deterministic customer key reconciles ambiguous retries within this exact
  // incarnation. No automatic legacy association recovery or LIVE request.
  const customer = current.binding.stripeCustomerId
    ? await customers.retrieve(current.binding.stripeCustomerId)
    : await customers.create({ metadata: { userId: uid, uraiAccountIncarnation: current.binding.incarnationId } },
      { idempotencyKey: `urai-test-customer-${current.binding.incarnationId}` });
  if (!await isRequestCurrent() || customer.deleted || customer.livemode !== false
    || customer.metadata?.userId !== uid
    || customer.metadata?.uraiAccountIncarnation !== current.binding.incarnationId
    || (current.binding.stripeCustomerId && customer.id !== current.binding.stripeCustomerId)) return deniedBilling;
  return attachStripeCheckoutCustomer(db, uid, getCurrentUser, current.binding, customer.id);
}

export type StripeBillingBinding = {
  schemaVersion: 1; uid: string; creationTime: number; incarnationId: string;
  mode: 'test'; stripeCustomerId: string | null; issuedPlans: string[];
};
export type StripeBillingAuthority =
  | { allowed: true; creationTime: number; binding: StripeBillingBinding }
  | { allowed: false; reason: 'current-account-denied' | 'current-account-unavailable'; retryable?: boolean };
type BindingExpectation = {
  incarnationId?: string | null; customerId?: string | null; planId?: string;
  creationTime?: number; eventCreated?: number; requireCustomer?: boolean;
};
const deniedBilling = { allowed: false, reason: 'current-account-denied' } as const;
export const stripeBillingPath = (uid: string) => `users/${uid}/billingRuntime/stripeAuthority`;
function validBinding(value: unknown, uid: string, creationTime: number): value is StripeBillingBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const binding = value as StripeBillingBinding;
  return binding.schemaVersion === 1 && binding.uid === uid && binding.creationTime === creationTime
    && binding.mode === 'test' && typeof binding.incarnationId === 'string'
    && /^[A-Za-z0-9_-]{16,128}$/.test(binding.incarnationId)
    && (binding.stripeCustomerId === null || /^cus_[A-Za-z0-9_]+$/.test(binding.stripeCustomerId))
    && Array.isArray(binding.issuedPlans) && binding.issuedPlans.length <= 3
    && binding.issuedPlans.every(plan => ['pro', 'therapist', 'founder'].includes(plan));
}
export function hasStripeFinancialAssociation(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return Boolean(row.stripeCustomerId || row.stripeSubscriptionId || (row.planId && row.planId !== 'free'));
}
export function stripeRecordMatchesBilling(value: unknown, binding: StripeBillingBinding): boolean {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.userId === binding.uid && row.stripeIncarnationId === binding.incarnationId
    && row.stripeAccountCreationTime === binding.creationTime && row.stripeBillingMode === 'test'
    && Boolean(binding.stripeCustomerId) && row.stripeCustomerId === binding.stripeCustomerId
    && typeof row.planId === 'string' && binding.issuedPlans.includes(row.planId);
}
export async function readStripeBillingAuthority(
  db: Firestore, transaction: Transaction, uid: string,
  getCurrentUser: (uid: string) => Promise<CurrentAuthAccount>, expected: BindingExpectation = {},
): Promise<StripeBillingAuthority> {
  if (process.env.URAI_STRIPE_MODE !== 'test') return deniedBilling;
  const current = await readStripeAccountAuthority(db, transaction, uid,
    expected.eventCreated ?? Math.floor(Date.now() / 1000), getCurrentUser, expected.creationTime);
  if (!current.allowed) return current;
  const snapshot = await transaction.get(db.doc(stripeBillingPath(uid)));
  const binding = snapshot.data();
  if (!snapshot.exists || !validBinding(binding, uid, current.creationTime)
    || (expected.requireCustomer !== false && !binding.stripeCustomerId)
    || (expected.incarnationId !== undefined && expected.incarnationId !== binding.incarnationId)
    || (expected.customerId !== undefined && expected.customerId !== binding.stripeCustomerId)) return deniedBilling;
  // A callback may race the trusted Checkout response receipt. Fail closed and
  // keep it retryable until issuance is committed; never acknowledge a grant.
  if (expected.planId !== undefined && !binding.issuedPlans.includes(expected.planId)) {
    return { allowed: false, reason: 'current-account-unavailable', retryable: true };
  }
  const live = await readStripeAccountAuthority(db, transaction, uid,
    expected.eventCreated ?? Math.floor(Date.now() / 1000), getCurrentUser, current.creationTime);
  if (!live.allowed) return live;
  return { allowed: true, creationTime: current.creationTime, binding };
}
// Only authenticated TEST Checkout calls this creator. Missing legacy financial
// association is never silently backfilled or reused. Account recursive cleanup
// removes this server-only subtree; retained global finance rows remain untouched.
export async function ensureStripeCheckoutAuthority(
  db: Firestore, uid: string, getCurrentUser: (uid: string) => Promise<CurrentAuthAccount>,
): Promise<StripeBillingAuthority> {
  if (process.env.URAI_STRIPE_MODE !== 'test') return deniedBilling;
  return db.runTransaction(async transaction => {
    const current = await readStripeAccountAuthority(db, transaction, uid, Math.floor(Date.now() / 1000), getCurrentUser);
    if (!current.allowed) return current;
    const ref = db.doc(stripeBillingPath(uid));
    const snapshot = await transaction.get(ref);
    const retained = await transaction.get(db.collection('userEntitlements').doc(uid));
    if (snapshot.exists) {
      const binding = snapshot.data();
      if (!validBinding(binding, uid, current.creationTime)
        || (hasStripeFinancialAssociation(retained.data()) && !stripeRecordMatchesBilling(retained.data(), binding))) return deniedBilling;
      return { allowed: true, creationTime: current.creationTime, binding } as const;
    }
    if (hasStripeFinancialAssociation(retained.data())) return deniedBilling;
    const live = await readStripeAccountAuthority(db, transaction, uid, Math.floor(Date.now() / 1000), getCurrentUser, current.creationTime);
    if (!live.allowed) return live;
    const binding: StripeBillingBinding = { schemaVersion: 1, uid, creationTime: current.creationTime,
      incarnationId: randomUUID(), mode: 'test', stripeCustomerId: null, issuedPlans: [] };
    transaction.set(ref, binding);
    return { allowed: true, creationTime: current.creationTime, binding } as const;
  });
}
export async function attachStripeCheckoutCustomer(
  db: Firestore, uid: string, getCurrentUser: (uid: string) => Promise<CurrentAuthAccount>,
  binding: StripeBillingBinding, customerId: string,
): Promise<StripeBillingAuthority> {
  if (!/^cus_[A-Za-z0-9_]+$/.test(customerId)) return deniedBilling;
  return db.runTransaction(async transaction => {
    const current = await readStripeBillingAuthority(db, transaction, uid, getCurrentUser,
      { incarnationId: binding.incarnationId, creationTime: binding.creationTime, requireCustomer: false });
    if (!current.allowed) return current;
    if (current.binding.stripeCustomerId && current.binding.stripeCustomerId !== customerId) return deniedBilling;
    const live = await readStripeAccountAuthority(db, transaction, uid, Math.floor(Date.now() / 1000), getCurrentUser, binding.creationTime);
    if (!live.allowed) return live;
    const next = { ...current.binding, stripeCustomerId: customerId };
    transaction.set(db.doc(stripeBillingPath(uid)), next);
    return { allowed: true, creationTime: current.creationTime, binding: next } as const;
  });
}
export async function recordStripeCheckoutSession(
  db: Firestore, uid: string, getCurrentUser: (uid: string) => Promise<CurrentAuthAccount>,
  binding: StripeBillingBinding, planId: string, sessionId: string,
): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !['pro', 'therapist', 'founder'].includes(planId)) return false;
  return db.runTransaction(async transaction => {
    const current = await readStripeBillingAuthority(db, transaction, uid, getCurrentUser,
      { incarnationId: binding.incarnationId, customerId: binding.stripeCustomerId, creationTime: binding.creationTime });
    if (!current.allowed) return false;
    const receipt = db.doc(`users/${uid}/stripeCheckoutSessions/${sessionId}`);
    const previous = await transaction.get(receipt);
    if (previous.exists && (previous.data()?.incarnationId !== binding.incarnationId
      || previous.data()?.stripeCustomerId !== binding.stripeCustomerId || previous.data()?.planId !== planId)) return false;
    const live = await readStripeAccountAuthority(db, transaction, uid, Math.floor(Date.now() / 1000), getCurrentUser, binding.creationTime);
    if (!live.allowed) return false;
    transaction.set(db.doc(stripeBillingPath(uid)), { ...current.binding,
      issuedPlans: [...new Set([...current.binding.issuedPlans, planId])] });
    transaction.set(receipt, { schemaVersion: 1, uid, creationTime: binding.creationTime,
      incarnationId: binding.incarnationId, mode: 'test', stripeCustomerId: binding.stripeCustomerId, planId, sessionId });
    return true;
  });
}
export async function readStripeIssuedCheckout(
  db: Firestore, transaction: Transaction, uid: string, sessionId: string,
  binding: StripeBillingBinding, planId: string,
): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const receipt = await transaction.get(db.doc(`users/${uid}/stripeCheckoutSessions/${sessionId}`));
  const value = receipt.data();
  return receipt.exists && value?.uid === uid && value?.incarnationId === binding.incarnationId
    && value?.creationTime === binding.creationTime && value?.mode === 'test'
    && value?.stripeCustomerId === binding.stripeCustomerId && value?.planId === planId && value?.sessionId === sessionId;
}
