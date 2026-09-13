import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/internal/',
        '/control/',
        '/capture/',
        '/proof/',
        '/receipts/',
        '/api/',
        '/u/',
        '/place/',
        '/memory/',
        '/focus/session/',
        '/life-map/star/',
        '/passport/',
        '/spatial/memory/',
      ],
    },
    sitemap: 'https://urai.app/sitemap.xml',
    host: 'https://urai.app',
  }
}
