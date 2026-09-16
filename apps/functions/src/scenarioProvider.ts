export type RedactedScenarioInput = {
  scenarioId: string
  question: string
  basisRevision: number
  evidence: readonly { id: string; truthKind: string; summary: string }[]
  assumptions: readonly { id: string; statement: string; material: boolean }[]
  branchLimit: 1 | 2 | 3
}

export type ScenarioProviderBranch = {
  id: string
  label: string
  summary: string
  evidenceRefIds: readonly string[]
  uncertainty: readonly string[]
}

export type ScenarioProviderResult = {
  provider: string
  model: string
  modelVersion: string
  branches: readonly ScenarioProviderBranch[]
}

export interface ScenarioProviderAdapter {
  readonly provider: string
  readonly model: string
  readonly modelVersion: string
  generateBranches(input: RedactedScenarioInput): Promise<ScenarioProviderResult>
}

/**
 * Launch-safe provider boundary. A production provider is deliberately not
 * activated until credentials, exact model/version receipts and release evals
 * are available on the same exact head.
 */
export const scenarioProviderState = {
  activated: false,
  reason: 'PROVIDER_NOT_ACTIVATED',
} as const
