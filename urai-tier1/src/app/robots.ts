import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    // Exported HTML is deny-by-default and public pages opt in with route
    // metadata. Crawlers must be allowed to fetch a discovered private URL so
    // they can observe its noindex directive; blocking it here can leave the
    // URL indexed without content.
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: 'https://urai.app/sitemap.xml',
    host: 'https://urai.app',
  }
}
