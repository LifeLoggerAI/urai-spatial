import * as admin from 'firebase-admin'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'

if (!admin.apps.length) admin.initializeApp()

const db = admin.firestore()
const ELEVENLABS_API_KEY = defineSecret('ELEVENLABS_API_KEY')
const REGION = 'us-central1'
const RATE_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 6

type JsonMap = Record<string, unknown>
type FounderPerformanceMode =
  | 'natural'
  | 'neutral'
  | 'warm'
  | 'reflective'
  | 'serious'
  | 'curious'
  | 'excited'
  | 'quiet'
  | 'reassuring'
  | 'authoritative'

type VoiceSettings = {
  stability: number
  similarity_boost: number
  style: number
  use_speaker_boost: boolean
}

type FounderUsageOutcome = 'success' | 'provider_error' | 'network_error' | 'stream_error'

const FOUNDER_PERFORMANCE_MODES = new Set<FounderPerformanceMode>([
  'natural',
  'neutral',
  'warm',
  'reflective',
  'serious',
  'curious',
  'excited',
  'quiet',
  'reassuring',
  'authoritative',
])

const FOUNDER_VOICE_SETTINGS: Record<FounderPerformanceMode, VoiceSettings> = {
  natural: { stability: 0.66, similarity_boost: 0.84, style: 0.14, use_speaker_boost: true },
  neutral: { stability: 0.72, similarity_boost: 0.82, style: 0.08, use_speaker_boost: true },
  warm: { stability: 0.68, similarity_boost: 0.84, style: 0.2, use_speaker_boost: true },
  reflective: { stability: 0.74, similarity_boost: 0.84, style: 0.12, use_speaker_boost: true },
  serious: { stability: 0.78, similarity_boost: 0.84, style: 0.08, use_speaker_boost: true },
  curious: { stability: 0.64, similarity_boost: 0.82, style: 0.22, use_speaker_boost: true },
  excited: { stability: 0.56, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
  quiet: { stability: 0.78, similarity_boost: 0.84, style: 0.08, use_speaker_boost: true },
  reassuring: { stability: 0.74, similarity_boost: 0.84, style: 0.14, use_speaker_boost: true },
  authoritative: { stability: 0.76, similarity_boost: 0.86, style: 0.12, use_speaker_boost: true },
}

const FOUNDER_USAGE_COUNTER_FIELDS: Record<FounderUsageOutcome, string> = {
  success: 'successCount',
  provider_error: 'providerErrorCount',
  network_error: 'networkErrorCount',
  stream_error: 'streamErrorCount',
}

class FounderVoiceError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'FounderVoiceError'
  }
}

function isRecord(value: unknown): value is JsonMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function bearerToken(value: unknown) {
  const header = Array.isArray(value) ? value[0] : String(value ?? '')
  if (!header.startsWith('Bearer ')) throw new FounderVoiceError(401, 'UNAUTHORIZED', 'Authentication is required.')
  const token = header.slice(7).trim()
  if (!token) throw new FounderVoiceError(401, 'UNAUTHORIZED', 'Authentication is required.')
  return token
}

async function authenticatedUid(request: { headers: Record<string, unknown> }) {
  const decoded = await admin.auth().verifyIdToken(bearerToken(request.headers.authorization), true)
  if (!decoded.uid) throw new FounderVoiceError(401, 'UNAUTHORIZED', 'Authentication is required.')
  return decoded.uid
}

async function requireVoiceConsent(uid: string, explicitConsent: boolean) {
  if (!explicitConsent) throw new FounderVoiceError(403, 'EXPLICIT_CONSENT_REQUIRED', 'External processing consent is required.')
  const [policySnapshot, providerSnapshot] = await Promise.all([
    db.doc(`users/${uid}/privacyPolicy/current`).get(),
    db.doc(`users/${uid}/providerConnections/elevenlabs`).get(),
  ])
  if (!policySnapshot.exists) throw new FounderVoiceError(403, 'CONSENT_POLICY_REQUIRED', 'A saved privacy policy is required.')
  const policy = policySnapshot.data() ?? {}
  const domains = isRecord(policy.domains) ? policy.domains : {}
  const models = isRecord(domains.models) ? domains.models : {}
  const enforcement = isRecord(policy.enforcement) ? policy.enforcement : {}
  if (models.mode !== 'granted' || models.modelContext !== true) {
    throw new FounderVoiceError(403, 'MODEL_PROCESSING_NOT_AUTHORIZED', 'Model processing is not authorized.')
  }
  if (enforcement.state !== 'fully-enforced') {
    throw new FounderVoiceError(409, 'CONSENT_ENFORCEMENT_PENDING', 'Privacy changes are still being enforced.')
  }
  if (providerSnapshot.exists) {
    const connection = providerSnapshot.data() ?? {}
    const revocationState = String(connection.revocationState ?? 'not-required')
    if (connection.processingAllowed !== true || ['requested', 'pending', 'complete'].includes(revocationState)) {
      throw new FounderVoiceError(403, 'PROVIDER_PROCESSING_REVOKED', 'Provider processing is not authorized.')
    }
  }
}

