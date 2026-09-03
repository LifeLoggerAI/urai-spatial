import type { Metadata } from 'next'
import FinalHomeThreshold from './FinalHomeThreshold'

const launchSocialImage = 'https://urai.app/assets/urai/social/open-graph-launch.webp'

export const metadata: Metadata = {
  title: 'UrAi — Personal intelligence, made spatial',
  description: 'Meet UrAi by UrAi Labs: a privacy-first personal intelligence platform for memory, reflection, relationships, and direction.',
  alternates: {
    canonical: 'https://urai.app/',
  },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/',
    title: 'UrAi — Personal intelligence, made spatial',
    description: 'A privacy-first personal intelligence platform by UrAi Labs, expressed as a spatial world.',
    siteName: 'UrAi',
    images: [
      {
        url: launchSocialImage,
        width: 1600,
        height: 900,
        alt: 'UrAi — personal intelligence, made spatial',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UrAi — Personal intelligence, made spatial',
    description: 'A privacy-first personal intelligence platform by UrAi Labs, expressed as a spatial world.',
    images: [launchSocialImage],
  },
}

export default function HomePage() {
  return <FinalHomeThreshold />
}
