import { NextResponse } from 'next/server';
import { readEntitlement } from '@/lib/entitlementStore';

function bearerTokenFrom(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length ? token : null;
}

async function verifyUser(request: Request) {
  const token = bearerTokenFrom(request);
  if (!token) return null;

  const admin = await import('firebase-admin/auth');
  const app = await import('firebase-admin/app');

  if (!app.getApps().length) {
    app.initializeApp({ credential: app.applicationDefault() });
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
