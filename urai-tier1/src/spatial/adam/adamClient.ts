import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import type { AdamSurfaceId } from './adamSurfaceContext'
import { contentLanguage, type UraiContentLanguageTag } from '@/lib/i18n/contentLanguage'
import { readPresenceContentStream } from '@/lib/i18n/presenceContentStream'

export type AdamConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AdamProviderResult = {
  locale: UraiContentLanguageTag
  message: string
  caption: string
  suggestedActions: string[]
  requiresHumanFounder: boolean
  handoffReason: string
  provider: 'openai'
}

export type AdamProviderEvent =
  | { type: 'status'; status: string; surface?: AdamSurfaceId; locale: UraiContentLanguageTag }
  | { type: 'delta'; text: string; locale: UraiContentLanguageTag }
  | ({ type: 'done' } & AdamProviderResult)
  | { type: 'error'; code: string; message: string }

export class AdamProviderError extends Error {
  constructor(readonly code: string, message = 'Adam is unavailable.') {
    super(message)
    this.name = 'AdamProviderError'
  }
}

async function stableAdamRequestId(input: {
  message: string
  context: AdamConversationMessage[]
  surface: AdamSurfaceId
  locale: string
}) {
  if (!globalThis.crypto?.subtle) return null
  const intent = JSON.stringify({
    message: input.message,
    context: input.context.slice(-10),
    surface: input.surface,
    locale: input.locale,
  })
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(intent))
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
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
  const locale = typeof input.locale === 'string' ? contentLanguage(input.locale)?.speechTag : null
  if (!locale) throw new AdamProviderError('INVALID_LOCALE', 'Choose a supported content language.')
  const token = await bearerToken()
  const requestId = await stableAdamRequestId({ ...input, locale })
  if (!requestId || input.signal.aborted) throw new AdamProviderError('REQUEST_ID_UNAVAILABLE', 'Adam could not establish a stable request identity.')
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
        locale,
        aiProcessingConsent: input.aiProcessingConsent,
        requestId,
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

  return readPresenceContentStream<AdamProviderResult, AdamProviderEvent>(response, {
    locale, signal: input.signal, onEvent: input.onEvent, incompleteCode: 'ADAM_RESPONSE_INCOMPLETE',
    error: (code, message) => new AdamProviderError(code, message),
    validateDone: (event) => {
      if (event.provider !== 'openai' || typeof event.requiresHumanFounder !== 'boolean' || typeof event.handoffReason !== 'string' || event.handoffReason.length > 240
        || !Array.isArray(event.suggestedActions) || event.suggestedActions.length > 3
        || event.suggestedActions.some((action) => typeof action !== 'string' || !action.trim() || action.length > 80)) {
        throw new AdamProviderError('INVALID_PROVIDER_RESPONSE', 'Adam returned invalid response metadata.')
      }
    },
  })
}

export async function requestAdamFounderVoice(input: {
  text: string
  locale: UraiContentLanguageTag
  externalProcessingConsent: boolean
  signal: AbortSignal
}): Promise<{ blob: Blob | null; errorCode: string | null }> {
  const locale = typeof input.locale === 'string' ? contentLanguage(input.locale)?.speechTag : null
  if (!locale) return { blob: null, errorCode: 'INVALID_LOCALE' }
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
        locale,
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
