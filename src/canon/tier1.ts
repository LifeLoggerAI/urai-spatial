import type { CanonTier } from './locs'
import { TIER_1_CANON_STATUS } from './foundation'
import { URAI_IDENTITY_CANON } from './identity'
import { URAI_ONTOLOGY_CANON } from './ontology'
import { URAI_PRIVACY_CANON } from './privacy'
import { URAI_DESIGN_CANON } from './design'
import { PROTECTED_SPATIAL_INVARIANTS, URAI_TIER_1_HOME_INVARIANT } from './invariants'

export type { CanonTierId, Tier1CanonStatus } from './foundation'

export const URAI_TIER_1_CANON = {
  status: TIER_1_CANON_STATUS,
  officialProductName: URAI_IDENTITY_CANON.officialProductName,
  officialEcosystemName: URAI_IDENTITY_CANON.officialEcosystemName,
  forbiddenNames: URAI_IDENTITY_CANON.deprecatedAliases,
  protectedDomains: URAI_ONTOLOGY_CANON.canonDomains,
  protectedSchemas: URAI_ONTOLOGY_CANON.protectedSchemas,
  protectedDesignPrinciples: URAI_DESIGN_CANON.protectedDesignPrinciples,
  protectedSymbolicLanguage: URAI_DESIGN_CANON.protectedSymbolicLanguage,
  protectedSpatialInvariants: PROTECTED_SPATIAL_INVARIANTS,
  protectedHomeInvariant: URAI_TIER_1_HOME_INVARIANT,
  protectedPrivacyPrinciples: URAI_PRIVACY_CANON.protectedPrivacyPrinciples,
  protectedConsentPrinciples: URAI_PRIVACY_CANON.protectedConsentPrinciples,
  protectedDataOwnershipPrinciples: URAI_PRIVACY_CANON.protectedDataOwnershipPrinciples,
  protectedFirestoreBoundaries: [
    'Users cannot write their own entitlement tier.',
    'Users cannot write admin, founder, or canon override flags.',
    'Clients cannot mutate Tier-1 canon records.',
    'Feature flags are admin/server-write only.',
    'Audit logs are server/admin controlled.',
    'Owner-scoped personal spatial data requires authenticated owner or admin/server access.',
    'Public Tier-1 baseline content may be read safely when explicitly intended.',
  ] as const,
  protectedFeatureFlagRules: [
    'Tier-1 baseline is safe by default.',
    'Tier-2 and higher features require server-side validation.',
    'Client flags are visual convenience only and never grant authority.',
    'Experimental and high-risk features default off.',
    'Denied protected features must fall back to Tier-1 baseline where possible.',
  ] as const,
  protectedReleaseRules: [
    'Tier-1 changes require TIER_1_CANON_MIGRATION_APPROVED.',
    'Tier-1 changes require founder or canon council review.',
    'Tier-1 changes require tests, changelog notes, security review, and privacy/consent impact review.',
    'CI must fail on Tier-1 drift, home invariant violations, unsafe Firestore rules, or missing migration markers.',
  ] as const,
  namingRules: URAI_IDENTITY_CANON.namingRules,
  productIdentityRules: URAI_IDENTITY_CANON.productIdentityRules,
  schemaOwnershipRules: URAI_ONTOLOGY_CANON.schemaOwnershipRules,
  allowedLowerTierReferences: URAI_ONTOLOGY_CANON.allowedLowerTierReferences,
} as const

export const tier1: CanonTier = {
  id: 'Tier-1',
  officialLabel: URAI_TIER_1_CANON.status.label,
  purpose: 'LOCS Tier-1 governance for URAI Spatial immutable foundation canon.',
  scope: ['docs/canon', 'src/canon', 'firebase/firestore.rules', 'src/app/page.tsx', 'urai-tier1/src/app/page.tsx'],
  governanceLevel: URAI_TIER_1_CANON.status.governanceLevel,
  lockLevel: 'Immutable',
  allowedMutationLevel: URAI_TIER_1_CANON.status.mutationLevel,
  dependencies: [],
  forbiddenActions: [
    'Redefine Tier-1 from a lower tier',
    'Contradict Tier-1 canon',
    'Bypass canon lock checks',
    'Weaken privacy, consent, entitlement, or home invariant boundaries',
  ],
  protectedPhrases: ['Tier-1', 'LOCS', 'URAI Spatial Canon', URAI_TIER_1_CANON.status.label],
  protectedFiles: [
    'docs/canon/TIER_1_CANON_STANDARDS.md',
    'src/canon/tier1.ts',
    'src/canon/foundation.ts',
    'src/canon/identity.ts',
    'src/canon/privacy.ts',
    'src/canon/invariants.ts',
    'firebase/firestore.rules',
    'src/app/page.tsx',
    'urai-tier1/src/app/page.tsx',
    'packages/tier-locks/src/index.ts',
    'apps/functions/src/tierLocks.ts',
  ],
  requiredReviewLevel: URAI_TIER_1_CANON.status.requiredReview,
  requiredChecks: [...URAI_TIER_1_CANON.status.requiredTests],
  migrationRequirements: [
    `Add .canon-migration/*.md marker containing ${URAI_TIER_1_CANON.status.requiredMigrationMarker}`,
    'Update docs/canon/TIER_1_CHANGELOG.md when Tier-1 behavior changes',
  ],
  overrideRules: ['Founder or canon council approval required when changing Tier-1 or Home Invariant'],
  examplesFromRepo: ['src/app/page.tsx', 'urai-tier1/src/app/page.tsx', 'scripts/check-tier1-canon-lock.mjs'],
}
