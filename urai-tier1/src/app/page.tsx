import type { Metadata } from 'next'
import FinalHomeThreshold from './FinalHomeThreshold'

const launchSocialImage = 'https://urai.app/assets/urai/social/open-graph-launch.webp'

export const metadata: Metadata = {
  title: 'UrAi — Your private world',
  description: 'Enter a private spatial world for memory, reflection, relationships, and personal intelligence.',
  alternates: {
    canonical: 'https://urai.app/',
  },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/',
    title: 'UrAi — Your private world',
    description: 'A private spatial world for memory, reflection, relationships, and personal intelligence.',
    siteName: 'UrAi',
    images: [
      {
        url: launchSocialImage,
        width: 1600,
        height: 900,
        alt: 'UrAi — your private spatial world',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UrAi — Your private world',
    description: 'A private spatial world for memory, reflection, relationships, and personal intelligence.',
    images: [launchSocialImage],
  },
}

export default function HomePage() {
  return <FinalHomeThreshold />
}
