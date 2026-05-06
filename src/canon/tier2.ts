import type { CanonTier } from './locs'
import { tier2Systems } from './tier2Systems'

export const tier2: CanonTier = {
  id: 'Tier-2',
  officialLabel: 'Tier-2 System Canon',
  purpose: 'Defines governed system-level canon that extends Tier-1 without redefining it.',
  scope: ['docs/canon/TIER_2_CANON_STANDARDS.md', 'src/canon/tier2.ts', 'src/canon/tier2Systems.ts'],
  governanceLevel: 'Architecture review required',
  lockLevel: 'Protected',
  allowedMutationLevel: 'Architecture-approved migration only',
  dependencies: ['Tier-1'],
  forbiddenActions: ['Contradict higher tier canon', 'Create alternate Tier-1 vocabulary', 'Depend on Tier-3/4 implementation specifics'],
  protectedPhrases: ['Tier-2', 'System Canon', 'LOCS', 'URAI Spatial Canon'],
  protectedFiles: ['docs/canon/TIER_2_CANON_STANDARDS.md', 'src/canon/tier2.ts', 'src/canon/tier2Systems.ts'],
  requiredReviewLevel: 'Architecture approver',
  requiredChecks: ['pnpm tier2:check', 'pnpm test:canon'],
  migrationRequirements: ['LOCS_TIER_2_MIGRATION_APPROVED', 'Backward compatibility note', 'Rollback plan'],
  overrideRules: ['Tier-1 remains immutable; founder override required for Tier-1 touching migrations'],
  examplesFromRepo: tier2Systems.flatMap((s) => s.paths),
}
