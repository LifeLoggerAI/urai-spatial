import { NextResponse } from 'next/server';
import { readEntitlement } from '@/lib/entitlementStore';
import { verifyFirebaseUser } from '@/lib/server/firebase-user';

// Next.js 15 GET Route Handlers are dynamic by default. Keep the production
// entitlement path request-bound without forcing a segment mode that makes the
// explicit static-reference export fail. Static exports return the truthful 503
// below before any request-bound authentication or entitlement read occurs.
export async function GET(request: Request) {
  if (process.env.URAI_FIREBASE_STATIC_EXPORT === 'true') {
    return NextResponse.json(
      { error: 'Entitlement verification is unavailable in a static export.' },
      { status: 503 },
    );
  }

  const uid = await verifyFirebaseUser(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlement = await readEntitlement(uid);

  return NextResponse.json({ entitlement });
}
