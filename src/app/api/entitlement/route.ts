import { NextResponse } from 'next/server';
import { readEntitlement } from '@/lib/entitlementStore';

async function verifyUser(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');

  const admin = await import('firebase-admin/auth');
  const app = await import('firebase-admin/app');

  if (!app.getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
    app.initializeApp({ credential: app.cert(JSON.parse(raw)) });
  }

  try {
    const decoded = await admin.getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const uid = await verifyUser(request);
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlement = await readEntitlement(uid);

  return NextResponse.json({ entitlement });
}
