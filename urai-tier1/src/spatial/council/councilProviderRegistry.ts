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
export type CouncilProviderRuntimeState = 'unverified' | 'source-ready' | 'not-connected' | 'local-fallback'
export type CouncilProviderResult =
  | OrbProviderResult
  | ExternalCouncilProviderResult

export type CouncilProviderDescriptor = {
  id: CouncilProviderId
  label: string
  externalProcessing: boolean
  requestEnabled: boolean
  runtimeState: CouncilProviderRuntimeState
  modelVersionRequiredForCertification: boolean
}

// Public flags permit a request attempt. They cannot attest to protected
// credentials, the selected model, deployment parity or a live canary.
const PUBLIC_PROVIDER_REQUESTS = {
  anthropic: process.env.NEXT_PUBLIC_URAI_COUNCIL_ANTHROPIC_ENABLED === 'true',
  gemini: process.env.NEXT_PUBLIC_URAI_COUNCIL_GEMINI_ENABLED === 'true',
  xai: process.env.NEXT_PUBLIC_URAI_COUNCIL_XAI_ENABLED === 'true',
  mistral: process.env.NEXT_PUBLIC_URAI_COUNCIL_MISTRAL_ENABLED === 'true',
} as const

function providerRequestState(provider: ExternalCouncilProviderId): CouncilProviderRuntimeState {
  return PUBLIC_PROVIDER_REQUESTS[provider] ? 'unverified' : 'source-ready'
}

export const COUNCIL_PROVIDER_REGISTRY: Readonly<Record<CouncilProviderId, CouncilProviderDescriptor>> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    externalProcessing: true,
    requestEnabled: true,
    runtimeState: 'unverified',
    modelVersionRequiredForCertification: true,
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    externalProcessing: true,
    requestEnabled: PUBLIC_PROVIDER_REQUESTS.anthropic,
    runtimeState: providerRequestState('anthropic'),
    modelVersionRequiredForCertification: true,
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    externalProcessing: true,
    requestEnabled: PUBLIC_PROVIDER_REQUESTS.gemini,
    runtimeState: providerRequestState('gemini'),
    modelVersionRequiredForCertification: true,
  },
  xai: {
    id: 'xai',
    label: 'xAI',
    externalProcessing: true,
    requestEnabled: PUBLIC_PROVIDER_REQUESTS.xai,
    runtimeState: providerRequestState('xai'),
    modelVersionRequiredForCertification: true,
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    externalProcessing: true,
    requestEnabled: PUBLIC_PROVIDER_REQUESTS.mistral,
    runtimeState: providerRequestState('mistral'),
    modelVersionRequiredForCertification: true,
  },
  'local-fallback': {
    id: 'local-fallback',
    label: 'Local fallback',
    externalProcessing: false,
    requestEnabled: false,
    runtimeState: 'local-fallback',
    modelVersionRequiredForCertification: false,
  },
}

export const REQUESTABLE_COUNCIL_PROVIDER_IDS = Object.freeze(
  Object.values(COUNCIL_PROVIDER_REGISTRY)
    .filter((provider) => provider.requestEnabled)
    .map((provider) => provider.id),
)

// This client registry has no protected runtime acceptance evidence. Preserve
// the legacy attribution surface as empty rather than promoting configuration.
export const LIVE_COUNCIL_PROVIDER_IDS: readonly CouncilProviderId[] = Object.freeze([])

export const PENDING_COUNCIL_PROVIDER_IDS = Object.freeze(
  Object.values(COUNCIL_PROVIDER_REGISTRY)
    .filter((provider) => provider.externalProcessing && !provider.requestEnabled)
    .map((provider) => provider.id),
)

export class CouncilProviderNotConnectedError extends Error {
  constructor(readonly provider: CouncilProviderId) {
    super(`${COUNCIL_PROVIDER_REGISTRY[provider].label} is not enabled for Council requests.`)
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
  if (!descriptor.requestEnabled) throw new CouncilProviderNotConnectedError(input.provider)

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
