import type { InsightPlanId } from './insightMonetizationEngine';

export type StripeCheckoutMode = 'subscription' | 'payment';

export async function requestStripeCheckout(planId: InsightPlanId, userId: string, returnUrl?: string): Promise<void> {
  if (planId === 'free') return;

  const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();

  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ planId, returnUrl, userId }),
  });

  if (!response.ok) {
    throw new Error('Unable to start Stripe checkout.');
  }

  const payload = await response.json();
  window.location.assign(payload.url);
}
