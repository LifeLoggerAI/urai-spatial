import { createHash, randomBytes } from 'node:crypto'

export const GOOGLE_WORKSPACE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.readonly',
] as const

export type GoogleTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type: string
  id_token?: string
}

function requiredEnv(name: string): string {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`Missing required Google OAuth configuration: ${name}`)
  return value
}

export function googleOAuthConfig() {
  return {
    clientId: requiredEnv('GOOGLE_OAUTH_CLIENT_ID'),
    clientSecret: requiredEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
    redirectUri: requiredEnv('GOOGLE_OAUTH_REDIRECT_URI'),
  }
}

export function createPkcePair() {
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function createOAuthState() {
  return randomBytes(32).toString('base64url')
}

export function buildGoogleAuthorizationUrl(input: { state: string; codeChallenge: string }) {
  const { clientId, redirectUri } = googleOAuthConfig()
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_WORKSPACE_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', input.state)
  url.searchParams.set('code_challenge', input.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

export async function exchangeGoogleAuthorizationCode(code: string, codeVerifier: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = googleOAuthConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google OAuth token exchange failed (${response.status}): ${detail.slice(0, 300)}`)
  }

  return response.json() as Promise<GoogleTokenResponse>
}
