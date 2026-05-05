import type { CanonTier } from './locs'

export const tier1: CanonTier = {
  id: 'Tier-1',
  officialLabel: 'Tier-1 Canon',
  purpose: 'LOCS Tier-1 governance for URAI Spatial.',
  scope: ['docs/canon', 'src/canon'],
  governanceLevel: 'Founder-only',
  lockLevel: 'Immutable',
  allowedMutationLevel: 'Founder override only',
  dependencies: [],
  forbiddenActions: ['Contradict higher tier canon', 'Bypass canon lock checks'],
  protectedPhrases: ['Tier-1', 'LOCS', 'URAI Spatial Canon'],
  protectedFiles: ['docs/canon/TIER_1_CANON_STANDARDS.md', 'src/canon/tier1.ts'],
  requiredReviewLevel: 'Founder approval',
  requiredChecks: ['pnpm canon:check', 'pnpm canon:lock'],
  migrationRequirements: ['Add .canon-migration/*.md marker for canon changes'],
  overrideRules: ['Founder override marker required when changing Tier-1 or Home Invariant'],
  examplesFromRepo: ['src/app/page.tsx', 'scripts/check-tier1-canon-lock.mjs'],
}
