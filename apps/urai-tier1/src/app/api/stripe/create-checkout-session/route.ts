import { NextResponse } from 'next/server';
import type { InsightPlanId } from '@/components/spatial/insightMonetizationEngine';
import { assertExternalAccountAdc } from '@/lib/server/google-adc';

const PRICE_ENV_BY_PLAN: Record<Exclude<InsightPlanId, 'free'>, string> = {
  pro: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
  therapist: 'NEXT_PUBLIC_STRIPE_PRICE_THERAPIST',
  founder: 'NEXT_PUBLIC_STRIPE_PRICE_FOUNDER',
};

function isPaidPlanId(value: unknown): value is Exclude<InsightPlanId, 'free'> {
  return value === 'pro' || value === 'therapist' || value === 'founder';
}

function bearerTokenFrom(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length ? token : null;
}

async function verifyUser(request: Request): Promise<string | null> {
  const token = bearerTokenFrom(request);
  if (!token) return null;

  const adminAuth = await import('firebase-admin/auth');
  const adminApp = await import('firebase-admin/app');

  assertExternalAccountAdc();
  if (!adminApp.getApps().length) {
    adminApp.initializeApp({ credential: adminApp.applicationDefault() });
  }

  try {
    const decoded = await adminAuth.getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const uid = await verifyUser(request);
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
  const priceEnvKey = PRICE_ENV_BY_PLAN[planId];
  const priceId = process.env[priceEnvKey];

  if (!secretKey || !appUrl || !priceId) {
    return NextResponse.json({ error: 'Stripe environment is not configured.' }, { status: 500 });
  }

  const stripeModule = await import('stripe');
  const Stripe = stripeModule.default;
  const stripe = new Stripe(secretKey);
  const redirectBase = returnUrl || appUrl;

  const session = await stripe.checkout.sessions.create({
    mode: planId === 'founder' ? 'payment' : 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${redirectBase}?stripe=success&plan=${planId}`,
    cancel_url: `${redirectBase}?stripe=cancelled&plan=${planId}`,
    metadata: {
      planId,
      userId: uid,
    },
    subscription_data: planId === 'founder' ? undefined : {
      metadata: {
        planId,
        userId: uid,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
