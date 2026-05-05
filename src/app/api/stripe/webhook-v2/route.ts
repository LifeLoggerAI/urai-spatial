import { NextResponse } from 'next/server';
import { upsertEntitlement, findEntitlementByStripeCustomer, mapStripeStatus, defaultEntitlement } from '@/lib/entitlementStore';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!signature || !webhookSecret || !secretKey) {
    return NextResponse.json({ error: 'Missing Stripe webhook configuration' }, { status: 400 });
  }

  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const data: any = event.data.object;
      const userId = data.metadata?.userId ?? 'local';
      const planId = data.metadata?.planId ?? 'free';

      await upsertEntitlement({
        ...defaultEntitlement(userId),
        userId,
        planId,
        stripeCustomerId: data.customer ?? null,
        stripeSubscriptionId: data.subscription ?? null,
        subscriptionStatus: 'active',
        updatedAt: Date.now(),
      });
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created':
    case 'customer.subscription.deleted': {
      const sub: any = event.data.object;
      const customerId = sub.customer;
      const existing = await findEntitlementByStripeCustomer(customerId);
      if (!existing) break;

      await upsertEntitlement({
        ...existing,
        subscriptionStatus: mapStripeStatus(sub.status),
        updatedAt: Date.now(),
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
