import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'UrAi',
    short_name: 'UrAi',
    description:
      'A private spatial world for memory, reflection, relationships, and personal intelligence.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#07101a',
    theme_color: '#07101a',
    prefer_related_applications: false,
    icons: [
      {
        src: '/pwa-icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/assets/urai/xr/mobile/pwa-icon-set.webp',
        sizes: '1200x1200',
        type: 'image/webp',
        purpose: 'any',
      },
    ],
  }
}
