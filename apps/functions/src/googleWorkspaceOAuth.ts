import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const REGION = 'us-central1'
const GOOGLE_OAUTH_CLIENT_ID = defineSecret('GOOGLE_OAUTH_CLIENT_ID')
const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret('GOOGLE_OAUTH_CLIENT_SECRET')
const GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY = defineSecret('GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY')
const TOKEN_COLLECTION = 'providerOAuthTokens'
const STATE_COLLECTION = 'providerOAuthStates'
const PROVIDER_ID = 'google-workspace'
const DEFAULT_REDIRECT_URI = 'https://urai.app/api/google/oauth/callback'
const DEFAULT_APP_ORIGIN = 'https://urai.app'

const GOOGLE_WORKSPACE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/gmail.readonly',
] as const

type TokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope?: string
  token_type: string
  id_token?: string
}

type CipherEnvelope = {
  v: 1
  alg: 'A256GCM'
  iv: string
  tag: string
  ciphertext: string
}

class OAuthError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'OAuthError'
  }
}

function redirectUri() {
  return String(process.env.GOOGLE_OAUTH_REDIRECT_URI || DEFAULT_REDIRECT_URI).trim()
}

function appOrigin() {
  return String(process.env.URAI_APP_ORIGIN || DEFAULT_APP_ORIGIN).trim().replace(/\/$/, '')
}

function bearerToken(value: unknown) {
  const header = Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
  if (!header.startsWith('Bearer ')) throw new OAuthError(401, 'UNAUTHORIZED', 'Authentication is required.')
  const token = header.slice(7).trim()
  if (!token) throw new OAuthError(401, 'UNAUTHORIZED', 'Authentication is required.')
  return token
}

async function authenticatedUid(request: { headers: Record<string, unknown> }) {
  const decoded = await admin.auth().verifyIdToken(bearerToken(request.headers.authorization), true)
  if (!decoded.uid) throw new OAuthError(401, 'UNAUTHORIZED', 'Authentication is required.')
  return decoded.uid
}

function stateDigest(state: string) {
  return createHash('sha256').update(state).digest('hex')
}

