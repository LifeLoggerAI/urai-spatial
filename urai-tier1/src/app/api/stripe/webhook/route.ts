import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import type { InsightPlanId } from '@/lib/entitlementStore';
import {
  applyStripeEntitlementEvent,
  findEntitlementByStripeCustomer,
  mapStripeStatus,
  type SubscriptionStatus,
} from '@/lib/entitlementStore';

const WEBHOOK_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
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

function subscriptionIdFromUnknown(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = subscriptionIdFromUnknown((invoice as unknown as { subscription?: unknown }).subscription);
  if (legacy) return legacy;
  return subscriptionIdFromUnknown(
    (invoice as unknown as { parent?: { subscription_details?: { subscription?: unknown } } }).parent?.subscription_details?.subscription,
  );
}

async function resolveSubscription(
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

  if (eventType === 'checkout.session.completed') {
    const session = payload as Stripe.Checkout.Session;
    metadata = session.metadata ?? undefined;
    customerId = customerIdFrom(session.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
    subscriptionId = subscriptionIdFromUnknown(session.subscription);

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        metadata = { ...(subscription.metadata ?? {}), ...(metadata ?? {}) };
        customerId = customerId ?? customerIdFrom(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
        stripeStatus = subscription.status;
      } catch (error) {
        console.warn('Stripe webhook could not fetch checkout subscription', { subscriptionId, error });
      }
    } else if (metadata?.planId === 'founder') {
      stripeStatus = session.payment_status === 'paid' ? 'active' : 'none';
    }
  } else if (eventType === 'invoice.paid' || eventType === 'invoice.payment_failed') {
    const invoice = payload as Stripe.Invoice;
    customerId = customerIdFrom(invoice.customer as string | Stripe.Customer | Stripe.DeletedCustomer | null);
    subscriptionId = invoiceSubscriptionId(invoice);

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        metadata = subscription.metadata ?? undefined;
        customerId = customerId ?? customerIdFrom(subscription.customer as string | Stripe.Customer | Stripe.DeletedCustomer);
        stripeStatus = eventType === 'invoice.payment_failed' ? 'past_due' : subscription.status;
      } catch (error) {
        console.warn('Stripe webhook could not fetch invoice subscription', { subscriptionId, error });
      }
    }
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
    try {
      const existing = await findEntitlementByStripeCustomer(customerId);
      resolvedUserId = existing?.userId ?? null;
    } catch (error) {
      console.warn('Stripe webhook could not resolve entitlement by customer', { customerId, error });
    }
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

  if (!signature || !webhookSecret || !secretKey) {
    return NextResponse.json({ error: 'Missing Stripe webhook configuration' }, { status: 400 });
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

  if (!WEBHOOK_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const resolved = await resolveSubscription(stripe, event.type, event.data.object);

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
