import { buildOrbCompanionResponse } from '@/lib/orb-companion-contract'
import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import { currentSpeechTag } from '@/lib/i18n/localePreference'
import { contentLanguage } from '@/lib/i18n/contentLanguage'

export type OrbConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type OrbProviderResult = {
  message: string
  caption: string
  disclosure: string
  suggestedActions: string[]
  provider: 'openai' | 'fallback'
  locale: string
}

export type OrbProviderEvent =
  | { type: 'status'; status: string }
  | { type: 'delta'; text: string; locale?: string }
  | ({ type: 'done' } & OrbProviderResult)
  | { type: 'error'; code: string; message: string }

const DEFINITE_EXTERNAL_ATTEMPT_CODES = new Set([
  'MODERATION_UNAVAILABLE',
  'INPUT_BLOCKED',
  'OPENAI_REQUEST_FAILED',
  'OPENAI_RESPONSE_FAILED',
  'OPENAI_RESPONSE_INCOMPLETE',
  'INVALID_PROVIDER_RESPONSE',
])

const PRE_DISPATCH_REJECTION_CODES = new Set([
  'METHOD_NOT_ALLOWED', 'UNAUTHORIZED', 'INVALID_BODY', 'REQUEST_TOO_LARGE',
  'INVALID_MESSAGE', 'INVALID_REQUEST_ID', 'INVALID_CONTEXT', 'INVALID_LOCALE',
  'EXPLICIT_CONSENT_REQUIRED', 'CONSENT_POLICY_REQUIRED', 'MODEL_PROCESSING_NOT_AUTHORIZED',
  'CONSENT_ENFORCEMENT_PENDING', 'PROVIDER_PROCESSING_REVOKED', 'RATE_LIMITED', 'PROVIDER_UNCONFIGURED',
])

export class OrbProviderAttemptError extends Error {
  constructor(readonly code = 'EXTERNAL_PROVIDER_ATTEMPT_FAILED') {
    super('An OpenAI safety or response request was attempted but no external answer was used.')
    this.name = 'OrbProviderAttemptError'
  }
}

export class OrbProviderAttemptUncertainError extends Error {
  constructor() {
    super('A consented external request may have been attempted, but its processing state could not be confirmed.')
    this.name = 'OrbProviderAttemptUncertainError'
  }
}

function fallbackResult(message: string, disclosure: string): OrbProviderResult {
  const fallback = buildOrbCompanionResponse({ message })
  return {
    message: fallback.reply,
    caption: fallback.reply,
    disclosure,
    suggestedActions: fallback.routeHint ? [`Open ${fallback.routeHint}`, 'Review privacy controls'] : ['Pause here', 'Review privacy controls'],
    provider: 'fallback',
    locale: 'en-US',
  }
}

export function deterministicOrbFallback(message = ''): OrbProviderResult {
  return fallbackResult(message, 'Deterministic local fallback — this request was not sent to an external AI provider.')
}

export function attemptedExternalOrbFallback(message = ''): OrbProviderResult {
  return fallbackResult(
    message,
    'An OpenAI safety or response request was attempted with your consent, but no external answer was used. This response is a deterministic local fallback.',
  )
}

export function uncertainExternalOrbFallback(message = ''): OrbProviderResult {
  return fallbackResult(
    message,
    'A consented external request may have been attempted, but its processing state could not be confirmed. No external answer was used; this response is a deterministic local fallback.',
  )
}

async function stableIntentRequestId(message: string, context: OrbConversationMessage[], locale: string) {
  if (!globalThis.crypto?.subtle) return null
  message = message.trim()
  context = context.slice(-8).map(({ role, content }) => ({ role, content: content.trim() }))
  const intent = JSON.stringify({ message, context: context.slice(-8), locale })
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(intent))
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

export async function requestOpenAIOrb(input: {
  message: string
  context: OrbConversationMessage[]
  aiProcessingConsent: boolean
  locale?: string
  signal: AbortSignal
  onEvent?: (event: OrbProviderEvent) => void
}): Promise<OrbProviderResult | null> {
  if (!input.aiProcessingConsent || !firebasePublicEnvReady || input.signal.aborted) return null
  const locale = contentLanguage(input.locale ?? currentSpeechTag())?.speechTag
  if (!locale) return null
  const user = getAuth(app).currentUser
  if (!user) return null
  const ownsAccount = () => !input.signal.aborted && getAuth(app).currentUser === user
  const token = await user.getIdToken()
  if (!token || !ownsAccount()) return null
  const requestId = await stableIntentRequestId(input.message, input.context, locale)
  if (!requestId || !ownsAccount()) return null

  let response: Response
  try {
    response = await fetch(clientApiUrl('/api/urai/orb/openai'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: input.signal,
      body: JSON.stringify({
        message: input.message,
        context: input.context.slice(-8),
        aiProcessingConsent: true,
        requestId,
        locale,
      }),
    })
  } catch (error) {
    if (!ownsAccount()) return null
    if (input.signal.aborted) throw error
    throw new OrbProviderAttemptUncertainError()
  }
  if (!ownsAccount()) {
    await response.body?.cancel().catch(() => undefined)
    return null
  }

  if (!response.ok || !response.body) {
    let code = 'PROVIDER_BOUNDARY_FAILURE'
    try {
      const payload = await response.json() as { error?: unknown }
      if (payload.error) code = String(payload.error)
    } catch {
      // A submitted HTTP request with an unknown outcome may already be admitted.
    }
    if (!ownsAccount()) return null
    if (DEFINITE_EXTERNAL_ATTEMPT_CODES.has(code)) throw new OrbProviderAttemptError(code)
    if (PRE_DISPATCH_REJECTION_CODES.has(code)) return null
    throw new OrbProviderAttemptUncertainError()
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: OrbProviderResult | null = null

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (!ownsAccount()) { await reader.cancel().catch(() => undefined); return null }
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        let event: OrbProviderEvent
        try { event = JSON.parse(line) as OrbProviderEvent } catch { continue }
        if (event.type === 'delta' || event.type === 'done') {
          // Legacy English responses remain compatible; foreign responses must
          // declare the exact requested language before captions or voice consume them.
          const returned = contentLanguage(event.locale ?? (locale === 'en-US' ? 'en-US' : ''))
          if (!returned || returned.speechTag !== locale) throw new OrbProviderAttemptError('INVALID_PROVIDER_LOCALE')
          event = { ...event, locale: returned.speechTag }
        }
        input.onEvent?.(event)
        if (event.type === 'done') finalResult = event
        if (event.type === 'error') throw new OrbProviderAttemptError(event.code)
      }
    }
  } catch (error) {
    if (!ownsAccount()) return null
    if (input.signal.aborted) throw error
    if (error instanceof OrbProviderAttemptError) throw error
    throw new OrbProviderAttemptError('EXTERNAL_STREAM_FAILED')
  }

  if (!ownsAccount()) return null
  if (!finalResult) throw new OrbProviderAttemptError('EXTERNAL_RESPONSE_INCOMPLETE')
  return finalResult
}
