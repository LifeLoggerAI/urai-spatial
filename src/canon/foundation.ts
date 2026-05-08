export type CanonTierId = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5'

export type Tier1CanonStatus = {
  tierId: 'tier1'
  label: 'Immutable URAI Foundation Canon'
  version: string
  protected: true
  governanceLevel: 'locked'
  mutationLevel: 'migration-only'
  requiredReview: 'founder-or-canon-council'
  requiredMigrationMarker: 'TIER_1_CANON_MIGRATION_APPROVED'
  requiredTests: readonly string[]
  mayBeImportedBy: readonly CanonTierId[]
  mayBeRedefinedBy: readonly []
  mayBeContradictedBy: readonly []
}

export const TIER_1_CANON_STATUS: Tier1CanonStatus = {
  tierId: 'tier1',
  label: 'Immutable URAI Foundation Canon',
  version: '1.1.0',
  protected: true,
  governanceLevel: 'locked',
  mutationLevel: 'migration-only',
  requiredReview: 'founder-or-canon-council',
  requiredMigrationMarker: 'TIER_1_CANON_MIGRATION_APPROVED',
  requiredTests: [
    'pnpm tier1:check',
    'pnpm tier1:drift',
    'pnpm canon:check',
    'pnpm home:invariant',
    'pnpm firebase:rules:check',
  ],
  mayBeImportedBy: ['tier1', 'tier2', 'tier3', 'tier4', 'tier5'],
  mayBeRedefinedBy: [],
  mayBeContradictedBy: [],
} as const

export const TIER_1_FOUNDATION_PRINCIPLES = [
  'Tier-1 defines URAI identity, ontology, privacy posture, consent posture, design language, and home/spatial invariants.',
  'Lower tiers may import, reference, extend, and operationalize Tier-1 but may not redefine or contradict it.',
  'Tier-1 changes require migration approval, review, changelog notes, security review, and tests.',
  'Tier-1 baseline must remain available without authentication or visible upgrade friction.',
] as const
