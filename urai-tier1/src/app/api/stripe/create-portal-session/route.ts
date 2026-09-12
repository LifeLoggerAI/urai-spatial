import { NextResponse } from 'next/server';
import { readEntitlement } from '@/lib/entitlementStore';
import { resolveApprovedReturnUrl } from '@/lib/server/approved-return-url';
import { verifyFirebaseUser } from '@/lib/server/firebase-user';
import {
  parseStripeRuntimeMode,
  stripeLivemodeMatchesRuntime,
  stripeRuntimeMatchesSecret,
} from '@/lib/server/stripe-runtime-config';

export async function POST(request: Request) {
  const uid = await verifyFirebaseUser(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { returnUrl } = await request.json() as { returnUrl?: string };
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const stripeMode = parseStripeRuntimeMode(process.env.URAI_STRIPE_MODE);

  if (!secretKey || !appUrl || !stripeMode) {
    return NextResponse.json({ error: 'Stripe environment is not configured.' }, { status: 500 });
  }

  if (!stripeRuntimeMatchesSecret(stripeMode, secretKey)) {
    return NextResponse.json({ error: 'Stripe credential mode mismatch.' }, { status: 500 });
  }

  const entitlement = await readEntitlement(uid);
  if (!entitlement.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer is associated with this user.' }, { status: 409 });
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
  const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION;

  // Resolve the server-owned customer before opening the portal. A credential prefix alone
  // is not enough authority: the provider object itself must belong to the declared realm.
  let customer;
  try {
    customer = await stripe.customers.retrieve(entitlement.stripeCustomerId);
  } catch (error) {
    console.error('Stripe Billing Portal could not verify customer', { userId: uid, error });
    return NextResponse.json({ error: 'Stripe customer could not be verified.' }, { status: 502 });
  }
  if ('deleted' in customer && customer.deleted) {
    return NextResponse.json({ error: 'Stripe customer is no longer active.' }, { status: 409 });
  }
  if (!stripeLivemodeMatchesRuntime(customer.livemode, stripeMode)) {
    return NextResponse.json({ error: 'Stripe customer mode mismatch.' }, { status: 500 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: redirectBase.toString(),
    configuration: configuration || undefined,
  });

  return NextResponse.json({ url: session.url, environment: stripeMode });
}
