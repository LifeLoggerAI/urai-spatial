export const TRUTH_KINDS = [
  'observation',
  'autobiographical-memory',
  'user-assertion',
  'interpretation',
  'hypothesis',
  'forecast',
  'scenario',
  'generated-context',
  'unknown',
  'disputed',
] as const

export type TruthKind = (typeof TRUTH_KINDS)[number]
export type EvidenceSupport = 'low' | 'medium' | 'high'

export type TruthSourceRef = {
  id: string
  provenance: 'recorded' | 'imported' | 'user-confirmed' | 'derived' | 'generated-context' | 'disputed'
  revision?: string | number
  checksum?: string
  permissionReceiptId?: string
  dataClass?: string
}

export type TruthRecord<T = unknown> = {
  id: string
  ownerId: string
  kind: TruthKind
  value?: T
  sourceRefs: readonly TruthSourceRef[]
  support: EvidenceSupport
  userCorrectionRevision: number
  disputedWithIds?: readonly string[]
  createdAt: string
  updatedAt: string
}

export const FACTUAL_TRUTH_KINDS: readonly TruthKind[] = [
  'observation',
  'autobiographical-memory',
  'user-assertion',
]

export function isFactualTruthKind(kind: TruthKind) {
  return FACTUAL_TRUTH_KINDS.includes(kind)
}

export function truthKindLabel(kind: TruthKind) {
  switch (kind) {
    case 'observation': return 'Observed'
    case 'autobiographical-memory': return 'Memory'
    case 'user-assertion': return 'You said'
    case 'interpretation': return 'Interpretation'
    case 'hypothesis': return 'Hypothesis'
    case 'forecast': return 'Forecast'
    case 'scenario': return 'Possible future'
    case 'generated-context': return 'Generated context'
    case 'unknown': return 'Unknown'
    case 'disputed': return 'Conflicting evidence'
  }
}
