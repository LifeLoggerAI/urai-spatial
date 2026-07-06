import type { MetadataRoute } from 'next'
import { URAI_CANONICAL_URL } from '@/lib/brand-authority'

const lastModified = new Date('2026-07-06T00:00:00.000Z')

export default function sitemap(): MetadataRoute.Sitemap {
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

  return paths.map((path, index) => ({
    url: `${URAI_CANONICAL_URL}${path}`,
    lastModified,
    changeFrequency: path === '/status' ? 'daily' : 'weekly',
    priority: index === 0 ? 1 : path === '/about' ? 0.95 : 0.8,
  }))
}
