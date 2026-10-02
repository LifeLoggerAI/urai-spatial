import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { clientApiUrl } from '@/lib/clientApiUrl'
import type { OrbConversationMessage } from '@/spatial/orb/openaiClient'

export type ExternalCouncilProviderId = 'anthropic' | 'gemini' | 'xai' | 'mistral'

export type ExternalCouncilProviderResult = {
  message: string
  caption: string
  disclosure: string
  suggestedActions: string[]
  provider: ExternalCouncilProviderId
  model: string
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
    throw new Error('COUNCIL_PROVIDER_NETWORK_UNCERTAIN')
  }

  if (!response.ok) {
    let code = 'COUNCIL_PROVIDER_BOUNDARY_FAILURE'
    try {
      const body = await response.json() as { error?: unknown }
      if (body.error) code = String(body.error)
    } catch {
      // Preserve generic provider boundary.
    }
    throw new Error(code)
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
