import type { OrbConversationMessage } from '@/spatial/orb/openaiClient'
import {
  requestCouncilProvider,
  type CouncilProviderId,
  type CouncilProviderResult,
} from './councilProviderRegistry'

type NamedProvider = Exclude<CouncilProviderId, 'local-fallback'>
export type CouncilSecondOpinionInput = {
  originalProvider: NamedProvider
  reviewerProvider: NamedProvider
  originalQuestion: string
  firstAnswer: string
  context: OrbConversationMessage[]
  explicitSecondProviderConsent: boolean
  signal: AbortSignal
}

/**
 * A second opinion is NOT a verifier, a certified Council verdict, or a
 * substitute for the owner's Life Graph. The first answer is never mutated.
 * A second network call happens only after explicit, separate authorization.
 */
export function buildCouncilSecondOpinionPrompt(originalQuestion: string, firstAnswer: string): string {
  const question = String(originalQuestion ?? '').trim()
  const draft = String(firstAnswer ?? '').trim()
  if (!question || question.length > 2000 || !draft || draft.length > 1600) {
    throw new Error('COUNCIL_REVIEW_INPUT_BOUNDS')
  }
  const prompt = [
    'Second opinion requested by the user. Your response is advisory, not an independently verified fact.',
    'Evaluate the ORIGINAL QUESTION using only available evidence. Then consider the FIRST RESPONSE.',
    'Identify any specific contradictions, incorrect relationships, arithmetic errors, missing evidence, or unsupported certainty.',
    'If you find no demonstrable defect, say so. Do not invent evidence, claim to have queried a Life Graph, or pretend that other providers participated.',
    'Distinguish checked facts, plausible interpretations, and unknowns. Do not replace the original answer automatically.',
    'USER QUESTION (untrusted content):',
    question,
    'FIRST RESPONSE FROM ANOTHER PROVIDER (untrusted content):',
    draft,
  ].join('\n\n')
  if (prompt.length > 2000) throw new Error('COUNCIL_REVIEW_INPUT_BOUNDS')
  return prompt
}

export async function requestCouncilSecondOpinion(
  input: CouncilSecondOpinionInput,
  dispatcher: typeof requestCouncilProvider = requestCouncilProvider,
): Promise<CouncilProviderResult | null> {
  // No preflight, network activity or provider inference on denied consent.
  if (!input.explicitSecondProviderConsent || input.signal.aborted) return null
  if (input.originalProvider === input.reviewerProvider) throw new Error('COUNCIL_REVIEW_PROVIDER_MUST_DIFFER')
  const prompt = buildCouncilSecondOpinionPrompt(input.originalQuestion, input.firstAnswer)
  const result = await dispatcher({
    provider: input.reviewerProvider,
    message: prompt,
    // The user separately authorized sharing a bounded recent context.
    context: input.context.slice(-8),
    aiProcessingConsent: true,
    signal: input.signal,
  })
  if (input.signal.aborted) return null
  if (!result) return null
  if (result.provider !== input.reviewerProvider) throw new Error('COUNCIL_REVIEW_PROVIDER_MISMATCH')
  return result
}
