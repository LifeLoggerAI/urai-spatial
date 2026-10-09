import { NextResponse } from 'next/server';
import { prepareCurrentStripeCheckout, recordCurrentStripeCheckout, revalidateCurrentStripeCheckout } from '@/lib/entitlementStore';
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

  if (process.env.URAI_STRIPE_COMMERCE_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Stripe commerce is not enabled.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const { planId, returnUrl } = await request.json() as {
    planId?: unknown;
    returnUrl?: string;
  };
  if (await verifyFirebaseUser(request) !== uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  if (stripeMode !== 'test') return NextResponse.json({ error: 'Stripe LIVE checkout is not authorized.' }, { status: 503 });

  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  const stripe = new Stripe(secretKey);
  if (await verifyFirebaseUser(request) !== uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    return NextResponse.json({ error: 'Configured Stripe Price could not be verified.' }, { status: 502 });
  }
  if (await verifyFirebaseUser(request) !== uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (price.id !== priceId || price.active !== true || !stripeLivemodeMatchesRuntime(price.livemode, stripeMode)) {
    return NextResponse.json({ error: 'Configured Stripe Price authority mismatch.' }, { status: 500 });
  }

  let authority;
  try {
    authority = await prepareCurrentStripeCheckout(uid, stripe.customers, async () => await verifyFirebaseUser(request) === uid);
  } catch {
    return NextResponse.json({ error: 'Stripe customer association could not be verified.' }, { status: 502 });
  }
  if (await verifyFirebaseUser(request) !== uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!authority.allowed) return NextResponse.json({ error: 'Current Stripe association requires reconciliation.' }, { status: 409 });
  const incarnationId = authority.binding.incarnationId;
  if (!await revalidateCurrentStripeCheckout(uid, authority.binding)) return NextResponse.json({ error: 'Current Stripe association changed.' }, { status: 409 });
  const session = await stripe.checkout.sessions.create({
    mode: checkoutModeForPlan(planId),
    line_items: [{ price: price.id, quantity: 1 }],
    customer: authority.binding.stripeCustomerId!,
    success_url: withStripeResult(redirectBase, 'success', planId),
    cancel_url: withStripeResult(redirectBase, 'cancelled', planId),
    metadata: {
      planId,
      userId: uid,
      uraiAccountIncarnation: incarnationId,
    },
    payment_intent_data: planId === 'founder' ? {
      metadata: {
        planId,
        userId: uid,
        uraiAccountIncarnation: incarnationId,
      },
    } : undefined,
    subscription_data: planId === 'founder' ? undefined : {
      metadata: {
        planId,
        userId: uid,
        uraiAccountIncarnation: incarnationId,
      },
    },
  });

  if (await verifyFirebaseUser(request) !== uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.livemode !== false || session.customer !== authority.binding.stripeCustomerId
    || session.metadata?.uraiAccountIncarnation !== incarnationId
    || !await recordCurrentStripeCheckout(uid, authority.binding, planId, session.id)) {
    return NextResponse.json({ error: 'Stripe checkout association could not be committed.' }, { status: 409 });
  }
  if (await verifyFirebaseUser(request) !== uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await revalidateCurrentStripeCheckout(uid, authority.binding)) return NextResponse.json({ error: 'Current Stripe association changed.' }, { status: 409 });
  return NextResponse.json({ url: session.url, environment: stripeMode }, { headers: { 'Cache-Control': 'private, no-store' } });
}
