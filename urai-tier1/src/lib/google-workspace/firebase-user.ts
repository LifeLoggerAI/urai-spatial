import { assertExternalAccountAdc } from '@/lib/server/google-adc'

function bearerTokenFrom(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return token || null
}

export async function requireFirebaseUser(request: Request): Promise<{ uid: string; email?: string }> {
  const token = bearerTokenFrom(request)
  if (!token) throw new Error('Missing Firebase bearer token')

  assertExternalAccountAdc()
  const app = await import('firebase-admin/app')
  const auth = await import('firebase-admin/auth')
  if (!app.getApps().length) app.initializeApp({ credential: app.applicationDefault() })

  const decoded = await auth.getAuth().verifyIdToken(token)
  return { uid: decoded.uid, email: typeof decoded.email === 'string' ? decoded.email : undefined }
}
