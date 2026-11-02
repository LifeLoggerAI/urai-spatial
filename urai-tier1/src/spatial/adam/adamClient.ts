import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import type { AdamSurfaceId } from './adamSurfaceContext'
import { contentLanguage, type UraiContentLanguageTag } from '@/lib/i18n/contentLanguage'
import { readPresenceContentStream } from '@/lib/i18n/presenceContentStream'
import { AdamVoiceResponseError, readAuthorizedAdamVoice, readBoundedAdamErrorCode } from './adamVoiceResponseBoundary.mjs'

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
  const auth = getAuth(app)
  // Wait for persisted Firebase identity to restore before reading a bearer token.
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) throw new AdamProviderError('AUTH_REQUIRED', 'Sign in to talk with Adam.')
  const token = await user.getIdToken()
  // Prevent an old owner's token from reaching the provider after sign-out/switch.
  if (!token || auth.currentUser !== user) throw new AdamProviderError('AUTH_REQUIRED', 'Sign in to talk with Adam.')
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
  // Capture the exact restored Firebase User before issuing any old owner's
  // bearer token. Even a different User object with the same UID is a new
  // lifecycle and cannot authorize a request from this conversation turn.
  if (!firebasePublicEnvReady) throw new AdamProviderError('FIREBASE_NOT_READY', 'UrAi authentication is not ready.')
  const auth = getAuth(app)
  await auth.authStateReady()
  const actor = auth.currentUser
  const token = await bearerToken()
  if (!actor || auth.currentUser !== actor || input.signal.aborted)
    throw new AdamProviderError('AUTH_SESSION_CHANGED', 'Sign in again to talk with Adam.')
  const requestId = await stableAdamRequestId({ ...input, locale })
  if (!requestId || input.signal.aborted) throw new AdamProviderError('REQUEST_ID_UNAVAILABLE', 'Adam could not establish a stable request identity.')
  // Request-id hashing is asynchronous: refuse to dispatch stale owner context
  // even if Firebase switched accounts or reauthenticated during that digest.
  if (auth.currentUser !== actor)
    throw new AdamProviderError('AUTH_SESSION_CHANGED', 'Sign in again to talk with Adam.')
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
    const code = await readBoundedAdamErrorCode(response, {
      signal: input.signal, isAuthorized: () => auth.currentUser === actor,
      fallbackCode: 'ADAM_PROVIDER_BOUNDARY_FAILURE',
    })
    throw new AdamProviderError(code)
  }

  if (auth.currentUser !== actor || input.signal.aborted)
    throw new AdamProviderError('AUTH_SESSION_CHANGED', 'Sign in again to talk with Adam.')
  return readPresenceContentStream<AdamProviderResult, AdamProviderEvent>(response, {
    locale, signal: input.signal,
    isCurrent: () => auth.currentUser === actor && !input.signal.aborted,
    onEvent: (event) => {
      if (auth.currentUser !== actor || input.signal.aborted)
        throw new AdamProviderError('AUTH_SESSION_CHANGED', 'Sign in again to talk with Adam.')
      input.onEvent?.(event)
    }, incompleteCode: 'ADAM_RESPONSE_INCOMPLETE',
    error: (code, message) => new AdamProviderError(code, message),
    validateDone: (event) => {
      if (auth.currentUser !== actor || input.signal.aborted)
        throw new AdamProviderError('AUTH_SESSION_CHANGED', 'Sign in again to talk with Adam.')
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
}): Promise<{ blob: Blob | null; errorCode: string | null; playbackEvidence?: null }> {
  // Existing streamed bytes have no approved per-turn authority receipt.
  const locale = typeof input.locale === 'string' ? contentLanguage(input.locale)?.speechTag : null
  if (!locale) return { blob: null, errorCode: 'INVALID_LOCALE' }
  if (!firebasePublicEnvReady) throw new AdamProviderError('FIREBASE_NOT_READY', 'UrAi authentication is not ready.')
  const auth = getAuth(app)
  await auth.authStateReady()
  const actor = auth.currentUser
  const token = await bearerToken()
  if (!actor || auth.currentUser !== actor || input.signal.aborted)
    return { blob: null, errorCode: 'AUTH_SESSION_CHANGED' }
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
    const errorCode = await readBoundedAdamErrorCode(response, {
      signal: input.signal, isAuthorized: () => auth.currentUser === actor,
      fallbackCode: 'FOUNDER_VOICE_UNAVAILABLE',
    })
    return { blob: null, errorCode }
  }
  try {
    const blob = await readAuthorizedAdamVoice(response, {
      signal: input.signal,
      isAuthorized: () => auth.currentUser === actor,
    })
    // This response is still not a trusted Founder voice playback receipt.
    // The existing independent voice gate remains in charge of playback.
    return { blob, errorCode: null }
  } catch (error) {
    if (input.signal.aborted) throw error
    return { blob: null, errorCode: error instanceof AdamVoiceResponseError
      ? error.code : 'FOUNDER_VOICE_MEDIA_INVALID' }
  }
}
