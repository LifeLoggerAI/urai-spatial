import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/internal/', '/control/', '/capture/', '/receipts/', '/u/', '/invite/'],
      },
    ],
    sitemap: 'https://urai.app/sitemap.xml',
    host: 'https://urai.app',
  }
}
