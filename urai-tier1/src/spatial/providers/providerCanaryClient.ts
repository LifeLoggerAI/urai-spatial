import { getAuth } from 'firebase/auth'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'

export type ProviderCanaryResult = {
  ok: true
  provider: 'digitalocean'
  model: string
  synthetic: true
  latencyMs: number
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

export class ProviderCanaryError extends Error {
  constructor(readonly code: string) {
    super('The external provider canary did not complete.')
    this.name = 'ProviderCanaryError'
  }
}

export async function requestProviderCanary(input: {
  provider: 'digitalocean'
  externalProcessingConsent: boolean
  signal: AbortSignal
}): Promise<ProviderCanaryResult | null> {
  if (!input.externalProcessingConsent || !firebasePublicEnvReady || input.signal.aborted) return null
  const user = getAuth(app).currentUser
  if (!user) return null
  const token = await user.getIdToken()
  if (!token || input.signal.aborted) return null

  const response = await fetch('/api/urai/providers/canary', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal: input.signal,
    body: JSON.stringify({
      provider: input.provider,
      externalProcessingConsent: true,
      syntheticTest: true,
      dataClass: 'synthetic',
    }),
  })

  if (!response.ok) {
    let code = 'PROVIDER_CANARY_FAILED'
    try {
      const payload = await response.json() as { error?: unknown }
      if (payload.error) code = String(payload.error)
    } catch {
      // Preserve a generic, non-sensitive failure code.
    }
    throw new ProviderCanaryError(code)
  }

  const payload = await response.json() as ProviderCanaryResult
  if (
    payload.ok !== true
    || payload.provider !== 'digitalocean'
    || payload.synthetic !== true
    || !payload.model
    || !Number.isFinite(payload.latencyMs)
  ) {
    throw new ProviderCanaryError('INVALID_PROVIDER_CANARY_RESPONSE')
  }
  return payload
}
