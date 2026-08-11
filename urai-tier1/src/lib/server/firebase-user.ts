import { assertExternalAccountAdc } from './google-adc';

function bearerTokenFrom(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length ? token : null;
}

export async function verifyFirebaseUser(request: Request): Promise<string | null> {
  const token = bearerTokenFrom(request);
  if (!token) return null;

  const adminAuth = await import('firebase-admin/auth');
  const adminApp = await import('firebase-admin/app');

  assertExternalAccountAdc();
  if (!adminApp.getApps().length) {
    adminApp.initializeApp({ credential: adminApp.applicationDefault() });
  }

  try {
    const decoded = await adminAuth.getAuth().verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    return null;
  }
}
