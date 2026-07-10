import type { MetadataRoute } from 'next'
import { publicIdentity } from '@/data/publicIdentity'

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
  '/privacy-controls',
  '/location-map',
  '/status',
  '/launch',
  '/early-access',
  '/privacy',
  '/terms',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, publicIdentity.canonicalUrl).toString(),
    changeFrequency: route === '/status' ? 'daily' : 'weekly',
    priority: route === '/' || route === '/home' ? 1 : route === '/status' ? 0.9 : 0.7,
  }))
}
