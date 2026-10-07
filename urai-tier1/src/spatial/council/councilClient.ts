import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import { buildOrbCompanionResponse } from '@/lib/orb-companion-contract'
import type { OrbConversationMessage, OrbProviderResult } from '@/spatial/orb/openaiClient'

export type ExternalCouncilProviderId = 'anthropic' | 'gemini' | 'xai' | 'mistral'

export type ExternalCouncilProviderResult = {
  message: string
  caption: string
  disclosure: string
  suggestedActions: string[]
  provider: ExternalCouncilProviderId
  model: string
}

const PRE_EXTERNAL_FAILURE_CODES = new Set([
  'UNAUTHORIZED',
  'EXPLICIT_CONSENT_REQUIRED',
  'CONSENT_POLICY_REQUIRED',
  'MODEL_PROCESSING_NOT_AUTHORIZED',
  'CONSENT_ENFORCEMENT_PENDING',
  'PROVIDER_PROCESSING_REVOKED',
  'RATE_LIMITED',
  'COUNCIL_PROVIDER_DISABLED',
  'COUNCIL_MODEL_NOT_CONFIGURED',
  'COUNCIL_PROVIDER_CREDENTIAL_MISSING',
  'INVALID_BODY',
  'REQUEST_TOO_LARGE',
  'INVALID_MESSAGE',
  'INVALID_CONTEXT',
  'INVALID_REQUEST_ID',
])

const DEFINITE_EXTERNAL_FAILURE_CODES = new Set([
  'ANTHROPIC_REQUEST_FAILED',
  'GEMINI_REQUEST_FAILED',
  'XAI_REQUEST_FAILED',
  'MISTRAL_REQUEST_FAILED',
  'INVALID_PROVIDER_RESPONSE',
])

export class CouncilExternalProviderAttemptError extends Error {
  constructor(readonly provider: ExternalCouncilProviderId, readonly code: string) {
    super(`${provider} Council provider was attempted but no external answer was used.`)
    this.name = 'CouncilExternalProviderAttemptError'
  }
}

export class CouncilExternalProviderAttemptUncertainError extends Error {
  constructor(readonly provider: ExternalCouncilProviderId) {
    super(`${provider} Council provider may have been attempted, but its processing state is uncertain.`)
    this.name = 'CouncilExternalProviderAttemptUncertainError'
  }
}

function providerLabel(provider: ExternalCouncilProviderId) {
  if (provider === 'xai') return 'xAI'
  if (provider === 'gemini') return 'Google Gemini'
  return provider[0].toUpperCase() + provider.slice(1)
}

function councilFallback(message: string, disclosure: string): OrbProviderResult {
  const fallback = buildOrbCompanionResponse({ message })
  return {
    message: fallback.reply,
    caption: fallback.reply,
    disclosure,
    suggestedActions: fallback.routeHint ? [`Open ${fallback.routeHint}`, 'Review privacy controls'] : ['Pause here', 'Review privacy controls'],
    provider: 'fallback',
    locale: 'en',
  }
}

export function attemptedCouncilProviderFallback(message: string, provider: ExternalCouncilProviderId) {
  return councilFallback(
    message,
    `A ${providerLabel(provider)} Council request was attempted with your consent, but no external answer was used. This response is a deterministic local fallback.`,
  )
}

export function uncertainCouncilProviderFallback(message: string, provider: ExternalCouncilProviderId) {
  return councilFallback(
    message,
    `A consented ${providerLabel(provider)} Council request may have been attempted, but its processing state could not be confirmed. No external answer was used; this response is a deterministic local fallback.`,
  )
}

const ENDPOINTS: Record<ExternalCouncilProviderId, string> = {
  anthropic: '/api/urai/council/anthropic',
  gemini: '/api/urai/council/gemini',
  xai: '/api/urai/council/xai',
  mistral: '/api/urai/council/mistral',
}

async function stableCouncilRequestId(provider: ExternalCouncilProviderId, message: string, context: OrbConversationMessage[]) {
  if (!globalThis.crypto?.subtle) return null
  const intent = JSON.stringify({ provider, message, context: context.slice(-8) })
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(intent))
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

export async function requestExternalCouncilProvider(input: {
  provider: ExternalCouncilProviderId
  message: string
  context: OrbConversationMessage[]
  aiProcessingConsent: boolean
  signal: AbortSignal
}): Promise<ExternalCouncilProviderResult | null> {
  if (!input.aiProcessingConsent || !firebasePublicEnvReady || input.signal.aborted) return null
  const user = getAuth(app).currentUser
  if (!user) return null
  const token = await user.getIdToken()
  const requestId = await stableCouncilRequestId(input.provider, input.message, input.context)
  if (!token || !requestId || input.signal.aborted) return null

  let response: Response
  try {
    response = await fetch(clientApiUrl(ENDPOINTS[input.provider]), {
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
      }),
    })
  } catch (error) {
    if (input.signal.aborted) throw error
    throw new CouncilExternalProviderAttemptUncertainError(input.provider)
  }

  if (!response.ok) {
    let code = 'COUNCIL_PROVIDER_BOUNDARY_FAILURE'
    try {
      const body = await response.json() as { error?: unknown }
      if (body.error) code = String(body.error)
    } catch {
      // Preserve generic provider boundary.
    }
    if (PRE_EXTERNAL_FAILURE_CODES.has(code)) return null
    if (DEFINITE_EXTERNAL_FAILURE_CODES.has(code)) {
      throw new CouncilExternalProviderAttemptError(input.provider, code)
    }
    throw new CouncilExternalProviderAttemptUncertainError(input.provider)
  }

  const result = await response.json() as Partial<ExternalCouncilProviderResult>
  if (result.provider !== input.provider || !result.message || !result.caption || !result.disclosure || !result.model) {
    throw new Error('INVALID_COUNCIL_PROVIDER_RESPONSE')
  }
  return {
    message: String(result.message),
    caption: String(result.message),
    disclosure: String(result.disclosure),
    suggestedActions: Array.isArray(result.suggestedActions) ? result.suggestedActions.map(String).slice(0, 3) : [],
    provider: input.provider,
    model: String(result.model),
  }
}
