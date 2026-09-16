import type { EvidenceSupport, TruthKind } from '@/lib/truth/truthTypes'

export type AILedgerKind =
  | 'observation'
  | 'inference'
  | 'hypothesis'
  | 'forecast'
  | 'proposal'
  | 'action-receipt'
  | 'outcome-observation'
  | 'correction'
  | 'calibration'

export type AILedgerEntry = {
  schemaVersion: 1
  entryId: string
  ownerId: string
  operationId: string
  kind: AILedgerKind
  truthKind: TruthKind
  scenarioId?: string
  timestamp: string
  evidenceRefs: readonly string[]
  excludedRefs: readonly string[]
  exclusionReasons: readonly string[]
  permissionSnapshotRefs: readonly string[]
  provider?: string
  model?: string
  modelVersion?: string
  promptContractVersion?: string
  datasetIdentity?: string
  outputRecordRef?: string
  support: EvidenceSupport
  uncertainties: readonly string[]
  alternativeIds: readonly string[]
  proposedActionId?: string
  actionReceiptId?: string
  correctionId?: string
  outcomeObservationId?: string
  inputHash: string
  outputHash: string
}

export type AIObservation = AILedgerEntry & { kind: 'observation'; truthKind: 'observation' }
export type AIInference = AILedgerEntry & { kind: 'inference'; truthKind: 'interpretation' }
export type AIHypothesis = AILedgerEntry & { kind: 'hypothesis'; truthKind: 'hypothesis' }
export type AIForecast = AILedgerEntry & { kind: 'forecast'; truthKind: 'forecast' }
export type AIProposal = AILedgerEntry & { kind: 'proposal' }
export type AIActionReceipt = AILedgerEntry & { kind: 'action-receipt' }
export type AIOutcomeObservation = AILedgerEntry & { kind: 'outcome-observation'; truthKind: 'observation' }
export type AICorrection = AILedgerEntry & { kind: 'correction' }
export type AICalibrationRecord = AILedgerEntry & { kind: 'calibration' }
