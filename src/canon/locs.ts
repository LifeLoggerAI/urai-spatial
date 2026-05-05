export type CanonTier = {
  id: string
  officialLabel: string
  purpose: string
  scope: string[]
  governanceLevel: string
  lockLevel: string
  allowedMutationLevel: string
  dependencies: string[]
  forbiddenActions: string[]
  protectedPhrases: string[]
  protectedFiles: string[]
  requiredReviewLevel: string
  requiredChecks: string[]
  migrationRequirements: string[]
  overrideRules: string[]
  examplesFromRepo: string[]
}

export const LOCS_DEFINITION = {
  name: 'Layers of Canon Standards',
  abbreviation: 'LOCS',
  tiers: ['Tier-1', 'Tier-2', 'Tier-3', 'Tier-4', 'Tier-5'],
} as const
