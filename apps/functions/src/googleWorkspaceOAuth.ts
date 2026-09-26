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


type GoogleHistoryCategory = 'gmail' | 'calendar' | 'contacts' | 'drive-selected'

const GOOGLE_HISTORY_CATEGORIES = new Set<GoogleHistoryCategory>([
  'gmail',
  'calendar',
  'contacts',
  'drive-selected',
])

async function validGoogleAccessToken(uid: string) {
  const tokenRef = db.collection(TOKEN_COLLECTION).doc(tokenDocumentId(uid))
  const snapshot = await tokenRef.get()
  if (!snapshot.exists) throw new OAuthError(412, 'GOOGLE_NOT_CONNECTED', 'Connect Google Workspace before previewing history.')
  const data = snapshot.data() ?? {}
  const accessToken = decryptSecret(data.accessToken)
  const refreshToken = decryptSecret(data.refreshToken)
  const expiresAt = data.expiresAt instanceof admin.firestore.Timestamp ? data.expiresAt.toMillis() : 0
  if (accessToken && expiresAt > Date.now() + 60_000) return accessToken
  if (!refreshToken) throw new OAuthError(412, 'GOOGLE_REFRESH_TOKEN_MISSING', 'Reconnect Google Workspace before previewing history.')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CLIENT_ID.value(),
      client_secret: GOOGLE_OAUTH_CLIENT_SECRET.value(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!response.ok) throw new OAuthError(502, 'GOOGLE_TOKEN_REFRESH_FAILED', 'Google Workspace authorization must be refreshed.')
  const tokens = await response.json() as TokenResponse
  if (!tokens.access_token || !tokens.expires_in) {
    throw new OAuthError(502, 'GOOGLE_TOKEN_RESPONSE_INVALID', 'Google returned an incomplete refreshed token.')
  }
  await saveTokens(uid, { ...tokens, refresh_token: refreshToken })
  return tokens.access_token
}

async function googleJson(token: string, url: URL) {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  })
  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? 412 : 502
    throw new OAuthError(status, 'GOOGLE_HISTORY_PREVIEW_FAILED', 'Google could not preview the selected history category.')
  }
  return response.json() as Promise<Record<string, unknown>>
}

async function pagedIdCount(
  token: string,
  buildUrl: (pageToken: string | null) => URL,
  listKey: string,
  maxPages: number,
) {
  let pageToken: string | null = null
  let count = 0
  let pages = 0
  do {
    const payload = await googleJson(token, buildUrl(pageToken))
    const items = Array.isArray(payload[listKey]) ? payload[listKey] as unknown[] : []
    count += items.length
    pageToken = typeof payload.nextPageToken === 'string' ? payload.nextPageToken : null
    pages += 1
  } while (pageToken && pages < maxPages)
  return { count, truncated: Boolean(pageToken), pages }
}

function parseHistoryPreviewRequest(body: unknown) {
  const value = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  if (value.confirmPreview !== true) {
    throw new OAuthError(400, 'PREVIEW_CONFIRMATION_REQUIRED', 'Confirm the history preview before Google data is read.')
  }
  const requested = Array.isArray(value.categories) ? value.categories.map(String) : []
  const categories = [...new Set(requested)].filter((item): item is GoogleHistoryCategory => GOOGLE_HISTORY_CATEGORIES.has(item as GoogleHistoryCategory))
  if (categories.length === 0 || categories.length !== requested.length) {
    throw new OAuthError(400, 'INVALID_PREVIEW_CATEGORIES', 'Choose one or more supported history categories.')
  }
  const historyDays = Number(value.historyDays ?? 365)
  if (!Number.isInteger(historyDays) || historyDays < 30 || historyDays > 3650) {
    throw new OAuthError(400, 'INVALID_HISTORY_WINDOW', 'History preview must be between 30 and 3650 days.')
  }
  return { categories, historyDays }
}

