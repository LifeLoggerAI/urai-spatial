import type { MetadataRoute } from 'next'
import { URAI_CANONICAL_URL } from '@/lib/brand-authority'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-07-06T00:00:00.000Z')
  const paths = [
    '/',
    '/about',
    '/home',
    '/ground',
    '/life-map',
    '/focus',
    '/replay',
    '/mirror',
    '/passport',
    '/privacy-controls',
    '/status',
    '/location-map',
    '/ascent',
    '/unwind',
    '/demo/replay-film',
    '/spatial/ar-vr',
  ]

  return paths.map((path) => ({
    url: URAI_CANONICAL_URL + path,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }))
}
