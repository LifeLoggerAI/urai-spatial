import type { MetadataRoute } from 'next'
import { URAI_PUBLIC_DESCRIPTION } from '@/lib/brand-authority'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'URAI Labs — URAI',
    short_name: 'URAI',
    description: URAI_PUBLIC_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    background_color: '#08030f',
    theme_color: '#08030f',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
