import { verifyFirebaseUser } from '@/lib/server/firebase-user'
import {
  ProviderBoundaryError,
  authorizeExternalProviderRequest,
  boundedAbortSignal,
  consumeProviderRateLimit,
  providerErrorResponse,
  readBoundedJson,
  recordProviderTelemetry,
} from '@/lib/server/provider-boundary'

const MAX_BODY_BYTES = 16_384
const HARD_MAX_TEXT_CHARS = 2_000
const DEFAULT_MAX_TEXT_CHARS = 1_200
const MAX_ESTIMATED_DURATION_SECONDS = 120
const ASSUMED_CHARACTERS_PER_SECOND = 14
const RATE_WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 6
const PROVIDER_TIMEOUT_MS = 15_000
const MAX_PROVIDER_ATTEMPTS = 1

type VoiceMode = 'narrator' | 'voice'

type VoiceBody = {
  text?: unknown
  voiceId?: unknown
  tone?: unknown
  externalProcessingConsent?: unknown
}

function maximumTextCharacters() {
  const configured = Number(process.env.ELEVENLABS_MAX_CHARACTERS_PER_REQUEST ?? DEFAULT_MAX_TEXT_CHARS)
  if (!Number.isFinite(configured)) return DEFAULT_MAX_TEXT_CHARS
  return Math.max(1, Math.min(HARD_MAX_TEXT_CHARS, Math.trunc(configured)))
}

function allowedVoiceIds(mode: VoiceMode) {
  const configured = String(process.env.ELEVENLABS_ALLOWED_VOICE_IDS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const modeDefault = mode === 'narrator'
    ? process.env.ELEVENLABS_DEFAULT_VOICE_ID
    : process.env.ELEVENLABS_VOICE_ID
  if (modeDefault) configured.push(modeDefault.trim())
  return new Set(configured)
}

function resolveVoiceId(mode: VoiceMode, requested: unknown) {
  const fallback = mode === 'narrator'
    ? process.env.ELEVENLABS_DEFAULT_VOICE_ID
    : process.env.ELEVENLABS_VOICE_ID
  const voiceId = String(requested ?? fallback ?? '').trim()
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(voiceId)) {
    throw new ProviderBoundaryError(400, 'INVALID_VOICE', 'The requested voice is invalid.')
  }
  const allowed = allowedVoiceIds(mode)
  if (!allowed.size || !allowed.has(voiceId)) {
    throw new ProviderBoundaryError(403, 'VOICE_NOT_AUTHORIZED', 'The requested voice is not authorized.')
  }
  return voiceId
}

function voiceSettings(tone: string) {
  return {
    stability: tone === 'tension' ? 0.42 : tone === 'grief' ? 0.58 : 0.66,
    similarity_boost: 0.78,
    style: tone === 'awe' ? 0.35 : tone === 'recovery' ? 0.28 : 0.18,
    use_speaker_boost: true,
  }
}

export async function handleElevenLabsSynthesis(request: Request, mode: VoiceMode) {
  const startedAt = Date.now()
  let uid: string | null = null
  try {
    uid = await verifyFirebaseUser(request)
    if (!uid) throw new ProviderBoundaryError(401, 'UNAUTHORIZED', 'Authentication is required.')

    const body = await readBoundedJson<VoiceBody>(request, MAX_BODY_BYTES)
    const text = String(body.text ?? '').trim()
    const maximumCharacters = maximumTextCharacters()
    if (!text) throw new ProviderBoundaryError(400, 'MISSING_TEXT', 'Text is required.')
    if (text.length > maximumCharacters) {
      throw new ProviderBoundaryError(413, 'TEXT_TOO_LONG', 'Text exceeds the configured voice limit.')
    }
    if (Math.ceil(text.length / ASSUMED_CHARACTERS_PER_SECOND) > MAX_ESTIMATED_DURATION_SECONDS) {
      throw new ProviderBoundaryError(413, 'AUDIO_TOO_LONG', 'Estimated audio duration exceeds the configured limit.')
    }

    const explicitConsent = body.externalProcessingConsent === true
    await authorizeExternalProviderRequest({ uid, provider: 'elevenlabs', explicitConsent })
    await consumeProviderRateLimit({
      uid,
      provider: 'elevenlabs',
      maximumRequests: MAX_REQUESTS_PER_WINDOW,
      windowMs: RATE_WINDOW_MS,
    })

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) throw new ProviderBoundaryError(503, 'ELEVENLABS_NOT_CONFIGURED', 'The voice provider is not configured.')
    const voiceId = resolveVoiceId(mode, body.voiceId)
    const tone = String(body.tone ?? 'calm').slice(0, 32)
    const zeroRetention = process.env.ELEVENLABS_ZERO_RETENTION === 'true'
    const endpoint = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`)
    endpoint.searchParams.set('output_format', process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128')
    if (zeroRetention) endpoint.searchParams.set('enable_logging', 'false')

    // Paid synthesis is deliberately single-attempt to avoid duplicate audio charges.
    if (MAX_PROVIDER_ATTEMPTS !== 1) throw new ProviderBoundaryError(500, 'INVALID_RETRY_POLICY', 'Invalid voice retry policy.')
    const boundary = boundedAbortSignal(request.signal, PROVIDER_TIMEOUT_MS)
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
          voice_settings: voiceSettings(tone),
        }),
        signal: boundary.signal,
      })

      if (!upstream.ok || !upstream.body) {
        const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : 502
        throw new ProviderBoundaryError(status, 'ELEVENLABS_REQUEST_FAILED', 'The voice provider is unavailable.')
      }

      const requestId = upstream.headers.get('request-id') ?? upstream.headers.get('x-request-id')
      const characterCost = Number(upstream.headers.get('character-cost') ?? text.length)
      await recordProviderTelemetry({
        uid,
        provider: 'elevenlabs',
        outcome: 'success',
        inputUnits: Number.isFinite(characterCost) ? characterCost : text.length,
        outputUnits: 0,
        latencyMs: Date.now() - startedAt,
        upstreamRequestId: requestId,
      })

      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Content-Type-Options': 'nosniff',
          'X-URAI-Provider': 'elevenlabs',
        },
      })
    } catch (error) {
      await recordProviderTelemetry({
        uid,
        provider: 'elevenlabs',
        outcome: boundary.didTimeOut() ? 'timeout' : request.signal.aborted ? 'cancelled' : 'failure',
        inputUnits: text.length,
        latencyMs: Date.now() - startedAt,
      })
      if (boundary.didTimeOut()) {
        throw new ProviderBoundaryError(504, 'ELEVENLABS_TIMEOUT', 'The voice provider timed out.')
      }
      throw error
    } finally {
      boundary.cleanup()
    }
  } catch (error) {
    if (uid && error instanceof ProviderBoundaryError && ['EXPLICIT_CONSENT_REQUIRED', 'MODEL_PROCESSING_NOT_AUTHORIZED', 'PROVIDER_PROCESSING_REVOKED'].includes(error.code)) {
      await recordProviderTelemetry({
        uid,
        provider: 'elevenlabs',
        outcome: 'blocked',
        inputUnits: 0,
        latencyMs: Date.now() - startedAt,
      })
    }
    return providerErrorResponse(error)
  }
}
