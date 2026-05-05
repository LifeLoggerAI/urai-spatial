import { NextResponse } from 'next/server';
import type { InsightPlanId } from '@/components/spatial/insightMonetizationEngine';

const PRICE_ENV_BY_PLAN: Record<Exclude<InsightPlanId, 'free'>, string> = {
  pro: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
  therapist: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST',
  founder: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER',
};

export async function POST(request: Request) {
  const { planId, returnUrl, userId } = await request.json() as {
    planId?: InsightPlanId;
    returnUrl?: string;
    userId?: string;
  };

  if (!planId || planId === 'free') {
    return NextResponse.json({ error: 'Paid planId required.' }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const priceId = process.env[PRICE_ENV_BY_PLAN[planId]];

  if (!secretKey || !appUrl || !priceId) {
    return NextResponse.json({ error: 'Stripe environment is not configured.' }, { status: 500 });
  }

  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' });

  const session = await stripe.checkout.sessions.create({
    mode: planId === 'founder' ? 'payment' : 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl ?? appUrl}?stripe=success&plan=${planId}`,
    cancel_url: `${returnUrl ?? appUrl}?stripe=cancelled&plan=${planId}`,
    metadata: {
      planId,
      userId: userId ?? 'local',
    },
    subscription_data: planId === 'founder' ? undefined : {
      metadata: {
        planId,
        userId: userId ?? 'local',
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
