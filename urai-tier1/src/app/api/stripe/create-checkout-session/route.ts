import { NextResponse } from 'next/server';
import { resolveApprovedReturnUrl, withStripeResult } from '@/lib/server/approved-return-url';
import { verifyFirebaseUser } from '@/lib/server/firebase-user';
import {
  checkoutModeForPlan,
  isPaidPlanId,
  parseStripeRuntimeMode,
  stripeLivemodeMatchesRuntime,
  stripeRuntimeMatchesSecret,
  STRIPE_PRICE_ENV_BY_PLAN,
} from '@/lib/server/stripe-runtime-config';

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

  // The configured Price is provider-owned authority. Do not create a session until
  // Stripe itself confirms the object belongs to the declared test/production realm.
  let price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch (error) {
    console.error('Stripe Checkout could not verify configured Price', { planId, error });
    return NextResponse.json({ error: 'Configured Stripe Price could not be verified.' }, { status: 502 });
  }
  if (!stripeLivemodeMatchesRuntime(price.livemode, stripeMode)) {
    return NextResponse.json({ error: 'Stripe Price mode mismatch.' }, { status: 500 });
  }

  const mode = checkoutModeForPlan(planId);
  const metadata = {
    planId,
    userId: uid,
    environment: stripeMode,
  };

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: withStripeResult(redirectBase, 'success', planId),
    cancel_url: withStripeResult(redirectBase, 'cancelled', planId),
    metadata,
    subscription_data: mode === 'subscription' ? { metadata } : undefined,
    payment_intent_data: mode === 'payment' ? { metadata } : undefined,
  });

  return NextResponse.json({ url: session.url });
}
