import type { MetadataRoute } from 'next'

const publicRoutes = [
  '/',
  '/about',
  '/business',
  '/about/labs',
  '/founder',
  '/ecosystem',
  '/press',
  '/contact',
  '/ground',
  '/life-map',
  '/focus',
  '/replay',
  '/mirror',
  '/passport',
  '/privacy-controls',
  '/location-map',
  '/terms',
  '/status',
] as const

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: route === '/' ? 'https://urai.app/' : new URL(`${route}/`, 'https://urai.app').toString(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route.startsWith('/about') || route === '/business' || route === '/founder' ? 0.8 : 0.6,
  }))
}
