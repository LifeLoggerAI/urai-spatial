import type { MetadataRoute } from 'next'
import { blockedSitemapEntries } from '../lib/release/discoverability'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return blockedSitemapEntries()
}
