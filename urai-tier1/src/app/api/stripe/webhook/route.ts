import { NextResponse } from 'next/server';
import { assertCheckoutSubscriptionMatch, invoiceSubscriptionId, invoiceBelongsToSubscription, settledStripeSubscriptionStatus } from '@/lib/server/stripe-entitlement-event';
import type Stripe from 'stripe';
import type { InsightPlanId } from '@/lib/entitlementStore';
import {
  parseStripeRuntimeMode,
  stripeLivemodeMatchesRuntime,
  stripeRuntimeMatchesSecret,
} from '@/lib/server/stripe-runtime-config';
import {
  applyStripeEventEntitlement,
  defaultEntitlement,
  findEntitlementByStripeCustomer,
  mapStripeStatus,
  type SubscriptionStatus,
} from '@/lib/entitlementStore';

const WEBHOOK_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
]);

function isPlanId(value: unknown): value is InsightPlanId {
  return value === 'free' || value === 'pro' || value === 'therapist' || value === 'founder';
}

function stringValue(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}

function customerIdFrom(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id ?? null;
}

function subscriptionIdFrom(value: string | Stripe.Subscription | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id ?? null;
}

type ResolvedEntitlementEvent = {
  userId: string | null;
  planId: InsightPlanId | null;
  customerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  incarnationId: string | null;
  checkoutSessionId?: string | null;
};

async function resolveMetadataIdentity(
  metadata: Stripe.Metadata | undefined,
  customerId: string | null,
): Promise<{ userId: string | null; planId: InsightPlanId | null; incarnationId: string | null }> {
  let userId = stringValue(metadata?.userId);
  const rawPlanId = stringValue(metadata?.planId);
  let planId = isPlanId(rawPlanId) ? rawPlanId : null;

  if (customerId && (!userId || !planId)) {
    const existing = await findEntitlementByStripeCustomer(customerId);
    userId = userId ?? existing?.userId ?? null;
    planId = planId ?? existing?.planId ?? null;
  }

  return { userId, planId, incarnationId: stringValue(metadata?.uraiAccountIncarnation) };
}

