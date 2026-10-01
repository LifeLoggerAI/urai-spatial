import {
  requestOpenAIOrb,
  type OrbConversationMessage,
  type OrbProviderEvent,
  type OrbProviderResult,
} from '@/spatial/orb/openaiClient'

export type CouncilProviderId = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'mistral' | 'local-fallback'
export type CouncilProviderRuntimeState = 'live' | 'not-connected' | 'local-fallback'

export type CouncilProviderDescriptor = {
  id: CouncilProviderId
  label: string
  externalProcessing: boolean
  runtimeState: CouncilProviderRuntimeState
  modelVersionRequiredForCertification: boolean
}

export const COUNCIL_PROVIDER_REGISTRY: Readonly<Record<CouncilProviderId, CouncilProviderDescriptor>> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    externalProcessing: true,
    runtimeState: 'live',
    modelVersionRequiredForCertification: true,
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    externalProcessing: true,
    runtimeState: 'not-connected',
    modelVersionRequiredForCertification: true,
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    externalProcessing: true,
    runtimeState: 'not-connected',
    modelVersionRequiredForCertification: true,
  },
  xai: {
    id: 'xai',
    label: 'xAI',
    externalProcessing: true,
    runtimeState: 'not-connected',
    modelVersionRequiredForCertification: true,
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    externalProcessing: true,
    runtimeState: 'not-connected',
    modelVersionRequiredForCertification: true,
  },
  'local-fallback': {
    id: 'local-fallback',
    label: 'Local fallback',
    externalProcessing: false,
    runtimeState: 'local-fallback',
    modelVersionRequiredForCertification: false,
  },
}

export const LIVE_COUNCIL_PROVIDER_IDS = Object.freeze(
  Object.values(COUNCIL_PROVIDER_REGISTRY)
    .filter((provider) => provider.runtimeState === 'live')
    .map((provider) => provider.id),
)

export const PENDING_COUNCIL_PROVIDER_IDS = Object.freeze(
  Object.values(COUNCIL_PROVIDER_REGISTRY)
    .filter((provider) => provider.runtimeState === 'not-connected')
    .map((provider) => provider.id),
)

export class CouncilProviderNotConnectedError extends Error {
  constructor(readonly provider: CouncilProviderId) {
    super(`${COUNCIL_PROVIDER_REGISTRY[provider].label} is not connected to the Council runtime.`)
    this.name = 'CouncilProviderNotConnectedError'
  }
}

export async function requestCouncilProvider(input: {
  provider: Exclude<CouncilProviderId, 'local-fallback'>
  message: string
  context: OrbConversationMessage[]
  aiProcessingConsent: boolean
  signal: AbortSignal
  onEvent?: (event: OrbProviderEvent) => void
}): Promise<OrbProviderResult | null> {
  const descriptor = COUNCIL_PROVIDER_REGISTRY[input.provider]
  if (descriptor.runtimeState !== 'live') throw new CouncilProviderNotConnectedError(input.provider)

  switch (input.provider) {
    case 'openai':
      return requestOpenAIOrb({
        message: input.message,
        context: input.context,
        aiProcessingConsent: input.aiProcessingConsent,
        signal: input.signal,
        onEvent: input.onEvent,
      })
    default:
      throw new CouncilProviderNotConnectedError(input.provider)
  }
}
