import {
  requestOpenAIOrb,
  type OrbConversationMessage,
  type OrbProviderEvent,
  type OrbProviderResult,
} from '@/spatial/orb/openaiClient'
import {
  requestExternalCouncilProvider,
  type ExternalCouncilProviderId,
  type ExternalCouncilProviderResult,
} from './councilClient'

export type CouncilProviderId = 'openai' | ExternalCouncilProviderId | 'local-fallback'
export type CouncilProviderRuntimeState = 'live' | 'source-ready' | 'not-connected' | 'local-fallback'
export type CouncilProviderResult =
  | OrbProviderResult
  | ExternalCouncilProviderResult

export type CouncilProviderDescriptor = {
  id: CouncilProviderId
  label: string
  externalProcessing: boolean
  runtimeState: CouncilProviderRuntimeState
  modelVersionRequiredForCertification: boolean
}

function sourceReadyState(environmentKey: string): CouncilProviderRuntimeState {
  return process.env[environmentKey] === 'true' ? 'live' : 'source-ready'
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
    runtimeState: sourceReadyState('NEXT_PUBLIC_URAI_COUNCIL_ANTHROPIC_ENABLED'),
    modelVersionRequiredForCertification: true,
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    externalProcessing: true,
    runtimeState: sourceReadyState('NEXT_PUBLIC_URAI_COUNCIL_GEMINI_ENABLED'),
    modelVersionRequiredForCertification: true,
  },
  xai: {
    id: 'xai',
    label: 'xAI',
    externalProcessing: true,
    runtimeState: sourceReadyState('NEXT_PUBLIC_URAI_COUNCIL_XAI_ENABLED'),
    modelVersionRequiredForCertification: true,
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    externalProcessing: true,
    runtimeState: sourceReadyState('NEXT_PUBLIC_URAI_COUNCIL_MISTRAL_ENABLED'),
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
    .filter((provider) => provider.runtimeState === 'source-ready' || provider.runtimeState === 'not-connected')
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
}): Promise<CouncilProviderResult | null> {
  const descriptor = COUNCIL_PROVIDER_REGISTRY[input.provider]
  if (descriptor.runtimeState !== 'live') throw new CouncilProviderNotConnectedError(input.provider)

  if (input.provider === 'openai') {
    return requestOpenAIOrb({
      message: input.message,
      context: input.context,
      aiProcessingConsent: input.aiProcessingConsent,
      signal: input.signal,
      onEvent: input.onEvent,
    })
  }

  return requestExternalCouncilProvider({
    provider: input.provider,
    message: input.message,
    context: input.context,
    aiProcessingConsent: input.aiProcessingConsent,
    signal: input.signal,
  })
}
