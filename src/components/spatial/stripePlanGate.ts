import { getAuth } from 'firebase/auth';
import type { InsightPlanId } from './insightMonetizationEngine';

export type StripeCheckoutMode = 'subscription' | 'payment';

export type StripePlanConfig = {
  planId: InsightPlanId;
  stripePriceEnvKey: string;
  checkoutMode: StripeCheckoutMode;
  requiredFeatures: string[];
};

export type UserEntitlement = {
  planId: InsightPlanId;
  stripeCustomerId?: string | null;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';
};

export const STRIPE_PLAN_CONFIGS: Record<InsightPlanId, StripePlanConfig> = {
  free: {
    planId: 'free',
    stripePriceEnvKey: '',
    checkoutMode: 'subscription',
    requiredFeatures: ['snapshot-report'],
  },
  pro: {
    planId: 'pro',
    stripePriceEnvKey: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
    checkoutMode: 'subscription',
    requiredFeatures: ['weekly-report', 'markdown-export', 'severity-trends'],
  },
  therapist: {
    planId: 'therapist',
    stripePriceEnvKey: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST',
    checkoutMode: 'subscription',
    requiredFeatures: ['therapist-replay', 'clinical-style-report', 'evidence-trails'],
  },
  founder: {
    planId: 'founder',
    stripePriceEnvKey: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER',
    checkoutMode: 'payment',
    requiredFeatures: ['founder-archive', 'advanced-exports', 'legacy-summaries'],
  },
};

const PLAN_RANK: Record<InsightPlanId, number> = {
  free: 0,
  pro: 1,
  therapist: 2,
  founder: 3,
};

export function canAccessPlan(user: UserEntitlement | null | undefined, requestedPlan: InsightPlanId): boolean {
  if (requestedPlan === 'free') return true;
  if (!user) return false;
  const paidStatus = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing';
  if (!paidStatus && user.planId !== 'founder') return false;
  return PLAN_RANK[user.planId] >= PLAN_RANK[requestedPlan];
}

export function getLockedPlanMessage(requestedPlan: InsightPlanId): string {
  if (requestedPlan === 'pro') return 'Upgrade to URAI Pro to unlock weekly insight reports and deeper exports.';
  if (requestedPlan === 'therapist') return 'Upgrade to Therapist Replay Pack to unlock evidence trails and clinical-style reports.';
  if (requestedPlan === 'founder') return 'Founder Archive unlocks the long-term intelligence archive and advanced exports.';
  return 'This feature is available on the free plan.';
}

export async function requestStripeCheckout(planId: InsightPlanId, returnUrl?: string): Promise<void> {
  if (planId === 'free') return;

  const currentUser = getAuth().currentUser;
  if (!currentUser) throw new Error('Sign in before upgrading.');

  const token = await currentUser.getIdToken();

  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planId, returnUrl: returnUrl ?? window.location.href }),
  });

  if (!response.ok) {
    throw new Error('Unable to start Stripe checkout. Check API route and Stripe configuration.');
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) throw new Error('Stripe checkout did not return a URL.');
  window.location.assign(payload.url);
}

export const LOCAL_FREE_ENTITLEMENT: UserEntitlement = {
  planId: 'free',
  subscriptionStatus: 'none',
  stripeCustomerId: null,
};
