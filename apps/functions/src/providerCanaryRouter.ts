import { createHash } from 'node:crypto'
import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import {
  DigitalOceanProviderError,
  runDigitalOceanSyntheticCanary,
} from './digitalOceanProvider'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const REGION = 'us-central1'
const RATE_WINDOW_MS = 60_000
export const DIGITALOCEAN_MODEL_ACCESS_KEY = defineSecret('DIGITALOCEAN_MODEL_ACCESS_KEY')

type JsonMap = Record<string, unknown>
type CanaryProvider = 'digitalocean'

class ProviderBoundaryError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'ProviderBoundaryError'
  }
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function bearerToken(value: unknown) {
  const header = Array.isArray(value) ? value[0] : String(value ?? '')
  if (!header.startsWith('Bearer ')) throw new ProviderBoundaryError(401, 'UNAUTHORIZED', 'Authentication is required.')
  const token = header.slice(7).trim()
  if (!token) throw new ProviderBoundaryError(401, 'UNAUTHORIZED', 'Authentication is required.')
  return token
}

async function authenticatedUid(request: { headers: Record<string, unknown> }) {
  try {
    const decoded = await admin.auth().verifyIdToken(bearerToken(request.headers.authorization), true)
    if (!decoded.uid) throw new ProviderBoundaryError(401, 'UNAUTHORIZED', 'Authentication is required.')
    return decoded.uid
  } catch {
    throw new ProviderBoundaryError(401, 'UNAUTHORIZED', 'Authentication is required.')
  }
}

async function requireProviderConsent(uid: string, provider: CanaryProvider, explicitConsent: boolean) {
  if (!explicitConsent) throw new ProviderBoundaryError(403, 'EXPLICIT_CONSENT_REQUIRED', 'External processing consent is required.')
  const policyRef = 'users/' + uid + '/privacyPolicy/current'
  const providerRef = 'users/' + uid + '/providerConnections/' + provider
  const [policySnapshot, providerSnapshot] = await Promise.all([
    db.doc(policyRef).get(),
    db.doc(providerRef).get(),
  ])
  if (!policySnapshot.exists) throw new ProviderBoundaryError(403, 'CONSENT_POLICY_REQUIRED', 'A saved privacy policy is required.')
  const policy = policySnapshot.data() ?? {}
  const domains = isRecord(policy.domains) ? policy.domains : {}
  const models = isRecord(domains.models) ? domains.models : {}
  const enforcement = isRecord(policy.enforcement) ? policy.enforcement : {}
  if (models.mode !== 'granted' || models.modelContext !== true) {
    throw new ProviderBoundaryError(403, 'MODEL_PROCESSING_NOT_AUTHORIZED', 'Model processing is not authorized.')
  }
  if (enforcement.state !== 'fully-enforced') {
    throw new ProviderBoundaryError(409, 'CONSENT_ENFORCEMENT_PENDING', 'Privacy changes are still being enforced.')
  }
  if (providerSnapshot.exists) {
    const connection = providerSnapshot.data() ?? {}
    const revocationState = String(connection.revocationState ?? 'not-required')
    if (connection.processingAllowed !== true || ['requested', 'pending', 'complete'].includes(revocationState)) {
      throw new ProviderBoundaryError(403, 'PROVIDER_PROCESSING_REVOKED', 'Provider processing is not authorized.')
    }
  }
}

async function consumeRateLimit(uid: string, provider: CanaryProvider, maximum: number) {
  const ref = db.doc('users/' + uid + '/providerRateLimits/' + provider)
  const now = Date.now()
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data() ?? {}
    const prior = data.windowStartedAt instanceof admin.firestore.Timestamp ? data.windowStartedAt.toMillis() : 0
    const active = prior > 0 && now - prior < RATE_WINDOW_MS
    const count = active ? Number(data.count ?? 0) : 0
    if (count >= maximum) throw new ProviderBoundaryError(429, 'RATE_LIMITED', 'Provider request limit reached. Try again shortly.')
    transaction.set(ref, {
      provider,
      count: count + 1,
      windowStartedAt: admin.firestore.Timestamp.fromMillis(active ? prior : now),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  })
}