async function consumeFounderVoiceRateLimit(uid: string) {
  const ref = db.doc(`users/${uid}/providerRateLimits/elevenlabs-founder`)
  const now = Date.now()
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    const data = snapshot.data() ?? {}
    const prior = data.windowStartedAt instanceof admin.firestore.Timestamp ? data.windowStartedAt.toMillis() : 0
    const active = prior > 0 && now - prior < RATE_WINDOW_MS
    const count = active ? Number(data.count ?? 0) : 0
    if (count >= MAX_REQUESTS_PER_WINDOW) throw new FounderVoiceError(429, 'RATE_LIMITED', 'Founder voice request limit reached. Try again shortly.')
    transaction.set(ref, {
      provider: 'elevenlabs-founder',
      count: count + 1,
      windowStartedAt: admin.firestore.Timestamp.fromMillis(active ? prior : now),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
  })
}

async function recordFounderVoiceUsage({
  uid,
  performanceMode,
  characterCount,
  outcome,
  latencyMs,
  providerModel,
}: {
  uid: string
  performanceMode: FounderPerformanceMode
  characterCount: number
  outcome: FounderUsageOutcome
  latencyMs: number
  providerModel: string
}) {
  const bucket = new Date().toISOString().slice(0, 10)
  const ref = db.doc(`users/${uid}/providerUsage/elevenlabs-founder-${bucket}`)
  const outcomeCounter = FOUNDER_USAGE_COUNTER_FIELDS[outcome]
  await ref.set({
    provider: 'elevenlabs',
    voiceRole: 'founder',
    date: bucket,
    requestCount: admin.firestore.FieldValue.increment(1),
    characterCount: admin.firestore.FieldValue.increment(characterCount),
    totalLatencyMs: admin.firestore.FieldValue.increment(Math.max(0, Math.round(latencyMs))),
    [outcomeCounter]: admin.firestore.FieldValue.increment(1),
    lastOutcome: outcome,
    lastPerformanceMode: performanceMode,
    providerModel,
    rateWindowMs: RATE_WINDOW_MS,
    maxRequestsPerWindow: MAX_REQUESTS_PER_WINDOW,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })
}

function readBody(request: { body?: unknown }) {
  if (!isRecord(request.body)) throw new FounderVoiceError(400, 'INVALID_BODY', 'Request body must be a JSON object.')
  if (Buffer.byteLength(JSON.stringify(request.body), 'utf8') > 16_384) {
    throw new FounderVoiceError(413, 'REQUEST_TOO_LARGE', 'Request body is too large.')
  }
  return request.body
}

function resolveFounderVoiceId() {
  if (process.env.FOUNDER_VOICE_ENABLED !== 'true') {
    throw new FounderVoiceError(503, 'FOUNDER_VOICE_DISABLED', 'Founder voice is disabled.')
  }
  const voiceId = String(process.env.FOUNDER_VOICE_ID ?? '').trim()
  const allowed = new Set(String(process.env.ELEVENLABS_ALLOWED_VOICE_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean))
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(voiceId) || !allowed.has(voiceId)) {
    throw new FounderVoiceError(503, 'FOUNDER_VOICE_NOT_CONFIGURED', 'Founder voice is not configured.')
  }
  return voiceId
}

function resolvePerformanceMode(value: unknown): FounderPerformanceMode {
  const mode = String(value ?? 'natural') as FounderPerformanceMode
  if (!FOUNDER_PERFORMANCE_MODES.has(mode)) {
    throw new FounderVoiceError(400, 'INVALID_FOUNDER_PERFORMANCE_MODE', 'Founder performance mode is invalid.')
  }
  return mode
}

