export const URAI_DESIGN_CANON = {
  protectedDesignPrinciples: [
    'Sky is primary on the Tier-1 home surface.',
    'Tier-1 home is spatial-only and full-screen.',
    'No visible text, buttons, navigation, onboarding, narration, CTA, or upgrade prompt belongs on the Tier-1 home scene.',
    'Unavailable higher-tier features silently fall back to Tier-1 baseline instead of surfacing lock copy.',
    'Design tokens and symbolic language must be referenced from canon exports where practical.',
  ] as const,
  protectedSymbolicLanguage: [
    'sky',
    'spatial baseline',
    'life map',
    'memory star',
    'ritual',
    'companion',
    'scroll',
  ] as const,
} as const
