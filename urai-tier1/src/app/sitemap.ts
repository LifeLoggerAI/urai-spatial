import type { MetadataRoute } from 'next'

const publicRoutes = [
  '/',
  '/about',
  '/about/labs',
  '/founder',
  '/ecosystem',
  '/press',
  '/contact',
  '/home',
  '/ground',
  '/life-map',
  '/focus',
  '/replay',
  '/mirror',
  '/passport',
  '/privacy-controls',
  '/location-map',
  '/privacy',
  '/terms',
  '/status',
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, 'https://urai.app').toString(),
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route.startsWith('/about') || route === '/founder' ? 0.8 : 0.6,
  }))
}
