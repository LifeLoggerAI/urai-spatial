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
  reason: 'applied' | 'duplicate-event' | 'stale-event' | 'equal-time-precedence';
  entitlement: StoredEntitlement;
};

export async function applyStripeEventEntitlement(
  record: StoredEntitlement,
  event: { id: string; created: number },
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

    const decision = decideStripeEventApplication({
      currentEventCreated: current.stripeLastEventCreated ?? 0,
      currentStatus: current.subscriptionStatus,
      incomingEventCreated: event.created,
      incomingStatus: record.subscriptionStatus,
    });
    if (!decision.apply) {
      return { applied: false, reason: decision.reason, entitlement: current };
    }

    const next: StoredEntitlement = {
      ...record,
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
