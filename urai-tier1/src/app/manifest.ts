import type { MetadataRoute } from 'next'
import { publicIdentity } from '@/data/publicIdentity'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: publicIdentity.runtimeName,
    short_name: publicIdentity.productName,
    description: publicIdentity.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#08030f',
    theme_color: '#08030f',
    orientation: 'portrait-primary',
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
