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

export function stripeSecretKeyMode(secretKey: string | undefined): StripeRuntimeMode | null {
  if (secretKey?.startsWith('sk_test_')) return 'test';
  if (secretKey?.startsWith('sk_live_')) return 'production';
  return null;
}

export function stripeLivemodeMatchesRuntime(livemode: boolean, mode: StripeRuntimeMode): boolean {
  return livemode === (mode === 'production');
}

export function stripeRuntimeMatchesSecret(mode: StripeRuntimeMode, secretKey: string | undefined): boolean {
  return stripeSecretKeyMode(secretKey) === mode;
}

export function checkoutModeForPlan(planId: PaidInsightPlanId): 'subscription' | 'payment' {
  return planId === 'founder' ? 'payment' : 'subscription';
}
