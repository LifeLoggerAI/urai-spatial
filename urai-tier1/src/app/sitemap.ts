import type { MetadataRoute } from 'next'
import {
  URAI_APPROVED_SITEMAP_ROUTES,
  URAI_INDEXING_ENABLED,
  URAI_PUBLIC_ORIGIN,
} from '@/lib/discoverability-boundary'

export default function sitemap(): MetadataRoute.Sitemap {
  if (!URAI_INDEXING_ENABLED) return []

  return URAI_APPROVED_SITEMAP_ROUTES.map((route) => ({
    url: new URL(route, URAI_PUBLIC_ORIGIN).toString(),
    changeFrequency: 'weekly' as const,
    priority: route === '/' ? 1 : 0.7,
  }))
}
