export const URAI_TIER_1_HOME_INVARIANT = {
  noText: true,
  noButtons: true,
  noNavigation: true,
  noOnboarding: true,
  noNarration: true,
  noUpgradePrompts: true,
  skyPrimary: true,
  spatialOnly: true,
  baselineWorksAnonymously: true,
  lockedFeaturesFallbackSilently: true,
} as const

export const PROTECTED_SPATIAL_INVARIANTS = [
  'No text on Tier-1 home.',
  'No buttons on Tier-1 home.',
  'No navigation on Tier-1 home.',
  'No onboarding on Tier-1 home.',
  'No narration on Tier-1 home.',
  'No upgrade prompts on Tier-1 home.',
  'Sky is primary.',
  'Spatial only.',
  'Baseline must work anonymously.',
  'Locked or unavailable higher-tier features silently fall back to Tier-1 baseline.',
] as const

export const HOME_INVARIANT_FORBIDDEN_STRINGS = [
  '<button',
  'href=',
  'onboarding',
  'narrator',
  'navigation',
  'upgrade',
  'sign in',
  'login',
  'loading urai spatial',
] as const
