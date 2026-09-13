import type { MetadataRoute } from 'next'

const canonicalOrigin = 'https://urai.app'

const publicRoutes = [
  '/',
  '/about',
  '/home',
  '/ground',
  '/life-map',
  '/focus',
  '/replay',
  '/mirror',
  '/passport',
  '/privacy',
  '/privacy-controls',
  '/status',
  '/launch',
  '/spatial/ar-vr',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-09-13T00:00:00.000Z')
  return publicRoutes.map((route) => ({
    url: `${canonicalOrigin}${route === '/' ? '/' : `${route}/`}`,
    lastModified,
    changeFrequency: route === '/status' ? 'daily' : 'weekly',
    priority: route === '/' || route === '/home' ? 1 : route === '/life-map' ? 0.9 : 0.7,
  }))
}
