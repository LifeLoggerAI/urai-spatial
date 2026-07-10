import type { MetadataRoute } from 'next'

const publicRoutes = [
  '/',
  '/home',
  '/ground',
  '/life-map',
  '/focus',
  '/replay',
  '/mirror',
  '/passport',
  '/privacy-controls',
  '/location-map',
  '/status',
  '/launch',
  '/early-access',
  '/about',
  '/demo',
  '/demo/replay-film',
  '/spatial/ar-vr',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, 'https://urai.app').toString(),
    changeFrequency: route === '/status' ? 'daily' : 'weekly',
    priority: route === '/' || route === '/home' ? 1 : route === '/status' || route === '/about' ? 0.8 : 0.6,
  }))
}
