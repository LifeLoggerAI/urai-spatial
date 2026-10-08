import { assertExternalAccountAdc } from '@/lib/server/google-adc';
import { decideStripeEventApplication } from '@/lib/server/stripe-event-order';
import { readStripeBillingAuthority, prepareStripeCheckoutBinding, recordStripeCheckoutSession, stripeRecordMatchesBilling, hasStripeFinancialAssociation, readStripeIssuedCheckout, type StripeBillingBinding, type StripeCustomerTransport } from '@/lib/server/stripe-account-authority';

export type InsightPlanId = 'free' | 'pro' | 'therapist' | 'founder';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

export type StoredEntitlement = {
  userId: string;
  planId: InsightPlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  stripeLastEventCreated?: number;
  stripeLastEventId?: string | null;
  stripeIncarnationId?: string | null;
  stripeAccountCreationTime?: number | null;
  stripeBillingMode?: 'test' | null;
  stripeCheckoutSessionId?: string | null;
  updatedAt: number;
};

const COLLECTION = 'userEntitlements';

export function defaultEntitlement(userId = 'local'): StoredEntitlement {
  return {
    userId,
    planId: 'free',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: 'none',
    stripeLastEventCreated: 0,
    stripeLastEventId: null,
    updatedAt: Date.now(),
  };
}

async function getAdminFirestore() {
  const app = await import('firebase-admin/app');
  const firestore = await import('firebase-admin/firestore');

  assertExternalAccountAdc();
  if (!app.getApps().length) {
    app.initializeApp({ credential: app.applicationDefault() });
  }

  return firestore.getFirestore();
}

export async function readEntitlement(userId = 'local'): Promise<StoredEntitlement> {
  const db = await getAdminFirestore();
  const { getAuth } = await import('firebase-admin/auth');
  return db.runTransaction(async transaction => {
    const doc = await transaction.get(db.collection(COLLECTION).doc(userId));
    if (!doc.exists) return defaultEntitlement(userId);
    const authority = await readStripeBillingAuthority(db, transaction, userId, uid => getAuth().getUser(uid));
    const row = { ...defaultEntitlement(userId), ...(doc.data() as Partial<StoredEntitlement>), userId };
    return authority.allowed && stripeRecordMatchesBilling(row, authority.binding) ? row : defaultEntitlement(userId);
  });
}

export async function upsertEntitlement(record: StoredEntitlement): Promise<StoredEntitlement> {
  const db = await getAdminFirestore();
  const next = { ...record, updatedAt: record.updatedAt || Date.now() };
  const { getAuth } = await import('firebase-admin/auth');
  return db.runTransaction(async transaction => {
    const authority = await readStripeBillingAuthority(db, transaction, record.userId, uid => getAuth().getUser(uid));
    const retained = await transaction.get(db.collection(COLLECTION).doc(record.userId));
    if (!authority.allowed || !stripeRecordMatchesBilling(next, authority.binding)
      || (hasStripeFinancialAssociation(retained.data()) && !stripeRecordMatchesBilling(retained.data(), authority.binding))) {
      throw new Error('Stripe current-account association is unavailable.');
    }
    const live = await readStripeBillingAuthority(db, transaction, record.userId, uid => getAuth().getUser(uid),
      { incarnationId: authority.binding.incarnationId, customerId: authority.binding.stripeCustomerId, creationTime: authority.creationTime });
    if (!live.allowed) throw new Error('Stripe current-account association changed.');
    transaction.set(db.collection(COLLECTION).doc(record.userId), next, { merge: true });
    return next;
  });
}

export type StripeEventApplicationResult = {
  applied: boolean;
  reason: 'applied' | 'duplicate-event' | 'stale-event' | 'equal-time-precedence' | 'provider-state-unresolved' | 'current-account-denied' | 'current-account-unavailable';
  entitlement: StoredEntitlement;
  retryable?: boolean;
};

