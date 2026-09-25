export const URAI_PUBLIC_ORIGIN = 'https://urai.app' as const

export const URAI_INDEXING_STATE = 'blocked-pending-production-proof' as const

export const URAI_INDEXING_ENABLED = false as const

export const URAI_APPROVED_SITEMAP_ROUTES = Object.freeze([] as string[])

export const uraiDiscoverabilityBoundary = Object.freeze({
  origin: URAI_PUBLIC_ORIGIN,
  indexingState: URAI_INDEXING_STATE,
  indexingEnabled: URAI_INDEXING_ENABLED,
  approvedSitemapRoutes: URAI_APPROVED_SITEMAP_ROUTES,
  activationAuthority: 'exact-deployed-sha-and-release-receipt-required',
  pwaClaimApproved: false,
  multilingualMetadataApproved: false,
  socialCardClaimApproved: false,
})
