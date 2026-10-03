import { NextResponse } from 'next/server';
import type { InsightPlanId } from '@/lib/entitlementStore';
import { resolveApprovedReturnUrl, withStripeResult } from '@/lib/server/approved-return-url';
import { verifyFirebaseUser } from '@/lib/server/firebase-user';
import {
  checkoutModeForPlan,
  isPaidPlanId,
  parseStripeRuntimeMode,
  stripeRuntimeMatchesSecret,
  STRIPE_PRICE_ENV_BY_PLAN,
} from '@/lib/server/stripe-runtime-config';

const PRICE_ENV_BY_PLAN: Record<Exclude<InsightPlanId, 'free'>, string> = {
  pro: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
  therapist: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST',
  founder: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER',
};

function isPaidPlanId(value: unknown): value is Exclude<InsightPlanId, 'free'> {
  return value === 'pro' || value === 'therapist' || value === 'founder';
}

export async function POST(request: Request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { planId, returnUrl } = await request.json() as {
    planId?: unknown;
    returnUrl?: string;
  };

  if (!isPaidPlanId(planId)) {
    return NextResponse.json({ error: 'Paid planId required.' }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const stripeMode = parseStripeRuntimeMode(process.env.URAI_STRIPE_MODE);
  const priceEnvKey = STRIPE_PRICE_ENV_BY_PLAN[planId];
  const priceId = process.env[priceEnvKey];

  if (!secretKey || !appUrl || !priceId || !stripeMode) {
    return NextResponse.json({ error: 'Stripe environment is not configured.' }, { status: 500 });
  }

  // Fail closed before importing or calling Stripe. A misconfigured live secret must
  // never create a live Checkout Session while the runtime is declared test-only.
  if (!stripeRuntimeMatchesSecret(stripeMode, secretKey)) {
    return NextResponse.json({ error: 'Stripe credential mode mismatch.' }, { status: 500 });
  }

  let redirectBase: URL;
  try {
    redirectBase = resolveApprovedReturnUrl(returnUrl, appUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid return URL.' }, { status: 400 });
  }

  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.create({
    mode: checkoutModeForPlan(planId),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: withStripeResult(redirectBase, 'success', planId),
    cancel_url: withStripeResult(redirectBase, 'cancelled', planId),
    metadata: {
      planId,
      userId: uid,
    },
    payment_intent_data: planId === 'founder' ? {
      metadata: {
        planId,
        userId: uid,
      },
    } : undefined,
    subscription_data: planId === 'founder' ? undefined : {
      metadata: {
        planId,
        userId: uid,
      },
    },
  });

  return NextResponse.json({ url: session.url, environment: stripeMode });
}