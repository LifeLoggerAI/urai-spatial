export const URAI_IDENTITY_CANON = {
  officialProductName: 'URAI',
  officialEcosystemName: 'URAI Spatial',
  deprecatedAliases: ['GetUrAi', 'Life Logger', 'LifeLogger'] as const,
  namingRules: [
    'Use URAI for the product name.',
    'Use URAI Spatial for the spatial/home surface.',
    'Do not introduce alternate Tier-1 product names in lower tiers.',
  ] as const,
  productIdentityRules: [
    'URAI is a passive, privacy-first symbolic spatial intelligence system.',
    'URAI Spatial home is a no-text, no-button, sky-primary baseline surface.',
    'Canon language must be imported from Tier-1 exports instead of duplicated in feature files.',
  ] as const,
} as const
