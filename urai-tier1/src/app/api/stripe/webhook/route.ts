import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import type { InsightPlanId } from '@/lib/entitlementStore';
import {
  applyStripeEntitlementEvent,
  findEntitlementByStripeCustomer,
  mapStripeStatus,
  type SubscriptionStatus,
} from '@/lib/entitlementStore';
import {
  parseStripeRuntimeMode,
  stripeLivemodeMatchesRuntime,
  stripeRuntimeMatchesSecret,
} from '@/lib/server/stripe-runtime-config';

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

function idFromUnknown(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

function customerIdFrom(value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): string | null {
  return idFromUnknown(value);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = idFromUnknown((invoice as unknown as { subscription?: unknown }).subscription);
  if (legacy) return legacy;
  return idFromUnknown(
    (invoice as unknown as { parent?: { subscription_details?: { subscription?: unknown } } }).parent?.subscription_details?.subscription,
  );
}

async function disputePaymentIntent(stripe: Stripe, dispute: Stripe.Dispute): Promise<unknown> {
  const direct = (dispute as unknown as { payment_intent?: unknown }).payment_intent;
  if (direct) return direct;

  const chargeId = idFromUnknown(dispute.charge);
  if (!chargeId) throw new Error('Stripe dispute is missing charge identity');
  const charge = await stripe.charges.retrieve(chargeId);
  if (!charge.payment_intent) throw new Error('Stripe disputed charge is missing payment intent identity');
  return charge.payment_intent;
}

async function paymentIntentMetadata(
  stripe: Stripe,
  value: unknown,
): Promise<{ metadata: Stripe.Metadata; customerId: string | null }> {
  const paymentIntentId = idFromUnknown(value);
  if (!paymentIntentId) throw new Error('Stripe entitlement event is missing payment intent identity');
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    metadata: paymentIntent.metadata ?? {},
    customerId: customerIdFrom(paymentIntent.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null),
  };
}

async function resolveEntitlementEvent(
  stripe: Stripe,
  eventType: string,
  payload: Stripe.Event.Data.Object,
): Promise<{
  userId: string | null;
  planId: InsightPlanId | null;
  customerId: string | null;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
}> {
  let metadata: Stripe.Metadata | undefined;
  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  let stripeStatus: string | null = null;

  if (
    eventType === 'checkout.session.completed'
    || eventType === 'checkout.session.async_payment_succeeded'
    || eventType === 'checkout.session.async_payment_failed'
  ) {
    const session = payload as Stripe.Checkout.Session;
    metadata = session.metadata ?? undefined;
    customerId = customerIdFrom(session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
    subscriptionId = idFromUnknown(session.subscription);

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      metadata = { ...(subscription.metadata ?? {}), ...(metadata ?? {}) };
      customerId = customerId ?? customerIdFrom(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
      stripeStatus = eventType === 'checkout.session.async_payment_failed' ? 'past_due' : subscription.status;
    } else if (metadata?.planId === 'founder') {
      if (eventType === 'checkout.session.async_payment_succeeded') stripeStatus = 'active';
      else if (eventType === 'checkout.session.async_payment_failed') stripeStatus = 'none';
      else stripeStatus = session.payment_status === 'paid' ? 'active' : 'none';
    }
  } else if (eventType === 'invoice.paid' || eventType === 'invoice.payment_failed') {
    const invoice = payload as Stripe.Invoice;
    customerId = customerIdFrom(invoice.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
    subscriptionId = invoiceSubscriptionId(invoice);
    if (!subscriptionId) throw new Error('Stripe invoice entitlement event is missing subscription identity');

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    metadata = subscription.metadata ?? undefined;
    customerId = customerId ?? customerIdFrom(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
    stripeStatus = eventType === 'invoice.payment_failed' ? 'past_due' : subscription.status;
  } else if (eventType === 'charge.refunded') {
    const charge = payload as Stripe.Charge;
    const resolved = await paymentIntentMetadata(stripe, charge.payment_intent);
    metadata = resolved.metadata;
    customerId = customerIdFrom(charge.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null) ?? resolved.customerId;
    stripeStatus = 'canceled';
  } else if (eventType === 'charge.dispute.created' || eventType === 'charge.dispute.closed') {
    const dispute = payload as Stripe.Dispute;
    const resolved = await paymentIntentMetadata(stripe, await disputePaymentIntent(stripe, dispute));
    metadata = resolved.metadata;
    customerId = resolved.customerId;
    stripeStatus = eventType === 'charge.dispute.closed' && dispute.status === 'won' ? 'active' : 'canceled';
  } else {
    const subscription = payload as Stripe.Subscription;
    metadata = subscription.metadata ?? undefined;
    customerId = customerIdFrom(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
    subscriptionId = subscription.id;
    stripeStatus = subscription.status;
  }

  const userIdFromMetadata = stringValue(metadata?.userId);
  const rawPlanId = stringValue(metadata?.planId);
  const planId = isPlanId(rawPlanId) ? rawPlanId : null;
  let resolvedUserId = userIdFromMetadata;

  if (!resolvedUserId && customerId) {
    const existing = await findEntitlementByStripeCustomer(customerId);
    resolvedUserId = existing?.userId ?? null;
  }

  return {
    userId: resolvedUserId,
    planId,
    customerId,
    subscriptionId,
    subscriptionStatus: mapStripeStatus(eventType === 'customer.subscription.deleted' ? 'canceled' : stripeStatus),
  };
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const stripeMode = parseStripeRuntimeMode(process.env.URAI_STRIPE_MODE);

  if (!signature || !webhookSecret || !secretKey || !stripeMode) {
    return NextResponse.json({ error: 'Missing Stripe webhook configuration' }, { status: 400 });
  }

  if (!stripeRuntimeMatchesSecret(stripeMode, secretKey)) {
    return NextResponse.json({ error: 'Stripe credential mode mismatch' }, { status: 500 });
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

  if (!stripeLivemodeMatchesRuntime(event.livemode, stripeMode)) {
    console.warn('Stripe webhook rejected cross-mode event', { eventId: event.id, type: event.type });
    return NextResponse.json({ error: 'Stripe event mode mismatch' }, { status: 400 });
  }

  if (!WEBHOOK_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  let resolved;
  try {
    resolved = await resolveEntitlementEvent(stripe, event.type, event.data.object);
  } catch (error) {
    console.error('Stripe webhook could not resolve provider state; returning retryable failure', {
      eventId: event.id,
      type: event.type,
      error,
    });
    return NextResponse.json({ error: 'Stripe provider state could not be resolved' }, { status: 500 });
  }

  if (!resolved.userId) {
    console.warn('Stripe webhook skipped event without resolvable userId', {
      eventId: event.id,
      type: event.type,
      customerId: resolved.customerId,
      subscriptionId: resolved.subscriptionId,
    });
    return NextResponse.json({ received: true, skipped: 'missing-user' });
  }

  if (!resolved.planId) {
    console.warn('Stripe webhook skipped event without supported planId metadata', {
      eventId: event.id,
      type: event.type,
      userId: resolved.userId,
      customerId: resolved.customerId,
      subscriptionId: resolved.subscriptionId,
    });
    return NextResponse.json({ received: true, skipped: 'missing-plan' });
  }

  const result = await applyStripeEntitlementEvent({
    eventId: event.id,
    eventType: event.type,
    eventCreated: event.created,
    userId: resolved.userId,
    planId: resolved.planId,
    stripeCustomerId: resolved.customerId,
    stripeSubscriptionId: resolved.subscriptionId,
    subscriptionStatus: resolved.subscriptionStatus,
  });

  return NextResponse.json({ received: true, result });
}
