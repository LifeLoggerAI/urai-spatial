import type { EvidenceSupport, TruthRecord } from './truthTypes'

const FACTUAL_PRIORITY: Record<TruthRecord['kind'], number> = {
  observation: 80,
  'autobiographical-memory': 70,
  'user-assertion': 75,
  interpretation: 40,
  hypothesis: 30,
  forecast: 20,
  scenario: 10,
  'generated-context': 5,
  unknown: 0,
  disputed: 0,
}

export function authorityScore(record: TruthRecord) {
  const correction = Math.max(0, record.userCorrectionRevision || 0) * 1000
  return correction + FACTUAL_PRIORITY[record.kind]
}

export function chooseAuthoritativeRecord(records: readonly TruthRecord[]): TruthRecord | null {
  if (!records.length) return null
  const disputed = records.filter((record) => record.kind === 'disputed')
  if (disputed.length) return disputed.sort((a, b) => authorityScore(b) - authorityScore(a))[0]
  return [...records].sort((a, b) => authorityScore(b) - authorityScore(a))[0]
}

export function deriveEvidenceSupport(args: {
  sourceCount: number
  sourceCoverage: number
  unresolvedMaterialConflict: boolean
  generatedContextDependent: boolean
  permissionValid: boolean
}): EvidenceSupport {
  if (!args.permissionValid || args.generatedContextDependent || args.unresolvedMaterialConflict) return 'low'
  if (args.sourceCount >= 2 && args.sourceCoverage >= 0.75) return 'high'
  if (args.sourceCount >= 1 && args.sourceCoverage >= 0.35) return 'medium'
  return 'low'
}

export function canInfluenceScenario(record: TruthRecord) {
  return record.kind !== 'unknown' && record.kind !== 'generated-context'
}

export function correctionSupersedes(older: TruthRecord, newer: TruthRecord) {
  if (older.ownerId !== newer.ownerId) return false
  return newer.userCorrectionRevision > older.userCorrectionRevision
}
