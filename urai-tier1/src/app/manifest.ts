import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'URAI Spatial',
    short_name: 'URAI',
    description: 'A spatial web experience for memory, identity, reflection, focus, and personal direction.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    background_color: '#020713',
    theme_color: '#020713',
    orientation: 'any',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
