import type { MetadataRoute } from 'next'
import { URAI_CANONICAL_URL } from '@/lib/brand-authority'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/internal/'],
    },
    sitemap: `${URAI_CANONICAL_URL}/sitemap.xml`,
    host: URAI_CANONICAL_URL,
  }
}
