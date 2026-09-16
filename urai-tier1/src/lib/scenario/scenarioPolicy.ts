import { assertRealityIsolation } from '@/lib/truth/truthValidation'
import { MAX_SCENARIO_BRANCHES, type ScenarioAssumption, type ScenarioBranch } from './scenarioTypes'

export const SCENARIO_PURPOSE = 'scenario.explore' as const

export function scenarioEntityId(scenarioId: string, branchId: string, canonicalId: string) {
  const safe = canonicalId.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 72)
  return `scn_${scenarioId.replace(/^scn_/, '')}_${branchId.replace(/^br_/, '')}_${safe}`
}

export function materialAssumptionsAccepted(assumptions: readonly ScenarioAssumption[]) {
  return assumptions.every((assumption) => !assumption.material || assumption.source === 'user' || assumption.status === 'accepted')
}

export function validateBranchCount(branches: readonly ScenarioBranch[]) {
  if (branches.length < 1) return ['SCENARIO_REQUIRES_BRANCH'] as const
  if (branches.length > MAX_SCENARIO_BRANCHES) return ['SCENARIO_BRANCH_LIMIT_EXCEEDED'] as const
  return [] as const
}

export function assertScenarioCannotBecomeReality() {
  assertRealityIsolation('scenario', 'observation')
}

export function scenarioMayTriggerExternalAction() {
  return false as const
}
