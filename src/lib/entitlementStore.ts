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

const memoryStore = new Map<string, StoredEntitlement>();

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

export async function readEntitlement(userId = 'local'): Promise<StoredEntitlement> {
  return memoryStore.get(userId) ?? defaultEntitlement(userId);
}

export async function upsertEntitlement(record: StoredEntitlement): Promise<StoredEntitlement> {
  memoryStore.set(record.userId, record);
  return record;
}

export async function findEntitlementByStripeCustomer(stripeCustomerId: string): Promise<StoredEntitlement | null> {
  for (const entitlement of memoryStore.values()) {
    if (entitlement.stripeCustomerId === stripeCustomerId) return entitlement;
  }
  return null;
}

export function mapStripeStatus(status?: string | null): SubscriptionStatus {
  if (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled' || status === 'incomplete') return status;
  return 'none';
}