function createPkcePair() {
  const verifier = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function encryptionKey() {
  const value = GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY.value().trim()
  const key = Buffer.from(value, 'base64')
  if (key.length !== 32) {
    throw new OAuthError(500, 'OAUTH_ENCRYPTION_CONFIG', 'Google OAuth token encryption is not configured correctly.')
  }
  return key
}

function encryptSecret(plaintext: string): CipherEnvelope {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return {
    v: 1,
    alg: 'A256GCM',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

function decryptSecret(envelope: unknown) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return null
  const value = envelope as Partial<CipherEnvelope>
  if (value.v !== 1 || value.alg !== 'A256GCM' || !value.iv || !value.tag || !value.ciphertext) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(value.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(value.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}

function buildAuthorizationUrl(state: string, challenge: string) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', GOOGLE_OAUTH_CLIENT_ID.value())
  url.searchParams.set('redirect_uri', redirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_WORKSPACE_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

async function exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CLIENT_ID.value(),
    client_secret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
    code,
    code_verifier: verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new OAuthError(502, 'GOOGLE_TOKEN_EXCHANGE_FAILED', 'Google did not accept the OAuth authorization code.')
  const tokens = await response.json() as TokenResponse
  if (!tokens.access_token || !tokens.expires_in) {
    throw new OAuthError(502, 'GOOGLE_TOKEN_RESPONSE_INVALID', 'Google returned an incomplete OAuth token response.')
  }
  return tokens
}

async function consumeOAuthState(state: string) {
  const ref = db.collection(STATE_COLLECTION).doc(stateDigest(state))
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) return null
    const data = snapshot.data() ?? {}
    transaction.delete(ref)
    const expiresAt = data.expiresAt instanceof admin.firestore.Timestamp ? data.expiresAt.toMillis() : 0
    if (!expiresAt || expiresAt < Date.now()) return null
    const uid = typeof data.uid === 'string' ? data.uid : ''
    const verifier = typeof data.verifier === 'string' ? data.verifier : ''
    return uid && verifier ? { uid, verifier } : null
  })
}

function tokenDocumentId(uid: string) {
  return `${uid}_${PROVIDER_ID}`
}

async function saveTokens(uid: string, tokens: TokenResponse) {
  const tokenRef = db.collection(TOKEN_COLLECTION).doc(tokenDocumentId(uid))
  const prior = await tokenRef.get()
  const priorRefresh = prior.exists ? decryptSecret(prior.data()?.refreshToken) : null
  const refreshToken = tokens.refresh_token || priorRefresh
  if (!refreshToken) throw new OAuthError(502, 'GOOGLE_REFRESH_TOKEN_MISSING', 'Google did not issue a refresh token for this connection.')

  const expiresAtMillis = Date.now() + Math.max(60, tokens.expires_in) * 1000
  const scopes = String(tokens.scope || GOOGLE_WORKSPACE_SCOPES.join(' ')).split(/\s+/).filter(Boolean)

  await tokenRef.set({
    provider: PROVIDER_ID,
    uid,
    accessToken: encryptSecret(tokens.access_token),
    refreshToken: encryptSecret(refreshToken),
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMillis),
    scopes,
    tokenType: tokens.token_type || 'Bearer',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.doc(`users/${uid}/providerConnections/${PROVIDER_ID}`).set({
    provider: PROVIDER_ID,
    status: 'connected',
    connected: true,
    scopes,
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMillis),
    connectedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
}

function sendError(response: { status: (code: number) => { json: (value: unknown) => void } }, error: unknown) {
  const boundary = error instanceof OAuthError
    ? error
    : new OAuthError(500, 'GOOGLE_OAUTH_FAILURE', 'Google Workspace connection is unavailable.')
  response.status(boundary.status).json({ error: boundary.code, message: boundary.message })
}

export const googleOAuthStart = onRequest({
  region: REGION,
  timeoutSeconds: 30,
  memory: '256MiB',
  cors: false,
  secrets: [GOOGLE_OAUTH_CLIENT_ID],
}, async (request, response) => {
  try {
    if (request.method !== 'POST') throw new OAuthError(405, 'METHOD_NOT_ALLOWED', 'POST is required.')
    const uid = await authenticatedUid(request)
    const state = randomBytes(32).toString('base64url')
    const { verifier, challenge } = createPkcePair()
    await db.collection(STATE_COLLECTION).doc(stateDigest(state)).set({
      uid,
      verifier,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
    })
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.status(200).json({ authorizationUrl: buildAuthorizationUrl(state, challenge) })
  } catch (error) {
    sendError(response, error)
  }
})

export const googleOAuthCallback = onRequest({
  region: REGION,
  timeoutSeconds: 30,
  memory: '256MiB',
  cors: false,
  secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY],
}, async (request, response) => {
  const redirect = (status: string) => response.redirect(302, `${appOrigin()}/settings?google=${encodeURIComponent(status)}`)
  try {
    if (request.method !== 'GET') throw new OAuthError(405, 'METHOD_NOT_ALLOWED', 'GET is required.')
    const oauthError = typeof request.query.error === 'string' ? request.query.error : ''
    if (oauthError) return redirect('denied')
    const state = typeof request.query.state === 'string' ? request.query.state : ''
    const code = typeof request.query.code === 'string' ? request.query.code : ''
    if (!state || !code) return redirect('invalid-state')
    const pending = await consumeOAuthState(state)
    if (!pending) return redirect('invalid-state')
    const tokens = await exchangeCode(code, pending.verifier)
    await saveTokens(pending.uid, tokens)
    return redirect('connected')
  } catch {
    return redirect('error')
  }
})

export const googleOAuthStatus = onRequest({
  region: REGION,
  timeoutSeconds: 15,
  memory: '256MiB',
  cors: false,
}, async (request, response) => {
  try {
    if (request.method !== 'POST') throw new OAuthError(405, 'METHOD_NOT_ALLOWED', 'POST is required.')
    const uid = await authenticatedUid(request)
    const snapshot = await db.doc(`users/${uid}/providerConnections/${PROVIDER_ID}`).get()
    const data = snapshot.data() ?? {}
    const expiresAt = data.expiresAt instanceof admin.firestore.Timestamp ? data.expiresAt.toMillis() : null
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.status(200).json({
      connected: snapshot.exists && data.connected === true && data.status === 'connected',
      status: typeof data.status === 'string' ? data.status : 'disconnected',
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
      expiresAt,
    })
  } catch (error) {
    sendError(response, error)
  }
})

export const googleOAuthDisconnect = onRequest({
  region: REGION,
  timeoutSeconds: 20,
  memory: '256MiB',
  cors: false,
  secrets: [GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY],
}, async (request, response) => {
  try {
    if (request.method !== 'POST') throw new OAuthError(405, 'METHOD_NOT_ALLOWED', 'POST is required.')
    const uid = await authenticatedUid(request)
    const tokenRef = db.collection(TOKEN_COLLECTION).doc(tokenDocumentId(uid))
    const snapshot = await tokenRef.get()
    const data = snapshot.data() ?? {}
    const token = decryptSecret(data.refreshToken) || decryptSecret(data.accessToken)

    if (token) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token }),
        })
      } catch {
        // Local deletion remains authoritative even when the upstream revoke endpoint is temporarily unavailable.
      }
    }

    await Promise.all([
      tokenRef.delete(),
      db.doc(`users/${uid}/providerConnections/${PROVIDER_ID}`).set({
        provider: PROVIDER_ID,
        status: 'disconnected',
        connected: false,
        scopes: [],
        expiresAt: null,
        disconnectedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }),
    ])

    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.status(200).json({ connected: false })
  } catch (error) {
    sendError(response, error)
  }
})