function sendError(response: { status: (code: number) => { json: (value: unknown) => void } }, error: unknown) {
  const boundary = error instanceof FounderVoiceError
    ? error
    : new FounderVoiceError(500, 'FOUNDER_VOICE_BOUNDARY_FAILURE', 'Founder voice boundary is unavailable.')
  response.status(boundary.status).json({ error: boundary.code, message: boundary.message })
}

export const founderVoiceProvider = onRequest({
  region: REGION,
  timeoutSeconds: 30,
  memory: '256MiB',
  cors: false,
  secrets: [ELEVENLABS_API_KEY],
}, async (request, response) => {
  try {
    if (request.method !== 'POST') throw new FounderVoiceError(405, 'METHOD_NOT_ALLOWED', 'POST is required.')
    const uid = await authenticatedUid(request)
    const body = readBody(request)
    const text = String(body.text ?? '').trim()
    const maximumCharacters = Math.max(1, Math.min(2_000, Number(process.env.FOUNDER_VOICE_MAX_CHARACTERS_PER_REQUEST ?? 1_200)))
    if (!text) throw new FounderVoiceError(400, 'MISSING_TEXT', 'Text is required.')
    if (text.length > maximumCharacters || Math.ceil(text.length / 14) > 120) {
      throw new FounderVoiceError(413, 'AUDIO_TOO_LONG', 'Founder voice request exceeds the configured limit.')
    }

    await requireVoiceConsent(uid, body.externalProcessingConsent === true)
    await consumeFounderVoiceRateLimit(uid)

    const voiceId = resolveFounderVoiceId()
    const performanceMode = resolvePerformanceMode(body.founderPerformanceMode)
    const providerModel = process.env.FOUNDER_VOICE_MODEL || 'eleven_multilingual_v2'
    const endpoint = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`)
    endpoint.searchParams.set('output_format', process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128')
    if (process.env.ELEVENLABS_ZERO_RETENTION === 'true') endpoint.searchParams.set('enable_logging', 'false')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    request.on('close', () => controller.abort())
    const providerStartedAt = Date.now()
    let upstream: Response
    try {
      upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY.value(),
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: providerModel,
          voice_settings: FOUNDER_VOICE_SETTINGS[performanceMode],
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout))
    } catch {
      await recordFounderVoiceUsage({
        uid,
        performanceMode,
        characterCount: text.length,
        outcome: 'network_error',
        latencyMs: Date.now() - providerStartedAt,
        providerModel,
      }).catch(() => undefined)
      throw new FounderVoiceError(503, 'FOUNDER_VOICE_REQUEST_FAILED', 'Founder voice provider is unavailable.')
    }

    if (!upstream.ok || !upstream.body) {
      await recordFounderVoiceUsage({
        uid,
        performanceMode,
        characterCount: text.length,
        outcome: 'provider_error',
        latencyMs: Date.now() - providerStartedAt,
        providerModel,
      }).catch(() => undefined)
      throw new FounderVoiceError(upstream.status === 429 ? 429 : 503, 'FOUNDER_VOICE_REQUEST_FAILED', 'Founder voice provider is unavailable.')
    }

    response.status(200)
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-URAI-Provider', 'elevenlabs')
    response.setHeader('X-URAI-Voice-Role', 'founder')
    response.setHeader('X-URAI-Founder-Performance', performanceMode)

    const reader = upstream.body.getReader()
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        response.write(Buffer.from(value))
      }
    } catch {
      await recordFounderVoiceUsage({
        uid,
        performanceMode,
        characterCount: text.length,
        outcome: 'stream_error',
        latencyMs: Date.now() - providerStartedAt,
        providerModel,
      }).catch(() => undefined)
      throw new FounderVoiceError(503, 'FOUNDER_VOICE_STREAM_FAILED', 'Founder voice stream was interrupted.')
    }

    await recordFounderVoiceUsage({
      uid,
      performanceMode,
      characterCount: text.length,
      outcome: 'success',
      latencyMs: Date.now() - providerStartedAt,
      providerModel,
    }).catch(() => undefined)
    response.end()
  } catch (error) {
    if (!response.headersSent) sendError(response, error)
    else response.end()
  }
})
