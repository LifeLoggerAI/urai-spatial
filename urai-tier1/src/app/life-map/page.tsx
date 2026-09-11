import type { Metadata } from 'next'
import { publicIndexing } from '../public-indexing'

const lifeMapSocialImage = 'https://urai.app/assets/urai/social/open-graph-life-map.webp'

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'URAI Life Map',
  description: 'Enter the canonical URAI Life Map: a private spatial constellation of memories, people, places, and meaning.',
  alternates: {
    canonical: 'https://urai.app/life-map',
  },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/life-map',
    title: 'URAI Life Map',
    description: 'Enter a private spatial constellation of memories, people, places, and meaning.',
    siteName: 'URAI',
    images: [
      {
        url: lifeMapSocialImage,
        width: 1600,
        height: 900,
        alt: 'URAI Life Map — step inside your private constellation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'URAI Life Map',
    description: 'Enter a private spatial constellation of memories, people, places, and meaning.',
    images: [lifeMapSocialImage],
  },
}

export default function LifeMapPage() {
  // SpatialLifeMapCanonical is intentionally owned by the persistent route layout.
  return null
}
