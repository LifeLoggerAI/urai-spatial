import { createHash } from 'node:crypto'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'

export type ExternalProvider = 'openai' | 'elevenlabs'

export class ProviderBoundaryError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ProviderBoundaryError'
  }
}

function ensureAdminApp() {
  if (getApps().length) return
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new ProviderBoundaryError(503, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication service is unavailable.')
  try {
    initializeApp({ credential: cert(JSON.parse(raw)) })
  } catch {
    throw new ProviderBoundaryError(503, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication service is unavailable.')
  }
}

function providerDatabase() {
  ensureAdminApp()
  return getFirestore()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function readBoundedJson<T extends object>(
  request: Request,
  maximumBytes: number,
): Promise<T> {
  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ProviderBoundaryError(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
  }
  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > maximumBytes) {
    throw new ProviderBoundaryError(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ProviderBoundaryError(400, 'INVALID_JSON', 'Request body must be valid JSON.')
  }
  if (!isRecord(parsed)) {
    throw new ProviderBoundaryError(400, 'INVALID_BODY', 'Request body must be an object.')
  }
  return parsed as T
}

export type ProviderAuthorization = {
  revision: number
  mode: string
}

export async function authorizeExternalProviderRequest(input: {
  uid: string
  provider: ExternalProvider
  explicitConsent: boolean
}): Promise<ProviderAuthorization> {
  if (!input.explicitConsent) {
    throw new ProviderBoundaryError(403, 'EXPLICIT_CONSENT_REQUIRED', 'External processing consent is required.')
  }

  const db = providerDatabase()
  const [policySnapshot, connectionSnapshot] = await Promise.all([
    db.doc(`users/${input.uid}/privacyPolicy/current`).get(),
    db.doc(`users/${input.uid}/providerConnections/${input.provider}`).get(),
  ])

  if (!policySnapshot.exists) {
    throw new ProviderBoundaryError(403, 'CONSENT_POLICY_REQUIRED', 'A saved privacy policy is required.')
  }

  const policy = policySnapshot.data() ?? {}
  const domains = isRecord(policy.domains) ? policy.domains : {}
  const models = isRecord(domains.models) ? domains.models : {}
  const enforcement = isRecord(policy.enforcement) ? policy.enforcement : {}
  const mode = String(models.mode ?? '')

  if (mode !== 'granted' || models.modelContext !== true) {
    throw new ProviderBoundaryError(403, 'MODEL_PROCESSING_NOT_AUTHORIZED', 'Model processing is not authorized.')
  }
  if (String(enforcement.state ?? '') !== 'fully-enforced') {
    throw new ProviderBoundaryError(409, 'CONSENT_ENFORCEMENT_PENDING', 'Privacy changes are still being enforced.')
  }

  if (connectionSnapshot.exists) {
    const connection = connectionSnapshot.data() ?? {}
    const revocationState = String(connection.revocationState ?? 'not-required')
    if (connection.processingAllowed !== true || ['requested', 'pending', 'complete'].includes(revocationState)) {
      throw new ProviderBoundaryError(403, 'PROVIDER_PROCESSING_REVOKED', 'Provider processing is not authorized.')
    }
  }

  return {
    revision: Number(policy.revision ?? 0),
    mode,
  }
}

export async function consumeProviderRateLimit(input: {
  uid: string
  provider: ExternalProvider
  maximumRequests: number
  windowMs: number
}): Promise<{ remaining: number }> {
  const db = providerDatabase()
  const ref = db.doc(`users/${input.uid}/providerRateLimits/${input.provider}`)
  const now = Date.now()

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data() ?? {}
    const priorStart = data.windowStartedAt instanceof Timestamp ? data.windowStartedAt.toMillis() : 0
    const withinWindow = priorStart > 0 && now - priorStart < input.windowMs
    const count = withinWindow ? Number(data.count ?? 0) : 0

    if (count >= input.maximumRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((input.windowMs - (now - priorStart)) / 1000))
      throw new ProviderBoundaryError(429, 'RATE_LIMITED', `Try again in ${retryAfterSeconds} seconds.`)
    }

    const nextCount = count + 1
    transaction.set(ref, {
      provider: input.provider,
      count: nextCount,
      windowStartedAt: Timestamp.fromMillis(withinWindow ? priorStart : now),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    return { remaining: Math.max(0, input.maximumRequests - nextCount) }
  })
}

export function providerSafetyIdentifier(uid: string): string {
  return createHash('sha256').update(`urai-provider-safety:${uid}`).digest('hex')
}

export async function recordProviderTelemetry(input: {
  uid: string
  provider: ExternalProvider
  outcome: 'success' | 'blocked' | 'cancelled' | 'timeout' | 'unavailable' | 'failure'
  inputUnits: number
  outputUnits?: number
  latencyMs: number
  upstreamRequestId?: string | null
}) {
  try {
    const db = providerDatabase()
    const requestDigest = input.upstreamRequestId
      ? createHash('sha256').update(input.upstreamRequestId).digest('hex').slice(0, 24)
      : null
    await db.doc(`users/${input.uid}/providerTelemetry/${input.provider}`).set({
      provider: input.provider,
      requestCount: FieldValue.increment(1),
      inputUnits: FieldValue.increment(Math.max(0, Math.trunc(input.inputUnits))),
      outputUnits: FieldValue.increment(Math.max(0, Math.trunc(input.outputUnits ?? 0))),
      lastOutcome: input.outcome,
      lastLatencyMs: Math.max(0, Math.trunc(input.latencyMs)),
      lastRequestDigest: requestDigest,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  } catch {
    // Telemetry is intentionally non-blocking and contains no prompt or generated text.
  }
}

export function boundedAbortSignal(requestSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort(new DOMException('Provider request timed out', 'TimeoutError'))
  }, timeoutMs)
  const onAbort = () => controller.abort(requestSignal.reason)
  requestSignal.addEventListener('abort', onAbort, { once: true })

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timeout)
      requestSignal.removeEventListener('abort', onAbort)
    },
  }
}

export function providerErrorResponse(error: unknown): Response {
  if (error instanceof ProviderBoundaryError) {
    const headers = error.status === 429
      ? { 'Retry-After': error.message.match(/\d+/)?.[0] ?? '60' }
      : undefined
    return Response.json({ error: error.code, message: error.message }, { status: error.status, headers })
  }
  return Response.json({ error: 'PROVIDER_BOUNDARY_FAILURE', message: 'The provider boundary is unavailable.' }, { status: 500 })
}
