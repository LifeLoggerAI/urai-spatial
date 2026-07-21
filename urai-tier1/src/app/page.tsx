import type { Metadata } from 'next'
import FinalHomeThreshold from './FinalHomeThreshold'

const launchSocialImage = 'https://urai.app/assets/urai/social/open-graph-launch.webp'

export const metadata: Metadata = {
  title: 'URAI Spatial',
  description: 'Open the canonical URAI Home threshold before entering the spatial runtime.',
  alternates: {
    canonical: 'https://urai.app/',
  },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/',
    title: 'URAI Spatial',
    description: 'Open the canonical URAI Home threshold before entering the spatial runtime.',
    siteName: 'URAI',
    images: [
      {
        url: launchSocialImage,
        width: 1600,
        height: 900,
        alt: 'URAI Spatial — open your private world',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'URAI Spatial',
    description: 'Open the canonical URAI Home threshold before entering the spatial runtime.',
    images: [launchSocialImage],
  },
}

export default function HomePage() {
  return <FinalHomeThreshold />
}
