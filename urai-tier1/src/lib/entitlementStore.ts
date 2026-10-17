import { assertExternalAccountAdc } from '@/lib/server/google-adc';
import { decideStripeEventApplication } from '@/lib/server/stripe-event-order';

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
  const doc = await db.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return defaultEntitlement(userId);
  return { ...defaultEntitlement(userId), ...(doc.data() as Partial<StoredEntitlement>), userId };
}

export async function upsertEntitlement(record: StoredEntitlement): Promise<StoredEntitlement> {
  const db = await getAdminFirestore();
  const next = { ...record, updatedAt: record.updatedAt || Date.now() };
  await db.collection(COLLECTION).doc(record.userId).set(next, { merge: true });
  return next;
}

export type StripeEventApplicationResult = {
  applied: boolean;
  reason: 'applied' | 'duplicate-event' | 'stale-event' | 'equal-time-precedence' | 'provider-state-unresolved';
  entitlement: StoredEntitlement;
  retryable?: boolean;
};

export async function applyStripeEventEntitlement(
  record: StoredEntitlement,
  event: { id: string; created: number; resolveCurrentSubscription?: () => Promise<StoredEntitlement> },
): Promise<StripeEventApplicationResult> {
  const db = await getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(record.userId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists
      ? { ...defaultEntitlement(record.userId), ...(snapshot.data() as Partial<StoredEntitlement>), userId: record.userId }
      : defaultEntitlement(record.userId);

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
          || latest.stripeSubscriptionId !== record.stripeSubscriptionId) {
          throw new Error('Stripe subscription authority mismatch');
        }
        nextRecord = latest;
        currentProviderResolved = true;
      } catch {
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

    const next: StoredEntitlement = {
      ...nextRecord,
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
  return { ...defaultEntitlement(doc.id), ...(doc.data() as Partial<StoredEntitlement>), userId: doc.id };
}

export function mapStripeStatus(status?: string | null): SubscriptionStatus {
  if (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled' || status === 'incomplete') return status;
  return 'none';
}

