import { MAX_SCENARIO_BRANCHES, SCENARIO_SCHEMA_VERSION, type Scenario, type ScenarioBasis, type ScenarioProviderResult } from './scenarioTypes'

export function validateScenarioBasis(basis: ScenarioBasis): readonly string[] {
  const errors: string[] = []
  if (basis.schemaVersion !== SCENARIO_SCHEMA_VERSION) errors.push('SCENARIO_BASIS_SCHEMA_INVALID')
  if (!basis.id || !basis.ownerId) errors.push('SCENARIO_BASIS_IDENTITY_REQUIRED')
  if (!basis.immutable) errors.push('SCENARIO_BASIS_MUST_BE_IMMUTABLE')
  if (!Number.isInteger(basis.revision) || basis.revision < 0) errors.push('SCENARIO_BASIS_REVISION_INVALID')
  for (const ref of basis.evidenceRefs) {
    if (ref.purpose !== 'scenario.explore') errors.push(`SCENARIO_EVIDENCE_PURPOSE_INVALID:${ref.id}`)
    if (ref.truthKind === 'scenario' || ref.truthKind === 'generated-context') errors.push(`SCENARIO_BASIS_CANNOT_USE_SYNTHETIC_REALITY:${ref.id}`)
  }
  return errors
}

export function validateScenario(scenario: Scenario): readonly string[] {
  const errors: string[] = []
  if (scenario.schemaVersion !== SCENARIO_SCHEMA_VERSION) errors.push('SCENARIO_SCHEMA_INVALID')
  if (!scenario.id.startsWith('scn_')) errors.push('SCENARIO_ID_INVALID')
  if (!scenario.ownerId) errors.push('SCENARIO_OWNER_REQUIRED')
  if (!scenario.question.trim()) errors.push('SCENARIO_QUESTION_REQUIRED')
  if (!scenario.returnToken) errors.push('SCENARIO_RETURN_TOKEN_REQUIRED')
  if (scenario.branchIds.length > MAX_SCENARIO_BRANCHES) errors.push('SCENARIO_BRANCH_LIMIT_EXCEEDED')
  if (scenario.timeHorizon.amount <= 0 || !Number.isFinite(scenario.timeHorizon.amount)) errors.push('SCENARIO_HORIZON_INVALID')
  return errors
}

export function validateScenarioProviderResult(result: ScenarioProviderResult, allowedEvidenceRefIds: readonly string[]): readonly string[] {
  const errors: string[] = []
  const allowed = new Set(allowedEvidenceRefIds)
  if (result.branches.length < 1 || result.branches.length > MAX_SCENARIO_BRANCHES) errors.push('SCENARIO_PROVIDER_BRANCH_COUNT_INVALID')
  for (const refId of result.evidenceRefIds) if (!allowed.has(refId)) errors.push(`SCENARIO_PROVIDER_INVENTED_EVIDENCE:${refId}`)
  for (const event of result.events) {
    if (event.truthKind !== 'scenario') errors.push(`SCENARIO_EVENT_TRUTH_KIND_INVALID:${event.id}`)
    for (const refId of event.evidenceRefIds) if (!allowed.has(refId)) errors.push(`SCENARIO_EVENT_INVENTED_EVIDENCE:${event.id}:${refId}`)
  }
  for (const state of result.entityStates) {
    if (state.truthKind !== 'scenario') errors.push(`SCENARIO_ENTITY_TRUTH_KIND_INVALID:${state.id}`)
    if (!state.id.startsWith('scn_')) errors.push(`SCENARIO_ENTITY_NAMESPACE_INVALID:${state.id}`)
  }
  for (const outcome of result.outcomes) if (outcome.truthKind !== 'scenario') errors.push(`SCENARIO_OUTCOME_TRUTH_KIND_INVALID:${outcome.id}`)
  return errors
}
