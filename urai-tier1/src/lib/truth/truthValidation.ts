import { TRUTH_KINDS, isFactualTruthKind, type TruthKind, type TruthRecord } from './truthTypes'

export function validateTruthRecord(record: TruthRecord): readonly string[] {
  const errors: string[] = []
  if (!record.id) errors.push('TRUTH_ID_REQUIRED')
  if (!record.ownerId) errors.push('TRUTH_OWNER_REQUIRED')
  if (!TRUTH_KINDS.includes(record.kind)) errors.push('TRUTH_KIND_INVALID')
  if (!['low', 'medium', 'high'].includes(record.support)) errors.push('TRUTH_SUPPORT_INVALID')
  if (!Number.isInteger(record.userCorrectionRevision) || record.userCorrectionRevision < 0) errors.push('TRUTH_CORRECTION_REVISION_INVALID')
  if (record.support === 'high' && !record.sourceRefs.length) errors.push('HIGH_SUPPORT_REQUIRES_SOURCE')
  if (isFactualTruthKind(record.kind) && record.sourceRefs.some((source) => source.provenance === 'generated-context')) errors.push('FACTUAL_TRUTH_CANNOT_DEPEND_ON_GENERATED_CONTEXT')
  if (record.kind === 'disputed' && !(record.disputedWithIds?.length)) errors.push('DISPUTED_REQUIRES_CONFLICT_REFERENCE')
  return errors
}

export function canPromoteTruth(from: TruthKind, to: TruthKind) {
  if (from === 'scenario' || from === 'generated-context' || from === 'forecast' || from === 'hypothesis' || from === 'interpretation') return !isFactualTruthKind(to)
  return true
}

export function assertRealityIsolation(from: TruthKind, to: TruthKind) {
  if (!canPromoteTruth(from, to)) throw new Error(`TRUTH_PROMOTION_FORBIDDEN:${from}->${to}`)
}
