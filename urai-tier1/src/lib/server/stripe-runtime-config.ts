import type { InsightPlanId } from '@/lib/entitlementStore';

export type StripeRuntimeMode = 'test' | 'production';
export type PaidInsightPlanId = Exclude<InsightPlanId, 'free'>;

export const STRIPE_PRICE_ENV_BY_PLAN: Record<PaidInsightPlanId, string> = {
  pro: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
  therapist: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST',
  founder: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER',
};

export function isPaidPlanId(value: unknown): value is PaidInsightPlanId {
  return value === 'pro' || value === 'therapist' || value === 'founder';
}

export function parseStripeRuntimeMode(value: string | undefined): StripeRuntimeMode | null {
  return value === 'test' || value === 'production' ? value : null;
}

export function checkoutModeForPlan(planId: PaidInsightPlanId): 'subscription' | 'payment' {
  return planId === 'founder' ? 'payment' : 'subscription';
}
