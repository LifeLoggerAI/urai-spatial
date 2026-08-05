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

export class OrbProviderAttemptError extends Error {
  constructor(readonly code = 'EXTERNAL_PROVIDER_ATTEMPT_FAILED') {
    super('An external OpenAI safety or response request was attempted but no external answer was used.')
    this.name = 'OrbProviderAttemptError'
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
    'OpenAI safety or response processing was attempted with your consent, but no external answer was used. This response is a deterministic local fallback.',
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
    throw new OrbProviderAttemptError('EXTERNAL_REQUEST_FAILED')
  }

  if (!response.ok || !response.body) {
    let code = 'EXTERNAL_PROVIDER_ATTEMPT_FAILED'
    try {
      const payload = await response.json() as { error?: unknown }
      if (payload.error) code = String(payload.error)
    } catch {
      // The response status still proves that the consented external boundary was attempted.
    }
    throw new OrbProviderAttemptError(code)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: OrbProviderResult | null = null

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

  if (!finalResult) throw new OrbProviderAttemptError('EXTERNAL_RESPONSE_INCOMPLETE')
  return finalResult
}
