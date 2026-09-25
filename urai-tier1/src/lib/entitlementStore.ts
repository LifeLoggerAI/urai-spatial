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
  lastStripeEventId: string | null;
  lastStripeEventType: string | null;
  lastStripeEventCreated: number;
  updatedAt: number;
};

export type StripeEntitlementEvent = {
  eventId: string;
  eventType: string;
  eventCreated: number;
  userId: string;
  planId: InsightPlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
};

export type StripeEventApplyResult = 'applied' | 'duplicate' | 'stale';

const COLLECTION = 'userEntitlements';
const EVENT_COLLECTION = 'stripeWebhookEvents';

export function defaultEntitlement(userId = 'local'): StoredEntitlement {
  return {
    userId,
    planId: 'free',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: 'none',
    lastStripeEventId: null,
    lastStripeEventType: null,
    lastStripeEventCreated: 0,
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

export async function applyStripeEntitlementEvent(input: StripeEntitlementEvent): Promise<StripeEventApplyResult> {
  const db = await getAdminFirestore();
  const entitlementRef = db.collection(COLLECTION).doc(input.userId);
  const eventRef = db.collection(EVENT_COLLECTION).doc(input.eventId);

  return db.runTransaction(async (transaction) => {
    const [eventReceipt, entitlementSnapshot] = await Promise.all([
      transaction.get(eventRef),
      transaction.get(entitlementRef),
    ]);

    if (eventReceipt.exists) return 'duplicate';

    const current = entitlementSnapshot.exists
      ? { ...defaultEntitlement(input.userId), ...(entitlementSnapshot.data() as Partial<StoredEntitlement>), userId: input.userId }
      : defaultEntitlement(input.userId);

    const decision = decideStripeEventApplication({
      currentEventCreated: current.lastStripeEventCreated,
      currentStatus: current.subscriptionStatus,
      incomingEventCreated: input.eventCreated,
      incomingStatus: input.subscriptionStatus,
    });

    const receipt = {
      eventId: input.eventId,
      eventType: input.eventType,
      eventCreated: input.eventCreated,
      userId: input.userId,
      planId: input.planId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      processorStatus: input.subscriptionStatus,
      processingTime: Date.now(),
      applied: decision.apply,
      reason: decision.reason,
    };

    transaction.create(eventRef, receipt);

    if (!decision.apply) return 'stale';

    transaction.set(entitlementRef, {
      userId: input.userId,
      planId: input.planId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      subscriptionStatus: input.subscriptionStatus,
      lastStripeEventId: input.eventId,
      lastStripeEventType: input.eventType,
      lastStripeEventCreated: input.eventCreated,
      updatedAt: Date.now(),
    }, { merge: true });

    return 'applied';
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
