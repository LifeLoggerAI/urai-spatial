import type { Metadata, MetadataRoute } from 'next'

// Public indexing is deliberately withheld until exact production evidence and
// legitimate release approval admit a source change. Client/server environment
// flags cannot unlock it. This is a discoverability boundary, not access control.
export const BLOCKED_INDEXING_STATE = 'blocked-pending-production-proof' as const
export const CANONICAL_PUBLIC_ORIGIN = 'https://urai.app' as const

export function blockedRobotsMetadata(): NonNullable<Metadata['robots']> {
  return {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, nocache: true, noimageindex: true },
  }
}

export function blockedRobotsRoute(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
    host: CANONICAL_PUBLIC_ORIGIN,
  }
}

export function blockedSitemapEntries(): MetadataRoute.Sitemap {
  return []
}
