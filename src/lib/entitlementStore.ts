import type { InsightPlanId } from '@/components/spatial/insightMonetizationEngine';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';

export type StoredEntitlement = {
  userId: string;
  planId: InsightPlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
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
    updatedAt: Date.now(),
  };
}

async function getAdminFirestore() {
  const app = await import('firebase-admin/app');
  const firestore = await import('firebase-admin/firestore');

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
