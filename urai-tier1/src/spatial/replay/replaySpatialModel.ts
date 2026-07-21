import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'

export type ReplayEvidenceLevel =
  | 'confirmed'
  | 'high-confidence'
  | 'inferred'
  | 'unknown'
  | 'user-corrected'
  | 'disputed'

export type ReplayConsentState = 'allowed' | 'abstract-only' | 'blocked'
export type ReplayAnchorKind = 'person' | 'place' | 'object' |