async function resolveSubscription(
  stripe: Stripe,
  eventType: string,
  payload: Stripe.Event.Data.Object,
): Promise<ResolvedEntitlementEvent | null> {
  let metadata: Stripe.Metadata | undefined;
  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let stripeStatus: string | null = null;

  if (
    eventType === 'checkout.session.completed' ||
    eventType === 'checkout.session.async_payment_succeeded' ||
    eventType === 'checkout.session.async_payment_failed'
  ) {
    const session = payload as Stripe.Checkout.Session;
    metadata = session.metadata ?? undefined;
    customerId = customerIdFrom(session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
    subscriptionId = subscriptionIdFrom(session.subscription as string | Stripe.Subscription | null);

    if (eventType === 'checkout.session.async_payment_succeeded') {
      stripeStatus = 'active';
    } else if (eventType === 'checkout.session.async_payment_failed') {
      stripeStatus = 'none';
    } else if (!subscriptionId) {
      stripeStatus = session.payment_status === 'paid' ? 'active' : 'none';
    }

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      assertCheckoutSubscriptionMatch(session, subscription);
      metadata = { ...(subscription.metadata ?? {}), ...(metadata ?? {}) };
      customerId = customerId ?? customerIdFrom(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
      stripeStatus = await settledStripeSubscriptionStatus(subscription, (id) => stripe.invoices.retrieve(id));
    }
  } else if (eventType === 'invoice.paid' || eventType === 'invoice.payment_failed') {
    const invoice = payload as Stripe.Invoice;
    const id = invoiceSubscriptionId(invoice);
    // One-off invoices are not subscription entitlement authority.
    if (!id) return null;
    const subscription = await stripe.subscriptions.retrieve(id);
    // Old invoices cannot revoke a newer billing period. Customer/subscription
    // mismatches are retryable errors, never acknowledged as successful updates.
    if (!invoiceBelongsToSubscription(invoice, subscription)) return null;
    metadata = subscription.metadata ?? undefined;
    customerId = customerIdFrom(subscription.customer);
    subscriptionId = subscription.id;
    stripeStatus = await settledStripeSubscriptionStatus(
      subscription, (latestId) => stripe.invoices.retrieve(latestId),
      eventType === 'invoice.payment_failed',
    );
  } else {
    const subscription = payload as Stripe.Subscription;
    metadata = subscription.metadata ?? undefined;
    customerId = customerIdFrom(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
    subscriptionId = subscription.id;
    stripeStatus = eventType === 'customer.subscription.deleted' ? 'canceled'
      : await settledStripeSubscriptionStatus(subscription, (id) => stripe.invoices.retrieve(id));
  }

  const identity = await resolveMetadataIdentity(metadata, customerId);
  return {
    ...identity,
    customerId,
    subscriptionId,
    checkoutSessionId: eventType.startsWith('checkout.session.') ? (payload as Stripe.Checkout.Session).id : null,
    subscriptionStatus: mapStripeStatus(stripeStatus),
  };
}

async function resolveChargeLifecycle(
  stripe: Stripe,
  eventType: string,
  payload: Stripe.Event.Data.Object,
): Promise<ResolvedEntitlementEvent | null> {
  let charge: Stripe.Charge;
  let stripeStatus: string;

  if (eventType === 'charge.refunded') {
    charge = payload as Stripe.Charge;
    if (charge.refunded !== true) return null;
    stripeStatus = 'canceled';
  } else {
    const dispute = payload as Stripe.Dispute;
    stripeStatus = eventType === 'charge.dispute.closed'
      ? (dispute.status === 'won' ? 'active' : 'canceled')
      : 'canceled';
    charge = typeof dispute.charge === 'string'
      ? await stripe.charges.retrieve(dispute.charge)
      : dispute.charge;
  }

  const paymentIntentRef = charge.payment_intent;
  const paymentIntentId = typeof paymentIntentRef === 'string' ? paymentIntentRef : paymentIntentRef?.id ?? null;
  if (!paymentIntentId) throw new Error('payment_intent_missing');

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const customerId = customerIdFrom(
    paymentIntent.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null,
  ) ?? customerIdFrom(charge.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
  const identity = await resolveMetadataIdentity(paymentIntent.metadata ?? undefined, customerId);
  if (identity.planId !== 'founder') return null;

  return {
    ...identity,
    customerId,
    subscriptionId: null,
    subscriptionStatus: mapStripeStatus(stripeStatus),
  };
}

function isChargeLifecycleEvent(eventType: string): boolean {
  return eventType === 'charge.refunded' || eventType === 'charge.dispute.created' || eventType === 'charge.dispute.closed';
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const runtimeMode = parseStripeRuntimeMode(process.env.URAI_STRIPE_MODE);

  if (!signature || !webhookSecret || !secretKey || !runtimeMode) {
    return NextResponse.json({ error: 'Missing or invalid Stripe webhook configuration' }, { status: 400 });
  }
  if (runtimeMode !== 'test') return NextResponse.json({ error: 'Stripe LIVE callbacks are not authorized.' }, { status: 503 });
  if (!stripeRuntimeMatchesSecret(runtimeMode, secretKey)) {
    console.error('Stripe webhook refused mismatched secret key mode', { runtimeMode });
    return NextResponse.json({ error: 'Stripe mode mismatch' }, { status: 503 });
  }

  const stripeModule = await import('stripe');
  const StripeClient = stripeModule.default;
  const stripe = new StripeClient(secretKey);
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.warn('Stripe webhook signature verification failed', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!stripeLivemodeMatchesRuntime(event.livemode, runtimeMode)) {
    console.error('Stripe webhook refused event from wrong livemode', { runtimeMode, eventLivemode: event.livemode, type: event.type });
    return NextResponse.json({ error: 'Stripe event mode mismatch' }, { status: 400 });
  }

  if (!WEBHOOK_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  let resolved: ResolvedEntitlementEvent | null;
  try {
    resolved = isChargeLifecycleEvent(event.type)
      ? await resolveChargeLifecycle(stripe, event.type, event.data.object)
      : await resolveSubscription(stripe, event.type, event.data.object);
  } catch (error) {
    console.warn('Stripe provider state could not be resolved', { type: event.type, error });
    return NextResponse.json({ error: 'Stripe provider state could not be resolved' }, { status: 500 });
  }

  if (!resolved) {
    return NextResponse.json({ received: true, ignored: true, reason: 'no-entitlement-transition' });
  }

  if (!resolved.userId) {
    console.warn('Stripe webhook skipped event without resolvable userId', {
      type: event.type,
      customerId: resolved.customerId,
      subscriptionId: resolved.subscriptionId,
    });
    return NextResponse.json({ received: true, skipped: 'missing-user' });
  }

  if (!resolved.planId) {
    console.warn('Stripe webhook skipped event without supported planId metadata', {
      type: event.type,
      userId: resolved.userId,
      customerId: resolved.customerId,
      subscriptionId: resolved.subscriptionId,
    });
    return NextResponse.json({ received: true, skipped: 'missing-plan' });
  }

  const application = await applyStripeEventEntitlement({
    ...defaultEntitlement(resolved.userId),
    userId: resolved.userId,
    planId: resolved.planId,
    stripeCustomerId: resolved.customerId,
    stripeIncarnationId: resolved.incarnationId,
    stripeCheckoutSessionId: resolved.checkoutSessionId ?? null,
    stripeSubscriptionId: resolved.subscriptionId,
    subscriptionStatus: resolved.subscriptionStatus,
    updatedAt: Date.now(),
  }, {
    id: event.id,
    created: event.created,
    resolveCurrentSubscription: async () => {
      if (!resolved.subscriptionId) throw new Error('Missing Stripe subscription authority');
      const current = await stripe.subscriptions.retrieve(resolved.subscriptionId);
      const customerId = customerIdFrom(current.customer);
      const identity = await resolveMetadataIdentity(current.metadata ?? undefined, customerId);
      return {
        ...defaultEntitlement(identity.userId ?? ''),
        userId: identity.userId ?? '', planId: identity.planId ?? 'free',
        stripeCustomerId: customerId, stripeSubscriptionId: current.id, stripeIncarnationId: identity.incarnationId,
        subscriptionStatus: await settledStripeSubscriptionStatus(
          current, (id) => stripe.invoices.retrieve(id), event.type === 'invoice.payment_failed',
        ),
      };
    },
  });

  if (application.retryable) {
    return NextResponse.json({ error: 'Stripe provider state could not be resolved' }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    applied: application.applied,
    reason: application.reason,
  });
}

