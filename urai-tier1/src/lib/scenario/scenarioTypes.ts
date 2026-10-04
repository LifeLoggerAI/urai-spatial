import type { EvidenceSupport, TruthKind } from '@/lib/truth/truthTypes'
import type { UraiOriginRealm } from '@/spatial/world/worldTypes'

export const SCENARIO_SCHEMA_VERSION = 1 as const
export const MAX_SCENARIO_BRANCHES = 3 as const

export type ScenarioStatus =
  | 'draft'
  | 'validating'
  | 'awaiting-assumptions'
  | 'generating'
  | 'ready'
  | 'saved'
  | 'discarded'
  | 'revoked'
  | 'archived'

export type ScenarioEvidenceRef = {
  id: string
  truthRecordId: string
  sourceId: string
  truthKind: TruthKind
  purpose: 'scenario.explore'
  permissionReceiptId?: string
  dataClass?: string
  sourceRevision?: string | number
  checksum?: string
  transformations: readonly string[]
}

export type ScenarioBasis = {
  schemaVersion: typeof SCENARIO_SCHEMA_VERSION
  id: string
  ownerId: string
  revision: number
  worldRevision: string
  capturedAt: string
  evidenceRefs: readonly ScenarioEvidenceRef[]
  excludedEvidence: readonly { id: string; reason: string }[]
  permissionReceiptIds: readonly string[]
  immutable: true
}

export type ScenarioAssumption = {
  id: string
  source: 'user' | 'derived' | 'system'
  kind: 'continuation' | 'change' | 'constraint' | 'goal'
  statement: string
  status: 'proposed' | 'accepted' | 'rejected' | 'unknown'
  material: boolean
}

export type ScenarioUncertainty = {
  id: string
  variable: string
  reason: string
  effect: string
  impact: 'low' | 'medium' | 'high'
  evidenceNeeded?: string
}

export type ScenarioEntityState = {
  id: string
  canonicalEntityRef?: string
  canonicalRevision?: string | number
  scenarioBranchId: string
  truthKind: 'scenario'
  state: Record<string, unknown>
}

export type ScenarioEvent = {
  id: string
  truthKind: 'scenario'
  relativeTime: string
  changedEntityIds: readonly string[]
  assumptionIds: readonly string[]
  evidenceRefIds: readonly string[]
  mechanism: 'assumption' | 'observed-pattern' | 'generated-context'
  summary: string
  uncertaintyIds: readonly string[]
}

export type ScenarioConfidence = {
  evidenceCoverage: EvidenceSupport
  assumptionRisk: EvidenceSupport
  uncertainty: EvidenceSupport
}

export type ScenarioOutcome = {
  id: string
  branchId: string
  truthKind: 'scenario'
  summary: string
  eventIds: readonly string[]
}

export type ScenarioBranch = {
  id: string
  label: string
  assumptionIds: readonly string[]
  eventIds: readonly string[]
  entityStateIds: readonly string[]
  uncertaintyIds: readonly string[]
  outcomeIds: readonly string[]
  confidence: ScenarioConfidence
}

export type ScenarioPerspective = {
  id: string
  branchId: string
  role: 'guardian' | 'builder' | 'cartographer' | 'archivist' | 'mirror' | 'trickster'
  viewpoint: string
  evidenceRefIds: readonly string[]
  support: EvidenceSupport
  uncertaintyIds: readonly string[]
  assumptionsQuestioned: readonly string[]
  alternativeExplanations: readonly string[]
}

export type ScenarioAlternative = {
  id: string
  branchId: string
  description: string
  assumptionIds: readonly string[]
}

export type ScenarioComparison = {
  id: string
  scenarioId: string
  branchIds: readonly string[]
  assumptionDifferences: readonly string[]
  entityDifferences: readonly string[]
  outcomeDifferences: readonly string[]
  unresolvedUncertaintyIds: readonly string[]
}

export type ScenarioReceipt = {
  id: string
  scenarioId: string
  ownerId: string
  operationId: string
  provider?: string
  model?: string
  modelVersion?: string
  promptContractVersion?: string
  policyVersion: string
  datasetIdentity?: string
  inputHash: string
  outputHash: string
  permissionReceiptIds: readonly string[]
  validationResult: 'passed' | 'rejected' | 'provider-unavailable'
  startedAt: string
  completedAt: string
}

export type ScenarioOutcomeObservation = {
  id: string
  scenarioId: string
  branchId?: string
  observedTruthRecordIds: readonly string[]
  observedAt: string
  source: 'observation' | 'user-assertion'
}

export type ScenarioCalibrationRecord = {
  id: string
  scenarioId: string
  observationId: string
  assumptionSurvivedIds: readonly string[]
  assumptionInvalidatedIds: readonly string[]
  uncertaintyResolvedIds: readonly string[]
  uncertaintyUnresolvedIds: readonly string[]
  majorFactorOmissions: readonly string[]
  userCorrectionCount: number
  createdAt: string
}

export type Scenario = {
  schemaVersion: typeof SCENARIO_SCHEMA_VERSION
  id: string
  ownerId: string
  question: string
  status: ScenarioStatus
  originRealm: UraiOriginRealm
  returnToken: string
  cameraCheckpoint?: string
  basisId: string
  basisRevision: number
  timeHorizon: { amount: number; unit: 'day' | 'week' | 'month' | 'year' }
  branchIds: readonly string[]
  activeBranchId?: string
  consentSnapshotIds: readonly string[]
  receiptIds: readonly string[]
  createdAt: string
  updatedAt: string
  expiresAt?: string
}

export type ScenarioProviderResult = {
  branches: readonly ScenarioBranch[]
  events: readonly ScenarioEvent[]
  entityStates: readonly ScenarioEntityState[]
  outcomes: readonly ScenarioOutcome[]
  uncertainties: readonly ScenarioUncertainty[]
  evidenceRefIds: readonly string[]
}
