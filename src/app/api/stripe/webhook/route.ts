import { NextResponse } from 'next/server';

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

  // NOTE: This is intentionally minimal. Replace console logs with Firestore entitlement writes.
  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const data = event.data.object as any;
      const planId = data.metadata?.planId;
      const userId = data.metadata?.userId;

      console.log('Stripe event:', event.type, { planId, userId });

      // TODO:
      // 1. Map Stripe customer → userId
      // 2. Write entitlement to Firestore
      // 3. Set subscriptionStatus based on event.type
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
