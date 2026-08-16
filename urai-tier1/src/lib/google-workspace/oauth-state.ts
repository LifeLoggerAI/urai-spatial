import { createHmac, timingSafeEqual } from 'node:crypto'

export const GOOGLE_OAUTH_COOKIE = 'urai_google_oauth'

type OAuthStatePayload = {
  uid: string
  state: string
  verifier: string
  expiresAt: number
}

function stateSecret(): string {
  const value = String(process.env.GOOGLE_OAUTH_STATE_SECRET || '').trim()
  if (value.length < 32) throw new Error('GOOGLE_OAUTH_STATE_SECRET must be at least 32 characters')
  return value
}

function signature(payload: string): string {
  return createHmac('sha256', stateSecret()).update(payload).digest('base64url')
}

export function sealOAuthState(input: Omit<OAuthStatePayload, 'expiresAt'>): string {
  const payload: OAuthStatePayload = { ...input, expiresAt: Date.now() + 10 * 60 * 1000 }
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${encoded}.${signature(encoded)}`
}

export function openOAuthState(value: string | undefined): OAuthStatePayload | null {
  if (!value) return null
  const [encoded, suppliedSignature] = value.split('.')
  if (!encoded || !suppliedSignature) return null

  const expected = Buffer.from(signature(encoded))
  const supplied = Buffer.from(suppliedSignature)
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthStatePayload
    if (!payload.uid || !payload.state || !payload.verifier || payload.expiresAt <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}
