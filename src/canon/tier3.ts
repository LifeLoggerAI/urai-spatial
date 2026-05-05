import type { CanonTier } from './locs'

export const tier3: CanonTier = {
  id: 'Tier-3',
  officialLabel: 'Tier-3 Canon',
  purpose: 'LOCS Tier-3 governance for URAI Spatial.',
  scope: ['docs/canon', 'src/canon'],
  governanceLevel: 'Maintainer + Canon gate',
  lockLevel: 'Strict',
  allowedMutationLevel: 'Only with migration marker and passing checks',
  dependencies: ['Tier-1', 'Tier-2'],
  forbiddenActions: ['Contradict higher tier canon', 'Bypass canon lock checks'],
  protectedPhrases: ['Tier-3', 'LOCS', 'URAI Spatial Canon'],
  protectedFiles: ['docs/canon/TIER_3_CANON_STANDARDS.md', 'src/canon/tier3.ts'],
  requiredReviewLevel: 'Canonical reviewer approval',
  requiredChecks: ['pnpm canon:check', 'pnpm canon:lock'],
  migrationRequirements: ['Add .canon-migration/*.md marker for canon changes'],
  overrideRules: ['Founder override marker required when changing Tier-1 or Home Invariant'],
  examplesFromRepo: ['src/app/page.tsx', 'scripts/check-tier1-canon-lock.mjs'],
}
