import type { MetadataRoute } from 'next'
import { publicIdentity } from '@/data/publicIdentity'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/internal/'],
    },
    sitemap: `${publicIdentity.canonicalUrl}/sitemap.xml`,
    host: publicIdentity.canonicalUrl,
  }
}