async function recordTelemetry(input: {
  uid: string
  outcome: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  upstreamRequestId?: string | null
}) {
  try {
    const requestDigest = input.upstreamRequestId
      ? createHash('sha256').update(input.upstreamRequestId).digest('hex').slice(0, 24)
      : null
    await db.doc('users/' + input.uid + '/providerTelemetry/digitalocean').set({
      provider: 'digitalocean',
      requestCount: admin.firestore.FieldValue.increment(1),
      inputTokens: admin.firestore.FieldValue.increment(Math.max(0, Math.trunc(input.inputTokens ?? 0))),
      outputTokens: admin.firestore.FieldValue.increment(Math.max(0, Math.trunc(input.outputTokens ?? 0))),
      lastOutcome: input.outcome,
      lastLatencyMs: Math.max(0, Math.trunc(input.latencyMs)),
      lastRequestDigest: requestDigest,
      dataClass: 'synthetic',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  } catch {
    // Aggregate telemetry is non-blocking and stores neither prompts nor generated text.
  }
}

function readBody(request: { body?: unknown }) {
  if (!isRecord(request.body)) throw new ProviderBoundaryError(400, 'INVALID_BODY', 'Request body must be a JSON object.')
  if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > 4_096) {
    throw new ProviderBoundaryError(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
  }
  return request.body
}

function normalizeError(error: unknown) {
  if (error instanceof ProviderBoundaryError) return error
  if (error instanceof DigitalOceanProviderError) {
    return new ProviderBoundaryError(error.status, error.code, error.message)
  }
  return new ProviderBoundaryError(500, 'PROVIDER_BOUNDARY_FAILURE', 'Provider boundary is unavailable.')
}

function sendError(response: { status: (code: number) => { json: (value: unknown) => void } }, error: unknown) {
  const boundary = normalizeError(error)
  response.status(boundary.status).json({ error: boundary.code, message: boundary.message })
}

export const providerCanaryRouter = onRequest({
  region: REGION,
  timeoutSeconds: 20,
  memory: '256MiB',
  cors: false,
  secrets: [DIGITALOCEAN_MODEL_ACCESS_KEY],
}, async (request, response) => {
  const startedAt = Date.now()
  let uid = ''
  const controller = new AbortController()
  request.on('aborted', () => controller.abort())
  response.on('close', () => {
    if (!response.writableEnded) {
      controller.abort()
    }
  })

  try {
    if (request.method !== 'POST') throw new ProviderBoundaryError(405, 'METHOD_NOT_ALLOWED', 'POST is required.')
    if (process.env.URAI_ENABLE_DIGITALOCEAN !== 'true') {
      throw new ProviderBoundaryError(503, 'DIGITALOCEAN_DISABLED', 'DigitalOcean inference is disabled.')
    }

    uid = await authenticatedUid(request)
    const body = readBody(request)
    if (body.provider !== 'digitalocean') throw new ProviderBoundaryError(400, 'UNSUPPORTED_PROVIDER', 'Unsupported provider canary.')
    if (body.syntheticTest !== true || body.dataClass !== 'synthetic') {
      throw new ProviderBoundaryError(403, 'SYNTHETIC_ONLY', 'DigitalOcean canary accepts synthetic test data only.')
    }

    await requireProviderConsent(uid, 'digitalocean', body.externalProcessingConsent === true)
    await consumeRateLimit(uid, 'digitalocean', 4)

    if (request.aborted || response.destroyed || controller.signal.aborted) {
      throw new ProviderBoundaryError(499, 'CLIENT_DISCONNECTED', 'Client disconnected before provider invocation.')
    }
    const result = await runDigitalOceanSyntheticCanary({
      apiKey: DIGITALOCEAN_MODEL_ACCESS_KEY.value(),
      model: process.env.DIGITALOCEAN_MODEL_ID || 'openai-gpt-oss-20b',
      signal: controller.signal,
    })

    const latencyMs = Date.now() - startedAt
    response.status(200)
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-URAI-Provider', 'digitalocean')
    response.json({
      ok: true,
      provider: result.provider,
      model: result.model,
      synthetic: result.synthetic,
      latencyMs,
      usage: result.usage,
    })

    await recordTelemetry({
      uid,
      outcome: 'success',
      latencyMs,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      upstreamRequestId: result.upstreamRequestId,
    })
  } catch (error) {
    if (uid) await recordTelemetry({ uid, outcome: 'failure', latencyMs: Date.now() - startedAt })
    sendError(response, error)
  }
})
