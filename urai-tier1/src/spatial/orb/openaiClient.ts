import { buildOrbCompanionResponse } from '@/lib/orb-companion-contract'
import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'

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
}

export type OrbProviderEvent =
  | { type: 'status'; status: string }
  | { type: 'delta'; text: string }
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
  }
}

export function deterministicOrbFallback(message = ''): OrbProviderResult {
  return fallbackResult(message, 'Deterministic local fallback — no external AI provider processed this message.')
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

export async function requestOpenAIOrb(input: {
  message: string
  context: OrbConversationMessage[]
  aiProcessingConsent: boolean
  signal: AbortSignal
  onEvent?: (event: OrbProviderEvent) => void
}): Promise<OrbProviderResult | null> {
  if (!input.aiProcessingConsent || !firebasePublicEnvReady || input.signal.aborted) return null
  const user = getAuth(app).currentUser
  if (!user) return null
  const token = await user.getIdToken()
  if (!token || input.signal.aborted) return null

  let response: Response
  try {
    response = await fetch('/api/urai/orb/openai', {
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
      }),
    })
  } catch (error) {
    if (input.signal.aborted) throw error
    throw new OrbProviderAttemptUncertainError()
  }

  if (!response.ok || !response.body) {
    let code = 'PROVIDER_BOUNDARY_FAILURE'
    try {
      const payload = await response.json() as { error?: unknown }
      if (payload.error) code = String(payload.error)
    } catch {
      // Unknown boundary failures remain local-only unless a provider-stage code proves an external attempt.
    }
    if (DEFINITE_EXTERNAL_ATTEMPT_CODES.has(code)) throw new OrbProviderAttemptError(code)
    return null
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: OrbProviderResult | null = null

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        let event: OrbProviderEvent
        try { event = JSON.parse(line) as OrbProviderEvent } catch { continue }
        input.onEvent?.(event)
        if (event.type === 'done') finalResult = event
        if (event.type === 'error') throw new OrbProviderAttemptError(event.code)
      }
    }
  } catch (error) {
    if (input.signal.aborted) throw error
    if (error instanceof OrbProviderAttemptError) throw error
    throw new OrbProviderAttemptError('EXTERNAL_STREAM_FAILED')
  }

  if (!finalResult) throw new OrbProviderAttemptError('EXTERNAL_RESPONSE_INCOMPLETE')
  return finalResult
}
