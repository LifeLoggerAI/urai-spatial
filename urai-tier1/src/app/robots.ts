import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/asset-audit',
          '/brand-system',
          '/capture/',
          '/control',
          '/focus/session/',
          '/internal/',
          '/invite/',
          '/life-map/star/',
          '/memory/',
          '/passport/',
          '/place/',
          '/proof',
          '/receipts',
          '/replay/',
          '/spatial/memory/',
          '/tier',
          '/u/',
          '/v1',
        ],
      },
    ],
    sitemap: 'https://urai.app/sitemap.xml',
    host: 'https://urai.app',
  }
}