async function previewGoogleHistoryCategory(token: string, category: GoogleHistoryCategory, windowStart: Date) {
  try {
    if (category === 'gmail') {
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
      url.searchParams.set('maxResults', '1')
      url.searchParams.set('q', `after:${windowStart.toISOString().slice(0, 10).replace(/-/g, '/')}`)
      url.searchParams.set('includeSpamTrash', 'false')
      const payload = await googleJson(token, url)
      return {
        status: 'available',
        estimatedItems: Number.isFinite(Number(payload.resultSizeEstimate)) ? Number(payload.resultSizeEstimate) : 0,
        estimate: true,
      }
    }
    if (category === 'contacts') {
      const url = new URL('https://people.googleapis.com/v1/people/me/connections')
      url.searchParams.set('pageSize', '1')
      url.searchParams.set('personFields', 'metadata')
      const payload = await googleJson(token, url)
      return {
        status: 'available',
        items: Number.isFinite(Number(payload.totalItems)) ? Number(payload.totalItems) : 0,
        estimate: false,
      }
    }
    if (category === 'calendar') {
      const result = await pagedIdCount(token, (pageToken) => {
        const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
        url.searchParams.set('timeMin', windowStart.toISOString())
        url.searchParams.set('singleEvents', 'true')
        url.searchParams.set('maxResults', '2500')
        url.searchParams.set('fields', 'nextPageToken,items(id)')
        if (pageToken) url.searchParams.set('pageToken', pageToken)
        return url
      }, 'items', 4)
      return { status: 'available', items: result.count, truncated: result.truncated, estimate: false }
    }
    const result = await pagedIdCount(token, (pageToken) => {
      const url = new URL('https://www.googleapis.com/drive/v3/files')
      url.searchParams.set('pageSize', '1000')
      url.searchParams.set('q', 'trashed=false')
      url.searchParams.set('fields', 'nextPageToken,files(id),incompleteSearch')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      return url
    }, 'files', 10)
    return {
      status: 'available',
      items: result.count,
      truncated: result.truncated,
      estimate: false,
      scopeBoundary: 'drive.file: only app-accessible/selected files, not all Drive history',
    }
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'CATEGORY_UNAVAILABLE'
    return { status: 'unavailable', code }
  }
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

export const googleHistoricalContextPreview = onRequest({
  region: REGION,
  timeoutSeconds: 60,
  memory: '512MiB',
  cors: false,
  secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY],
}, async (request, response) => {
  try {
    if (request.method !== 'POST') throw new OAuthError(405, 'METHOD_NOT_ALLOWED', 'POST is required.')
    const uid = await authenticatedUid(request)
    const { categories, historyDays } = parseHistoryPreviewRequest(request.body)
    const connectionRef = db.doc(`users/${uid}/providerConnections/${PROVIDER_ID}`)
    const connection = await connectionRef.get()
    if (!connection.exists || connection.get('connected') !== true || connection.get('status') !== 'connected') {
      throw new OAuthError(412, 'GOOGLE_NOT_CONNECTED', 'Connect Google Workspace before previewing history.')
    }
    if (connection.get('processingAllowed') === false) {
      throw new OAuthError(403, 'PROVIDER_PROCESSING_PAUSED', 'Google Workspace processing is paused by your privacy controls.')
    }

    const token = await validGoogleAccessToken(uid)
    const windowStart = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000)
    const entries = await Promise.all(categories.map(async (category) => [
      category,
      await previewGoogleHistoryCategory(token, category, windowStart),
    ] as const))
    const preview = Object.fromEntries(entries)
    const previewId = `ghp_${randomBytes(12).toString('hex')}`
    const now = admin.firestore.FieldValue.serverTimestamp()
    const receipt = {
      receiptId: previewId,
      ownerId: uid,
      kind: 'historical-context-preview',
      provider: PROVIDER_ID,
      categories,
      historyDays,
      windowStart: windowStart.toISOString(),
      result: 'previewed',
      preview,
      persistedRawItems: 0,
      admittedToMemory: false,
      admittedToModels: false,
      createdAt: now,
      updatedAt: now,
    }
    await Promise.all([
      db.doc(`users/${uid}/privacyReceipts/${previewId}`).set(receipt),
      db.doc(`users/${uid}/dataSources/google-workspace-history`).set({
        provider: PROVIDER_ID,
        sourceType: 'historical-context-preview',
        connected: true,
        lastPreviewId: previewId,
        lastPreviewCategories: categories,
        lastPreviewWindowDays: historyDays,
        memoryAdmissionAllowed: false,
        rawContentPersisted: false,
        updatedAt: now,
      }, { merge: true }),
    ])

    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.status(200).json({
      previewId,
      provider: PROVIDER_ID,
      categories,
      historyDays,
      windowStart: windowStart.toISOString(),
      preview,
      persistedRawItems: 0,
      admittedToMemory: false,
      nextStep: 'Explicit import and downstream memory/media use consent are still required.',
    })
  } catch (error) {
    sendError(response, error)
  }
})
