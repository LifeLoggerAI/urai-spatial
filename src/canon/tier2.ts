import type { CanonTier } from './locs'

export const tier2: CanonTier = {
  id: 'Tier-2',
  officialLabel: 'Tier-2 Canon',
  purpose: 'LOCS Tier-2 governance for URAI Spatial.',
  scope: ['docs/canon', 'src/canon'],
  governanceLevel: 'Maintainer + Canon gate',
  lockLevel: 'Strict',
  allowedMutationLevel: 'Only with migration marker and passing checks',
  dependencies: ['Tier-1'],
  forbiddenActions: ['Contradict higher tier canon', 'Bypass canon lock checks'],
  protectedPhrases: ['Tier-2', 'LOCS', 'URAI Spatial Canon'],
  protectedFiles: ['docs/canon/TIER_2_CANON_STANDARDS.md', 'src/canon/tier2.ts'],
  requiredReviewLevel: 'Canonical reviewer approval',
  requiredChecks: ['pnpm canon:check', 'pnpm canon:lock'],
  migrationRequirements: ['Add .canon-migration/*.md marker for canon changes'],
  overrideRules: ['Founder override marker required when changing Tier-1 or Home Invariant'],
  examplesFromRepo: ['src/app/page.tsx', 'scripts/check-tier1-canon-lock.mjs'],
}