export async function applyStripeEventEntitlement(
  record: StoredEntitlement,
  event: { id: string; created: number; resolveCurrentSubscription?: () => Promise<StoredEntitlement> },
): Promise<StripeEventApplicationResult> {
  const db = await getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(record.userId);
  const { getAuth } = await import('firebase-admin/auth');
  const getCurrentUser = (uid: string) => getAuth().getUser(uid);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists
      ? { ...defaultEntitlement(record.userId), ...(snapshot.data() as Partial<StoredEntitlement>), userId: record.userId }
      : defaultEntitlement(record.userId);

    const expected = { incarnationId: record.stripeIncarnationId ?? null, customerId: record.stripeCustomerId,
      planId: record.planId, eventCreated: event.created };
    const authority = await readStripeBillingAuthority(db, transaction, record.userId, getCurrentUser, expected);
    if (!authority.allowed) return { applied: false, reason: authority.reason, entitlement: defaultEntitlement(record.userId), retryable: authority.retryable };
    if (hasStripeFinancialAssociation(current) && !stripeRecordMatchesBilling(current, authority.binding)) {
      return { applied: false, reason: 'current-account-denied' as const, entitlement: defaultEntitlement(record.userId) };
    }
    if (record.stripeCheckoutSessionId && !await readStripeIssuedCheckout(db, transaction, record.userId,
      record.stripeCheckoutSessionId, authority.binding, record.planId)) {
      return { applied: false, reason: 'provider-state-unresolved' as const, entitlement: defaultEntitlement(record.userId), retryable: true };
    }
    if (current.stripeLastEventId === event.id) {
      return { applied: false, reason: 'duplicate-event' as const, entitlement: current };
    }

    let nextRecord = record;
    let currentProviderResolved = false;
    const equalTime = (current.stripeLastEventCreated ?? 0) === event.created;
    if (
      equalTime && current.subscriptionStatus !== 'canceled' && record.subscriptionStatus !== 'canceled'
      && current.stripeSubscriptionId && record.stripeSubscriptionId
      && (current.subscriptionStatus !== record.subscriptionStatus || current.planId !== record.planId)
    ) {
      const sameBinding = Boolean(current.stripeCustomerId
        && current.stripeCustomerId === record.stripeCustomerId
        && current.stripeSubscriptionId === record.stripeSubscriptionId);
      try {
        if (!sameBinding || !event.resolveCurrentSubscription) throw new Error('Unresolved Stripe subscription authority');
        const latest = await event.resolveCurrentSubscription();
        if (latest.userId !== record.userId || latest.planId !== record.planId
          || latest.stripeCustomerId !== record.stripeCustomerId
          || latest.stripeSubscriptionId !== record.stripeSubscriptionId
          || latest.stripeIncarnationId !== record.stripeIncarnationId) {
          throw new Error('Stripe subscription authority mismatch');
        }
        nextRecord = latest;
        currentProviderResolved = true;
      } catch {
        const live = await readStripeBillingAuthority(db, transaction, record.userId, getCurrentUser, { ...expected, creationTime: authority.creationTime });
        if (!live.allowed) return { applied: false, reason: live.reason, entitlement: current, retryable: live.retryable };
        // Retain a known nonpaid state while Stripe retries. Never acknowledge
        // this unresolved event or reopen access from a conflicting snapshot.
        const currentPaid = current.subscriptionStatus === 'active' || current.subscriptionStatus === 'trialing';
        const incomingPaid = record.subscriptionStatus === 'active' || record.subscriptionStatus === 'trialing';
        const denied = sameBinding && currentPaid && !incomingPaid
          ? { ...current, subscriptionStatus: record.subscriptionStatus, updatedAt: Date.now() } : current;
        if (denied !== current) transaction.set(ref, denied, { merge: true });
        return { applied: false, reason: 'provider-state-unresolved' as const, entitlement: denied, retryable: true };
      }
    }

    const decision = decideStripeEventApplication({
      currentEventCreated: current.stripeLastEventCreated ?? 0,
      currentStatus: current.subscriptionStatus,
      incomingEventCreated: event.created,
      incomingStatus: nextRecord.subscriptionStatus,
    });
    if (!decision.apply && !currentProviderResolved) {
      return { applied: false, reason: decision.reason, entitlement: current };
    }

    const live = await readStripeBillingAuthority(db, transaction, record.userId, getCurrentUser, { ...expected, creationTime: authority.creationTime });
    if (!live.allowed) return { applied: false, reason: live.reason, entitlement: current, retryable: live.retryable };
    const next: StoredEntitlement = {
      ...nextRecord,
      stripeIncarnationId: authority.binding.incarnationId,
      stripeAccountCreationTime: authority.creationTime,
      stripeBillingMode: 'test',
      stripeLastEventCreated: event.created,
      stripeLastEventId: event.id,
      updatedAt: Date.now(),
    };
    transaction.set(ref, next, { merge: true });
    return { applied: true, reason: 'applied' as const, entitlement: next };
  });
}

export async function findEntitlementByStripeCustomer(stripeCustomerId: string): Promise<StoredEntitlement | null> {
  const db = await getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).where('stripeCustomerId', '==', stripeCustomerId).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const current = await readEntitlement(doc.id);
  return current.stripeCustomerId === stripeCustomerId ? current : null;
}

export function mapStripeStatus(status?: string | null): SubscriptionStatus {
  if (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled' || status === 'incomplete') return status;
  return 'none';
}




export async function prepareCurrentStripeCheckout(userId: string, customers: StripeCustomerTransport,
  isRequestCurrent: () => Promise<boolean>) {
  const db = await getAdminFirestore();
  const { getAuth } = await import('firebase-admin/auth');
  return prepareStripeCheckoutBinding(db, userId, uid => getAuth().getUser(uid), customers, isRequestCurrent);
}
export async function recordCurrentStripeCheckout(userId: string, binding: StripeBillingBinding, planId: string, sessionId: string) {
  const db = await getAdminFirestore();
  const { getAuth } = await import('firebase-admin/auth');
  return recordStripeCheckoutSession(db, userId, uid => getAuth().getUser(uid), binding, planId, sessionId);
}
export async function hasCurrentStripeCustomer(userId: string, expected: {
  stripeCustomerId: string | null; stripeIncarnationId?: string | null; stripeAccountCreationTime?: number | null;
}): Promise<boolean> {
  const current = await readEntitlement(userId);
  return Boolean(current.stripeCustomerId && current.stripeCustomerId === expected.stripeCustomerId
    && current.stripeIncarnationId === expected.stripeIncarnationId
    && current.stripeAccountCreationTime === expected.stripeAccountCreationTime);
}

export async function revalidateCurrentStripeCheckout(userId: string, binding: StripeBillingBinding): Promise<boolean> {
  const db = await getAdminFirestore();
  const { getAuth } = await import('firebase-admin/auth');
  const current = await db.runTransaction(transaction => readStripeBillingAuthority(db, transaction, userId, uid => getAuth().getUser(uid),
    { incarnationId: binding.incarnationId, customerId: binding.stripeCustomerId, creationTime: binding.creationTime }));
  return current.allowed;
}


