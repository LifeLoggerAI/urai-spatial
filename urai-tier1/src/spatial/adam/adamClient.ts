import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import type { AdamSurfaceId } from './adamSurfaceContext'

export type AdamConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AdamProviderResult = {
  message: string
  caption: string
  suggestedActions: string[]
  requiresHumanFounder: boolean
  handoffReason: string
  provider: 'openai'
}

export type AdamProviderEvent =
  | { type: 'status'; status: string; surface?: AdamSurfaceId }
  | { type: 'delta'; text: string }
  | ({ type: 'done' } & AdamProviderResult)
  | { type: 'error'; code: string; message: string }

export class AdamProviderError extends Error {
  constructor(readonly code: string, message = 'Adam is unavailable.') {
    super(message)
    this.name = 'AdamProviderError'
  }
}

async function bearerToken() {
  if (!firebasePublicEnvReady) throw new AdamProviderError('FIREBASE_NOT_READY', 'UrAi authentication is not ready.')
  const user = getAuth(app).currentUser
  if (!user) throw new AdamProviderError('AUTH_REQUIRED', 'Sign in to talk with Adam.')
  const token = await user.getIdToken()
  if (!token) throw new AdamProviderError('AUTH_REQUIRED', 'Sign in to talk with Adam.')
  return token
}

export async function requestAdamPresence(input: {
  message: string
  context: AdamConversationMessage[]
  surface: AdamSurfaceId
  locale: string
  aiProcessingConsent: boolean
  signal: AbortSignal
  onEvent?: (event: AdamProviderEvent) => void
}): Promise<AdamProviderResult> {
  const token = await bearerToken()
  let response: Response
  try {
    response = await fetch(clientApiUrl('/api/urai/adam/conversation'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: input.signal,
      body: JSON.stringify({
        message: input.message,
        context: input.context.slice(-10),
        surface: input.surface,
        locale: input.locale,
        aiProcessingConsent: input.aiProcessingConsent,
      }),
    })
  } catch (error) {
    if (input.signal.aborted) throw error
    throw new AdamProviderError('NETWORK_UNAVAILABLE', 'Adam could not be reached.')
  }

  if (!response.ok || !response.body) {
    let code = 'ADAM_PROVIDER_BOUNDARY_FAILURE'
    let message = 'Adam is unavailable.'
    try {
      const payload = await response.json() as { error?: unknown; message?: unknown }
      if (payload.error) code = String(payload.error)
      if (payload.message) message = String(payload.message)
    } catch {
      // Preserve the generic boundary error.
    }
    throw new AdamProviderError(code, message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finalResult: AdamProviderResult | null = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      let event: AdamProviderEvent
      try { event = JSON.parse(line) as AdamProviderEvent } catch { continue }
      input.onEvent?.(event)
      if (event.type === 'done') finalResult = event
      if (event.type === 'error') throw new AdamProviderError(event.code, event.message)
    }
  }

  if (!finalResult) throw new AdamProviderError('ADAM_RESPONSE_INCOMPLETE', 'Adam returned an incomplete response.')
  return finalResult
}

export async function requestAdamFounderVoice(input: {
  text: string
  externalProcessingConsent: boolean
  signal: AbortSignal
}): Promise<{ blob: Blob | null; errorCode: string | null }> {
  const token = await bearerToken()
  let response: Response
  try {
    response = await fetch(clientApiUrl('/api/urai/adam/voice'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: input.signal,
      body: JSON.stringify({
        text: input.text,
        externalProcessingConsent: input.externalProcessingConsent,
      }),
    })
  } catch (error) {
    if (input.signal.aborted) throw error
    return { blob: null, errorCode: 'VOICE_NETWORK_UNAVAILABLE' }
  }
  if (!response.ok) {
    let errorCode = 'FOUNDER_VOICE_UNAVAILABLE'
    try {
      const payload = await response.json() as { error?: unknown }
      if (payload.error) errorCode = String(payload.error)
    } catch {
      // Keep generic voice failure.
    }
    return { blob: null, errorCode }
  }
  const blob = await response.blob()
  return blob.size ? { blob, errorCode: null } : { blob: null, errorCode: 'EMPTY_FOUNDER_VOICE' }
}
